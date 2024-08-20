import { CancellablePromise } from '@dvcol/common-utils';

import type { CacheStore, CacheStoreEntity, RecursiveRecord } from '@dvcol/common-utils';

import type {
  BaseBody,
  BaseCacheOption,
  BaseInit,
  BaseSettings,
  BaseTemplate,
  BaseTemplateOptions,
  CacheKeyFunction,
  ClientEndpointCache,
  ClientEndpointCall,
  TypedResponse,
} from '~/models';

/**
 * Clones a response object
 * @param response - The response to clone
 * @param cache - Optional cache data to attach to the clone
 */
const cloneResponse = <T>(response: TypedResponse<T>, cache?: TypedResponse<T>['cache']): TypedResponse<T> => {
  const clone: { -readonly [K in keyof TypedResponse<T>]: unknown } = response.clone();
  Object.entries(response).forEach(([key, value]) => {
    if (typeof value !== 'function') clone[key as keyof TypedResponse<T>] = value;
  });
  clone.cache = cache;
  return clone as TypedResponse<T>;
};

/**
 * Creates a cached function that will wrap the inner client function and store the response in a provided cache store
 * @param clientFn - the inner client function to cache
 * @param key - the key to use for the cache
 * @param evictionKey - the key to use for eviction of the method (all cache entries matching this key will be evicted)
 * @param cache - the cache store to use
 * @param retention - the default retention time for the cache
 */
export const getCachedFunction = <
  Parameter extends RecursiveRecord = RecursiveRecord,
  ResponseBody = unknown,
  ResponseType extends Response = Response,
>(
  clientFn: ClientEndpointCall<Parameter, ResponseBody>,
  {
    key,
    evictionKey,
    cache,
    retention,
  }: {
    key: string | CacheKeyFunction<Parameter>;
    evictionKey?: string | CacheKeyFunction<Parameter>;
    cache: CacheStore<ResponseType>;
    retention?: BaseTemplateOptions['cache'];
  },
): ClientEndpointCache<Parameter, ResponseBody> => {
  const restoreCache = async ({
    cacheKey,
    cacheOptions,
    evict,
  }: {
    cacheKey: string;
    cacheOptions: BaseCacheOption;
    evict: TypedResponse<ResponseType>['cache']['evict'];
  }) => {
    if (cacheOptions?.force) return {};

    const cached = await cache.get(cacheKey);
    if (!cached) return {};

    let templateRetention = typeof retention === 'number' ? retention : undefined;
    if (typeof retention === 'object') templateRetention = retention.retention;

    const _retention = cacheOptions?.retention ?? templateRetention ?? cache.retention;
    const expires = cached.cachedAt + _retention;
    let response: TypedResponse<ResponseType>;

    if (!_retention || expires > Date.now()) {
      response = cloneResponse<ResponseType>(cached.value, { previous: cached, current: cached, isCache: true, evict });
    }

    return { cached, response };
  };

  const fetchNewData = (
    { param, init }: { param: Parameter; init: BaseInit },
    {
      cacheKey,
      cacheOptions,
      cached,
      evict,
    }: {
      cacheKey: string;
      cacheOptions: BaseCacheOption;
      cached: CacheStoreEntity<ResponseType>;
      evict: TypedResponse<ResponseType>['cache']['evict'];
    },
  ): CancellablePromise<TypedResponse<ResponseBody>> =>
    clientFn(param, init)
      .then(async (result: TypedResponse<ResponseBody>) => {
        const cacheEntry: CacheStoreEntity<ResponseType> = {
          cachedAt: Date.now(),
          value: cloneResponse(result) as ResponseType,
          key: cacheKey,
        };
        await cache.set(cacheKey, cacheEntry);
        result.cache = { previous: cached, current: cacheEntry, isCache: false, evict };
        return result as unknown as TypedResponse<ResponseType>;
      })
      .catch(error => {
        if (cacheOptions?.evictOnError ?? (typeof retention === 'object' ? retention?.evictOnError : undefined) ?? cache.evictOnError) {
          evict();
        }
        throw error;
      });

  const cacheFn = (param: Parameter, init: BaseInit, cacheOptions: BaseCacheOption): CancellablePromise<TypedResponse<Response>> => {
    const cacheKey = typeof key === 'function' ? key(param, init, cacheOptions) : key;
    const evict = () => cache.delete(cacheKey);

    let innerPromise$: CancellablePromise<TypedResponse<ResponseBody>> | undefined;
    const promise$: CancellablePromise<TypedResponse<ResponseType>> = CancellablePromise.from(restoreCache({ cacheKey, cacheOptions, evict })).then(
      ({ cached, response }) => {
        if (response) return response;
        innerPromise$ = fetchNewData({ param, init }, { cacheKey, cacheOptions, cached, evict });
        return innerPromise$;
      },
    );

    const _cancel = promise$.cancel;
    promise$.cancel = (reason?: unknown) => {
      innerPromise$?.cancel(reason);
      return _cancel(reason);
    };

    return promise$;
  };

  const evictFn = async (param?: Parameter, init?: BaseInit, cacheOptions?: BaseCacheOption) => {
    const _key = evictionKey ?? key;
    if (!_key) return;
    const _resolvedKey = typeof _key === 'function' ? _key(param, init, cacheOptions) : _key;
    if (!_resolvedKey.trim()) return;
    await cache.clear(_resolvedKey);
    return _resolvedKey;
  };

  Object.defineProperty(cacheFn, 'evict', { value: evictFn });
  return cacheFn as ClientEndpointCache<Parameter, ResponseBody>;
};

