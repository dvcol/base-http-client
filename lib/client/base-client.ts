import { CancellableFetch, HttpMethod, Observable, ObservableState } from '@dvcol/common-utils';

import type { CacheStore, CancellablePromise, Observer, RecursiveRecord, Updater } from '@dvcol/common-utils';

import type { BaseOptions, BaseQuery, BaseSettings, BaseTransformed } from '~/models/base-client.model';
import type { BaseBody, BaseInit, BaseRequest, BaseTemplate, BaseTemplateOptions } from '~/models/base-template.model';

import type { BaseCacheOption, ClientEndpointCache, ClientEndpointCall, IApi } from '~/models/client-endpoint.model';

import { ClientEndpoint } from '~/models/client-endpoint.model';

import { getCachedFunction, injectCorsProxyPrefix, parseBody, parseBodyFormData, parseBodyUrlEncoded, parseUrl } from '~/utils/client.utils';
import { BaseApiHeaders, BaseHeaderContentType } from '~/utils/http.utils';

import { ExactMatchRegex } from '~/utils/regex.utils';

/**
 * Type guard to check if the template is a ClientEndpoint
 * @param template - ClientEndpoint or IApi
 */
const isApiTemplate = <T extends RecursiveRecord = RecursiveRecord>(template: ClientEndpoint<T> | IApi<T>): template is ClientEndpoint<T> =>
  template instanceof ClientEndpoint;

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
          key: (params: Record<string, unknown>, init: Record<string, unknown>, cacheOptions?: BaseCacheOption) => {
            const { template: _template = template, params: _params = params, init: _init = init } = this._transform?.(template, params, init) ?? {};
            const _merged = { ..._template.seed, ..._params };
            const _transformed = _template.transform?.(_merged) ?? _merged;
            const _key = JSON.stringify({ template: template.config, param: _transformed, init: _init });
            if (!cacheOptions?.cacheKey) return _key;
            return typeof cacheOptions.cacheKey === 'function' ? cacheOptions.cacheKey(_key) : _key;
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
