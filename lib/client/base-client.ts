import { Observable, ObservableState, CancellableFetch, CancellablePromise, HttpMethod } from '@dvcol/common-utils';

import type { CacheStore, CacheStoreEntity, Observer, RecursiveRecord, Updater } from '@dvcol/common-utils';

import type { BaseOptions, BaseQuery, BaseSettings, BaseTransformed } from '~/models/base-client.model';
import type { BaseBody, BaseInit, BaseRequest, BaseTemplate, BaseTemplateOptions } from '~/models/base-template.model';

import type { BaseCacheOption, ClientEndpointCache, ClientEndpointCall, IApi, TypedResponse } from '~/models/client-endpoint.model';

import { ClientEndpoint } from '~/models/client-endpoint.model';

import { BaseApiHeaders, BaseHeaderContentType } from '~/utils';
import { ExactMatchRegex } from '~/utils/regex.utils';

/**
 * Type guard to check if the template is a ClientEndpoint
 * @param template - ClientEndpoint or IApi
 */
const isApiTemplate = <T extends RecursiveRecord = RecursiveRecord>(template: ClientEndpoint<T> | IApi<T>): template is ClientEndpoint<T> =>
  template instanceof ClientEndpoint;

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
    key: string | ((param?: Parameter, init?: BaseInit) => string);
    evictionKey?: string | ((param?: Parameter, init?: BaseInit) => string);
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
    const cacheKey = typeof key === 'function' ? key(param, init) : key;
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

  const evictFn = async (param?: Parameter, init?: BaseInit) => {
    const _key = evictionKey ?? key;
    if (!_key) return;
    const _resolvedKey = typeof _key === 'function' ? _key(param, init) : _key;
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
 * Injects the cors proxy prefix to the URL if it is not already present.
 *
 * @param template - The template for the API endpoint.
 * @param settings - The client settings.
 */
export const injectCorsProxyPrefix = <T extends { url: string }, S extends BaseSettings>(template: T, settings: S) => {
  if (!settings.corsPrefix) return template;

  const prefix = `/${settings.corsPrefix}`;
  if (template.url.startsWith(prefix)) return template;

  template.url = `${prefix}${template.url}`;
  return template;
};

/**
 * Represents a client with common functionality.
 *
 * @class BaseClient
 */
export abstract class BaseClient<
  QueryType extends BaseQuery = BaseQuery,
  ResponseType extends Response = Response,
  SettingsType extends BaseSettings = BaseSettings,
  AuthenticationType extends RecursiveRecord = RecursiveRecord,
> {
  private readonly _settings: SettingsType;
  private _cache: CacheStore<ResponseType>;
  private _authentication: ObservableState<AuthenticationType>;
  private _callListeners: Observable<QueryType>;

  get settings() {
    if (this._settings.corsProxy) return { ...this._settings, endpoint: this._settings.corsProxy };
    return this._settings;
  }

  /**
   * Gets the authentication information.
   *
   * @readonly
   */
  get auth() {
    return this._authentication.state;
  }

  /**
   * Updates the authentication information.
   * @param auth - The new authentication information.
   *
   * @protected
   */
  protected updateAuth(auth: Updater<AuthenticationType>) {
    this._authentication.update(auth);
  }

  /**
   * Subscribes to changes in authentication information.
   * Emits the current authentication information on auth related changes (oAuth calls, token revocation, token refresh, etc.).
   *
   * @param observer - The observer function.
   * @returns A function to unsubscribe from changes.
   */
  onAuthChange(observer: Observer<AuthenticationType | undefined>) {
    return this._authentication.subscribe(observer);
  }

  /**
   * Subscribes to  API queries.
   * Emits query information on every call to the API.
   *
   * @param observer - The observer function.
   * @returns A function to unsubscribe from queries.
   */
  onCall(observer: Observer<QueryType>) {
    return this._callListeners.subscribe(observer);
  }

  /**
   * Unsubscribes observers from authentication and call listeners.
   * If no observer is provided, unsubscribes all observers.
   *
   * @param observer - The observer to be removed.
   */
  unsubscribe(observer?: Observer<QueryType | AuthenticationType | undefined>) {
    return {
      auth: this._authentication.unsubscribe(observer),
      call: this._callListeners.unsubscribe(observer),
    };
  }

  /**
   * Clears the cache entry for the specified key.
   * If no key is provided, clears the entire cache.
   *
   * @param key - The cache key.
   * @param exact - If the key to be evicted needs to be an exact match or a regex pattern (defaults to true).
   */
  clearCache(key?: string, exact = true) {
    if (key && exact) return this._cache?.delete(key);
    return this._cache?.clear(key);
  }

  /**
   * Binds BaseTraktClient _call instance to the endpoint instance and the call method of the endpoint
   *
   * @private
   *
   * @param api - The TraktApi to bind to
   *
   * @example client.endpoints({ request })
   */
  protected bindToEndpoint(api: IApi) {
    const client = { ...api };
    Object.entries(client).forEach(([endpoint, template]) => {
      if (isApiTemplate(template)) {
        const fn: ClientEndpointCall = (param, init) => this._call(template, param, init);

        const cachedFn: ClientEndpointCache = getCachedFunction(fn, {
          key: (params: Record<string, unknown>, init: Record<string, unknown>) => {
            const { template: _template = template, params: _params = params, init: _init = init } = this._transform?.(template, params, init) ?? {};
            const _merged = { ..._template.seed, ..._params };
            const _transformed = _template.transform?.(_merged) ?? _merged;
            return JSON.stringify({ template: template.config, param: _transformed, init: _init });
          },
          cache: this._cache,
          retention: template.opts?.cache,
          evictionKey: `{"template":${JSON.stringify(template.config).replace(ExactMatchRegex, '\\$&')}`,
        });

        const resolvedParseUrl = (params: Record<string, unknown> = {}) => {
          const { template: _template = template, params: _params = params } = this._transform?.(template, params) ?? {};
          const _merged = { ..._template.seed, ..._params };
          const _transformed = _template.transform?.(_merged) ?? _merged;
          template.validate?.(_transformed);
          return this._parseUrl(_template, _transformed);
        };

        Object.entries(template).forEach(([key, value]) => {
          if (key === 'cached') {
            if (template.opts?.cache) Object.defineProperty(fn, 'cached', { value: cachedFn });
          } else if (key === 'resolve') {
            Object.defineProperty(fn, 'resolve', { value: resolvedParseUrl });
            if (template.opts?.cache) Object.defineProperty(cachedFn, 'resolve', { value: resolvedParseUrl });
          } else {
            Object.defineProperty(fn, key, { value });
            if (template.opts?.cache) Object.defineProperty(cachedFn, key, { value });
          }
        });

        client[endpoint] = fn as (typeof client)[typeof endpoint];
      } else {
        client[endpoint] = this.bindToEndpoint(template as IApi);
      }
    });
    return client;
  }

  /**
   * Creates an instance of BaseClient.
   *
   * @param cacheStore - An optional cache store to manage cache read/write.
   * @param settings - The client settings.
   * @param authentication - The authentication information.
   * @param api - The API endpoints.
   */
  protected constructor({ cacheStore, ...settings }: BaseOptions<SettingsType, ResponseType>, authentication: AuthenticationType, api: IApi) {
    this._settings = settings as SettingsType;
    this._authentication = new ObservableState(authentication);
    this._callListeners = new Observable();
    this._cache = cacheStore ?? new Map();

    Object.assign(this, this.bindToEndpoint(api));
  }

  /**
   * Calls the API with the given template and parameters.
   *
   * @template P - The type of the parameters.
   * @template R - The type of the response.
   *
   * @param {BaseTemplate<P>} template - The template for the API endpoint.
   * @param {P} [params={}] - The parameters for the API call.
   * @param {BaseInit} [init] - Additional initialization options.
   *
   * @returns {Promise<Response>} A promise that resolves to the API response.
   *
   * @protected
   */
  protected _call<P extends RecursiveRecord = RecursiveRecord, O extends BaseTemplateOptions = BaseTemplateOptions>(
    template: BaseTemplate<P, O>,
    params: P = {} as P,
    init?: BaseInit,
  ): CancellablePromise<ResponseType> {
    const { template: _template = template, params: _params = params, init: _init = init } = this._transform?.(template, params, init) ?? {};

    const _merged = { ..._template.seed, ..._params };
    const _transformed = _template.transform?.(_merged) ?? _merged;

    _template.validate?.(_transformed);

    const request: BaseRequest = {
      input: this._parseUrl(_template, _transformed).toString(),
      init: {
        ..._template.init,
        ..._init,
        method: _template.method,
        headers: {
          ..._template.init?.headers,
          ...this._parseHeaders?.(_template, _transformed),
          ..._init?.headers,
        },
      },
    };

    if (_template.method !== HttpMethod.GET && _template.body) {
      request.init.body = this._parseBody(_template.body, _merged, request);
    }

    const query = CancellableFetch.fetch<ResponseType>(request.input, request.init).then(
      (_res: ResponseType) => this._parseResponse?.(_res, request, _template) ?? _res,
    );

    this._callListeners.update({ request, query } as QueryType);

    return query;
  }

  /**
   * Transforms the parameters templates or init before performing a request.
   *
   * @template T - The type of the parameters.
   *
   * @param {BaseTemplate<T>} template - The template for the API endpoint.
   * @param {T} params - The actual parameters.
   * @param {BaseInit} [init] - Additional initialization options.
   *
   * @returns {{ template: BaseTemplate<T>; params: T; init: BaseInit }} The transformed template.
   *
   * @protected
   */
  protected _transform?<T extends RecursiveRecord = RecursiveRecord>(template: BaseTemplate<T>, params: T, init?: BaseInit): BaseTransformed<T>;

  /**
   * Parses headers from a template and returns a {@link HeadersInit}
   *
   * @template T - The type of the parameters.
   *
   * @param {BaseTemplate<T>} template - The template for the API endpoint.
   * @param {T} params - The actual parameters.
   *
   * @returns {HeadersInit} The parsed request headers.
   *
   * @protected
   * @abstract
   */
  protected _parseHeaders?<T extends RecursiveRecord = RecursiveRecord>(template: BaseTemplate<T>, params: T): HeadersInit;

  /**
   * Parses the parameters and constructs the URL for a API request.
   *
   * @template T - The type of the parameters.
   *
   * @param {BaseTemplate<T>} template - The template for the API endpoint.
   * @param {T} params - The parameters for the API call.
   *
   * @returns {URL} The URL for the API request.
   *
   * @throws {Error} Throws an error if mandatory parameters are missing or if a filter is not supported.
   *
   * @protected
   * @abstract
   */
  protected _parseUrl<T extends RecursiveRecord = RecursiveRecord>(template: BaseTemplate<T>, params: T): URL {
    injectCorsProxyPrefix(template, this.settings);
    return parseUrl(template, params, this.settings.endpoint);
  }

  /**
   * Parses body from a template and stringifies a {@link BodyInit}
   *
   * @template T - The type of the parameters.
   *
   * @param body - The expected body structure.
   * @param {T} params - The actual parameters.
   * @param request - The base request information.
   *
   * @returns {BodyInit} The parsed request body.
   *
   * @protected
   * @abstract
   */
  // eslint-disable-next-line class-methods-use-this -- can be overridden by child classes
  protected _parseBody<T extends RecursiveRecord = RecursiveRecord>(body: BaseBody<string | keyof T>, params: T, request?: BaseRequest): BodyInit {
    if (request?.init?.headers?.[BaseApiHeaders.ContentType] === BaseHeaderContentType.FormUrlEncoded) return parseBodyUrlEncoded(body, params);
    if (request?.init?.headers?.[BaseApiHeaders.ContentType] === BaseHeaderContentType.FormData) return parseBodyFormData(body, params);
    return parseBody(body, params);
  }

  /**
   * Parses the response from the API before returning from the call.
   * @param response - The response from the API.
   * @param request - The request information.
   * @param template - The template for the API endpoint.
   *
   * @returns {Response} The parsed response.
   *
   * @protected
   */
  protected _parseResponse?<T extends RecursiveRecord = RecursiveRecord>(
    response: Response,
    request?: BaseRequest,
    template?: BaseTemplate<T>,
  ): Response;
}