/**
 * Parses body from a template and generate a json BodyInit.
 *
 * @template T - The type of the parameters.
 *
 * @param template - The expected body structure.
 * @param {T} params - The actual parameters.
 *
 * @returns {RecursiveRecord} The parsed request body as a Json Object.
 */
export const parseBodyJson = <T extends RecursiveRecord = RecursiveRecord>(template: BaseBody<string | keyof T> = {}, params: T): RecursiveRecord => {
  const _body: Record<string, string> = {};

  Object.entries(params).forEach(([key, value]) => {
    if (key in template) _body[key] = value;
  });

  Object.keys(template).forEach(key => {
    if (template[key] === true && [undefined, null, ''].includes(params[key])) throw new Error(`Missing mandatory body parameter: '${key}'`);
  });

  return _body;
};

/**
 * Parses body from a template and constructs a FormData BodyInit.
 *
 * @template T - The type of the parameters.
 *
 * @param template - The expected body structure.
 * @param {T} params - The actual parameters.
 *
 * @returns {FormData} The parsed request body as a FormData Object.
 */
export const parseBodyFormData = <T extends RecursiveRecord = RecursiveRecord>(template: BaseBody<string | keyof T> = {}, params: T): FormData => {
  const bodyJson = parseBodyJson(template, params);
  const formData = new FormData();
  Object.entries(bodyJson).forEach(([key, value]) => formData.append(key, value));
  return formData;
};

/**
 * Parses body from a template and constructs a URLSearchParams BodyInit.
 *
 * @template T - The type of the parameters.
 *
 * @param template - The expected body structure.
 * @param {T} params - The actual parameters.
 *
 * @returns {URLSearchParams} The parsed request body as a URLSearchParams Object.
 */
export const parseBodyUrlEncoded = <T extends RecursiveRecord = RecursiveRecord>(
  template: BaseBody<string | keyof T> = {},
  params: T,
): URLSearchParams => {
  const bodyJson = parseBodyJson(template, params);
  const urlSearchParams = new URLSearchParams();
  Object.entries(bodyJson).forEach(([key, value]) => urlSearchParams.append(key, value));
  return urlSearchParams;
};

/**
 * Parses body from a template and stringifies a {@link BodyInit}
 *
 * @private
 *
 * @template T - The type of the parameters.
 *
 * @param template - The expected body structure.
 * @param {T} params - The actual parameters.
 *
 * @returns {BodyInit} The parsed request body.
 */
export const parseBody = <T extends RecursiveRecord = RecursiveRecord>(template: BaseBody<string | keyof T> = {}, params: T): BodyInit => {
  return JSON.stringify(parseBodyJson(template, params));
};

/**
 * Patches the response object to include a json method that parses the response data.
 * @param response - The response to patch
 * @param parseResponse - Optional function to parse the response data
 */
export const patchResponse = <T extends Response, D = unknown, R = unknown>(response: T, parseResponse?: (data: D) => R): T => {
  const parsed: T = response;
  const _json = parsed.json as T['json'];
  parsed.json = async () => _json.bind(parsed)().then(parseResponse);
  return parsed;
};

/**
 * Parses the parameters and constructs the URL for a  API request.
 *
 * @private
 *
 * @template P - The type of the parameters.
 *
 * @param {BaseTemplate<P>} template - The template for the API endpoint.
 * @param {P} params - The parameters for the API call.
 * @param {string} base - The API base url.
 *
 * @returns {URL} The URL for the  API request.
 *
 * @throws {Error} Throws an error if mandatory parameters are missing or if a filter is not supported.
 */
export const parseUrl = <P extends RecursiveRecord = RecursiveRecord, O extends BaseTemplateOptions = BaseTemplateOptions>(
  template: BaseTemplate<P, O>,
  params: P,
  base: string,
): URL => {
  const [pathPart, queryPart] = template.url.split('?');

  let path = pathPart;

  // fill path parameter i.e /path/:variable/...
  if (pathPart.includes(':')) {
    path = pathPart
      .split('/')
      .map(segment => {
        if (segment.match(/^:/)) {
          const name = segment.substring(1);
          const value = params[name];
          if ((value === undefined || value === '') && template.opts?.parameters?.path?.[name] === true) {
            throw Error(`Missing mandatory path parameter: '${name}'`);
          }
          return value ?? '';
        }
        return segment;
      })
      .filter(_segment => ![undefined, null, ''].includes(_segment))
      .join('/');
  }

  const url = new URL(path, base);

  // fill query parameter i.e /path?param#&param2
  const queryParams = new URLSearchParams(queryPart);
  const queryTemplate = template.opts?.parameters?.query;
  if (queryTemplate) {
    Object.keys(queryTemplate).forEach(key => {
      if (!queryParams.has(key)) queryParams.set(key, '');
    });
  }

  queryParams.forEach((value, key) => {
    const _value = params[key] ?? value;

    // If a value is found we encode
    if (![undefined, null, ''].includes(_value)) {
      url.searchParams.set(key, typeof _value === 'object' ? JSON.stringify(_value) : _value);
    }
    // If the parameter is required we raise error
    else if (template.opts?.parameters?.query?.[key] === true) {
      throw Error(`Missing mandatory query parameter: '${key}'`);
    }
  });

  return url;
};

/**
 * Injects a url prefix to the template URL if it is not already present.
 *
 * @param prefix - The prefix to inject.
 * @param template - The template for the API endpoint.
 * @param mutate - Whether to mutate the template or return a new one.
 */
export const injectUrlPrefix = <P extends string, T extends { url: string }>(prefix: P, template: T, mutate = false) => {
  if (template.url.startsWith(prefix)) return template;

  if (!mutate) return { ...template, url: `${prefix}${template.url}` };

  template.url = `${prefix}${template.url}`;
  return template;
};

/**
 * Injects the cors proxy prefix to the URL if it is not already present.
 *
 * @param template - The template for the API endpoint.
 * @param settings - The client settings.
 * @param mutate - Whether to mutate the template or return a new one.
 */
export const injectCorsProxyPrefix = <T extends { url: string }, S extends BaseSettings>(template: T, settings: S, mutate = false) => {
  if (!settings.corsPrefix) return template;
  const prefix = `/${settings.corsPrefix}`;
  return injectUrlPrefix(prefix, template, mutate);
};
