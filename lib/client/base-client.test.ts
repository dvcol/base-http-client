import { CancellableFetch, CancellablePromise, HttpMethod } from '@dvcol/common-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { BaseApiHeaders, BaseClient, BaseHeaderContentType, ClientEndpoint, parseBody, parseUrl } from './base-client';

import type {
  BaseBody,
  BaseInit,
  BaseOptions,
  BaseQuery,
  BaseTemplate,
  IApi,
  ResponseOrTypedResponse,
  BaseTemplateOptions,
  BaseTransformed,
} from './base-client';

import type { CacheStore, RecursiveRecord, Updater } from '@dvcol/common-utils';

import { hasOwnProperty } from '~/utils/test.utils';

const mockEndpoint = 'https://api-endpoint.url';

const api = {
  endpoint: new ClientEndpoint({
    method: HttpMethod.GET,
    url: '/endpoint',
  }),
  anotherEndpoint: new ClientEndpoint({
    method: HttpMethod.GET,
    url: '/another-endpoint',
  }),
  endpointWithParams: new ClientEndpoint({
    method: HttpMethod.GET,
    url: '/endpoint-with-param/:param',
    opts: {
      parameters: {
        path: {
          param: true,
        },
      },
    },
  }),
  endpointWithParamsAndSeed: new ClientEndpoint({
    method: HttpMethod.GET,
    url: '/endpoint-with-param/:param',
    opts: {
      parameters: {
        path: {
          param: true,
        },
      },
      seed: {
        param: 'seeded',
      },
    },
  }),
  endpointWithValidation: new ClientEndpoint({
    method: HttpMethod.GET,
    url: '/endpoint-with-validation/:param',
    opts: {
      parameters: {
        path: {
          param: true,
        },
      },
      validate: {
        param: (value: string) => value === 'valid',
      },
    },
  }),
  endpointWithBody: new ClientEndpoint<RecursiveRecord>({
    method: HttpMethod.POST,
    url: '/endpoint-with-body',
    body: {
      param: true,
    },
  }),
  endpointWithInit: new ClientEndpoint({
    method: HttpMethod.GET,
    url: '/endpoint-with-init',
    init: {
      headers: {
        'X-Custom-Header': 'custom-value',
      },
    },
  }),
  endpointWithCache: new ClientEndpoint({
    method: HttpMethod.GET,
    url: '/endpoint-with-cache',
    opts: {
      cache: true,
    },
  }),
  endpointWitEvictOnError: new ClientEndpoint({
    method: HttpMethod.GET,
    url: '/endpoint-with-cache-object',
    opts: {
      cache: {
        evictOnError: true,
      },
    },
  }),
  endpointWitCacheRetention: new ClientEndpoint({
    method: HttpMethod.GET,
    url: '/endpoint-with-cache-retention',
    opts: {
      cache: 20,
    },
  }),
  endpointWitCacheObject: new ClientEndpoint({
    method: HttpMethod.GET,
    url: '/endpoint-with-cache-object',
    opts: {
      cache: {
        retention: 20,
        evictOnError: true,
      },
    },
  }),
  endpointWithoutCache: new ClientEndpoint({
    method: HttpMethod.GET,
    url: '/endpoint-without-cache',
    opts: {
      cache: false,
    },
  }),
} satisfies IApi;

type IEndpoints = typeof api;

type TestableAuthentication = Record<string, string | number>;

/** Needed to type Object assignment */
// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging  -- To allow type extension
interface TestableBaseClient extends IEndpoints {}

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging  -- To allow type extension
class TestableBaseClient extends BaseClient implements IEndpoints {
  constructor(settings: BaseOptions, authentication: TestableAuthentication = {}, _api: IApi = api) {
    super(settings, authentication, _api);
  }

  get callListeners() {
    // @ts-expect-error -- private property
    return this._callListeners;
  }

  publicUpdateAuth(auth: Updater<TestableAuthentication>) {
    return this.updateAuth(auth);
  }

  // eslint-disable-next-line class-methods-use-this -- abstract method
  _transform<T extends RecursiveRecord = RecursiveRecord, O extends BaseTemplateOptions = BaseTemplateOptions>(
    template: BaseTemplate<T, O>,
    params: T,
    init?: BaseInit,
  ) {
    return { template, params, init };
  }

  // eslint-disable-next-line class-methods-use-this -- abstract method
  _parseHeaders(): HeadersInit {
    return {
      [BaseApiHeaders.ContentType]: BaseHeaderContentType.Json,
    };
  }

  // eslint-disable-next-line class-methods-use-this -- abstract method
  _parseUrl<T extends RecursiveRecord = RecursiveRecord>(template: BaseTemplate<T>, params: T): URL {
    return parseUrl(template, params, mockEndpoint);
  }

  // eslint-disable-next-line class-methods-use-this -- abstract method
  _parseBody<T extends RecursiveRecord = RecursiveRecord>(body: BaseBody<string | keyof T>, params: T): BodyInit {
    return parseBody(body, params);
  }

  // eslint-disable-next-line class-methods-use-this -- abstract method
  _parseResponse(response: Response): Response {
    return response;
  }

  publicCall<T extends RecursiveRecord = RecursiveRecord>(template: BaseTemplate<T>, params: T): CancellablePromise<Response> {
    return this._call(template, params);
  }
}

describe('base-client.ts', () => {
  const cacheStore: CacheStore<ResponseOrTypedResponse> = new Map();
  const spyCacheStore = {
    get: vi.spyOn(cacheStore, 'get'),
    set: vi.spyOn(cacheStore, 'set'),
    clear: vi.spyOn(cacheStore, 'clear'),
    delete: vi.spyOn(cacheStore, 'delete'),
  };

  const client: TestableBaseClient = new TestableBaseClient({ endpoint: 'http://my-endpoint', cacheStore });
  const response = new Response();
  const fetch = vi.spyOn(CancellableFetch, 'fetch').mockResolvedValue(response);

  const payload = {
    headers: {
      [BaseApiHeaders.ContentType]: BaseHeaderContentType.Json,
    },
    method: HttpMethod.GET,
  };

  const auth: TestableAuthentication = {
    refresh_token: 'refresh_token',
    access_token: 'access_token',
    expires: 1234567890,
    state: 'state',
  };
  const query: BaseQuery = {
    request: {
      input: 'https://api.domain.tv/oauth/device/code',
      init: {
        headers: {
          [BaseApiHeaders.ContentType]: BaseHeaderContentType.Json,
          [BaseApiHeaders.UserAgent]: 'user_agent',
        },
      },
    },
    query: new Promise(() => {}) as CancellablePromise<unknown>,
  };

  afterEach(async () => {
    await client.clearCache();
    vi.clearAllMocks();
  });

  it('should have every endpoint', () => {
    expect.hasAssertions();

    hasOwnProperty(api, client);
  });

  describe('cache', () => {
    it('should delete a cached entry', async () => {
      expect.assertions(1);

      await client.clearCache('key');

      expect(spyCacheStore.delete).toHaveBeenCalledWith('key');
    });

    it('should delete all cached entry matching regex', async () => {
      expect.assertions(1);

      await client.clearCache('key', false);

      expect(spyCacheStore.clear).toHaveBeenCalledWith('key');
    });

    it('should delete all cached entry', async () => {
      expect.assertions(1);

      await client.clearCache();

      expect(spyCacheStore.clear).toHaveBeenCalledWith(undefined);
    });

    describe('cache', () => {
      it('should not have cache function', async () => {
        expect.assertions(1);

        expect(client.endpointWithoutCache.cached).toBeUndefined();
      });

      it('should not cache calls', async () => {
        expect.assertions(3);

        await client.endpointWithCache();
        await client.endpointWithCache();
        const result = await client.endpointWithCache();

        expect(result.cache).toBeUndefined();
        expect(fetch).toHaveBeenCalledTimes(3);
        expect(fetch).toHaveBeenCalledWith(new URL('/endpoint-with-cache', mockEndpoint).toString(), payload);
      });

      it('should cache subsequent calls', async () => {
        expect.assertions(6);

        await client.endpointWithCache.cached();
        await client.endpointWithCache.cached();
        const result = await client.endpointWithCache.cached();

        expect(result.cache).toBeDefined();
        expect(result.cache?.isCache).toBeTruthy();
        expect(result.cache?.previous).toBeDefined();
        expect(result.cache?.current).toBeDefined();
        expect(fetch).toHaveBeenCalledTimes(1);
        expect(fetch).toHaveBeenCalledWith(new URL('/endpoint-with-cache', mockEndpoint).toString(), payload);
      });

      it('should cancel cache calls', async () => {
        expect.assertions(3);

        await client.endpointWithCache.cached();

        spyCacheStore.get.mockImplementationOnce(async (key: string) => {
          return new Promise(resolve => {
            setTimeout(() => resolve(cacheStore.get(key)), 500);
          });
        });
        const result$ = client.endpointWithCache.cached();

        result$.cancel();

        await expect(result$).rejects.toThrow('The operation was aborted.');

        expect(fetch).toHaveBeenCalledTimes(1);
        expect(fetch).toHaveBeenCalledWith(new URL('/endpoint-with-cache', mockEndpoint).toString(), payload);
      });

      it('should cancel uncached calls', async () => {
        expect.assertions(2);

        fetch.mockImplementationOnce(() => {
          const promise = new Promise<Response>(resolve => {
            setTimeout(() => resolve(response), 1000);
          });
          return CancellablePromise.from(promise);
        });

        const result$ = client.endpointWithCache.cached();

        await new Promise(resolve => {
          setTimeout(resolve, 0);
        });

        result$.cancel();

        await expect(result$).rejects.toThrow('The operation was aborted.');

        expect(fetch).toHaveBeenCalledTimes(1);
      });

      it('should ignore cache if cache cleared', async () => {
        expect.assertions(4);

        await client.endpointWithCache.cached();
        await client.endpointWithCache.cached();
        await client.clearCache();
        const result = await client.endpointWithCache.cached();

        expect(result.cache?.previous).toBeUndefined();
        expect(result.cache?.current).toBeDefined();
        expect(fetch).toHaveBeenCalledTimes(2);
        expect(fetch).toHaveBeenCalledWith(new URL('/endpoint-with-cache', mockEndpoint).toString(), payload);
      });

      it('should not clear cache after error', async () => {
        expect.assertions(4);
        await client.endpointWithCache.cached();

        const error = new Error('Error');
        fetch.mockRejectedValueOnce(error);

        let err: unknown;
        try {
          await client.endpointWithCache.cached(undefined, undefined, { force: true });
        } catch (e) {
          err = e;
        } finally {
          expect(err).toBe(error);
        }
        await client.endpointWithCache.cached();

        expect(spyCacheStore.delete).not.toHaveBeenCalled();
        expect(fetch).toHaveBeenCalledTimes(2);
        expect(fetch).toHaveBeenCalledWith(new URL('/endpoint-with-cache', mockEndpoint).toString(), payload);
      });

      it('should clear cache after error', async () => {
        expect.assertions(4);
        await client.endpointWitEvictOnError.cached();

        const error = new Error('Error');
        fetch.mockRejectedValueOnce(error);

        let err: unknown;
        try {
          await client.endpointWitEvictOnError.cached(undefined, undefined, { force: true });
        } catch (e) {
          err = e;
        } finally {
          expect(err).toBe(error);
        }
        await client.endpointWitEvictOnError.cached();

        expect(spyCacheStore.delete).toHaveBeenCalledTimes(1);
        expect(fetch).toHaveBeenCalledTimes(3);
        expect(fetch).toHaveBeenCalledWith(new URL('/endpoint-with-cache-object', mockEndpoint).toString(), payload);
      });

      it('should ignore cache if cache expired using endpoint retention', async () => {
        expect.assertions(2);

        await client.endpointWitCacheRetention.cached();
        await client.endpointWitCacheRetention.cached();

        // Wait for cache to expire
        await new Promise(resolve => {
          setTimeout(resolve, 50);
        });

        await client.endpointWitCacheRetention.cached();

        expect(fetch).toHaveBeenCalledTimes(2);
        expect(fetch).toHaveBeenCalledWith(new URL('/endpoint-with-cache-retention', mockEndpoint).toString(), payload);
      });

      it('should ignore cache if cache expired using endpoint retention with object', async () => {
        expect.assertions(2);

        await client.endpointWitCacheObject.cached();
        await client.endpointWitCacheObject.cached();

        // Wait for cache to expire
        await new Promise(resolve => {
          setTimeout(resolve, 50);
        });

        await client.endpointWitCacheObject.cached();

        expect(fetch).toHaveBeenCalledTimes(2);
        expect(fetch).toHaveBeenCalledWith(new URL('/endpoint-with-cache-object', mockEndpoint).toString(), payload);
      });

      it('should ignore cache if cache expired using param force', async () => {
        expect.assertions(2);

        await client.endpointWitCacheRetention.cached();
        await client.endpointWitCacheRetention.cached(undefined, undefined, { force: true });

        // Wait for cache to expire
        await new Promise(resolve => {
          setTimeout(resolve, 20);
        });

        await client.endpointWitCacheRetention.cached(undefined, undefined, { force: true });

        expect(fetch).toHaveBeenCalledTimes(3);
        expect(fetch).toHaveBeenCalledWith(new URL('/endpoint-with-cache-retention', mockEndpoint).toString(), payload);
      });

      it('should ignore cache if cache expired using param retention', async () => {
        expect.assertions(2);

        await client.endpointWithCache.cached(undefined, undefined, { retention: 10 });
        await client.endpointWithCache.cached(undefined, undefined, { retention: 10 });

        // Wait for cache to expire
        await new Promise(resolve => {
          setTimeout(resolve, 10);
        });

        await client.endpointWithCache.cached(undefined, undefined, { retention: 10 });

        expect(fetch).toHaveBeenCalledTimes(2);
        expect(fetch).toHaveBeenCalledWith(new URL('/endpoint-with-cache', mockEndpoint).toString(), payload);
      });

      it('should ignore cache if cache expired using store retention', async () => {
        expect.assertions(2);

        const _cacheStore: CacheStore<Response> = new Map();
        _cacheStore.retention = 50;
        const _client = new TestableBaseClient({ endpoint: 'http://my-endpoint', cacheStore: _cacheStore });

        await _client.endpointWithCache.cached();
        await _client.endpointWithCache.cached();

        // Wait for cache to expire
        await new Promise(resolve => {
          setTimeout(resolve, 50);
        });

        await _client.endpointWithCache.cached();

        expect(fetch).toHaveBeenCalledTimes(2);
        expect(fetch).toHaveBeenCalledWith(new URL('/endpoint-with-cache', mockEndpoint).toString(), payload);
      });
    });
  });

  describe('observers', () => {
    const authObserver = vi.fn();
    const callObserver = vi.fn();

    beforeEach(() => {
      client.publicUpdateAuth({});
      vi.clearAllMocks();
    });

    it('should subscribe an observer to authentication state changes', () => {
      expect.assertions(6);

      client.onAuthChange(authObserver);

      client.publicUpdateAuth(auth);
      expect(authObserver).toHaveBeenCalledWith(auth, {});
      expect(client.auth.state).toBe(auth.state);

      const newState = 'new-state';
      const newAuth = { ...auth, state: newState };
      client.publicUpdateAuth(_auth => {
        expect(_auth).toStrictEqual(auth);
        return newAuth;
      });
      expect(authObserver).toHaveBeenCalledWith(newAuth, auth);
      expect(client.auth.state).toBe(newState);

      expect(authObserver).toHaveBeenCalledTimes(2);
    });

    it('should subscribe an observer to calls', () => {
      expect.assertions(2);

      client.onCall(callObserver);

      client.callListeners.update(query);
      expect(callObserver).toHaveBeenCalledWith(query);
      expect(callObserver).toHaveBeenCalledTimes(1);
    });

    it('should unsubscribe an observer', () => {
      expect.assertions(6);

      client.onAuthChange(authObserver);
      client.onCall(callObserver);

      client.callListeners.update(query);
      client.publicUpdateAuth(auth);

      expect(authObserver).toHaveBeenCalledTimes(1);
      expect(callObserver).toHaveBeenCalledTimes(1);

      client.unsubscribe(authObserver);

      client.callListeners.update(query);
      client.publicUpdateAuth(auth);

      expect(authObserver).toHaveBeenCalledTimes(1);
      expect(callObserver).toHaveBeenCalledTimes(2);

      client.unsubscribe(callObserver);

      client.callListeners.update(query);
      client.publicUpdateAuth(auth);

      expect(authObserver).toHaveBeenCalledTimes(1);
      expect(callObserver).toHaveBeenCalledTimes(2);
    });

    it('should unsubscribe all observers', () => {
      expect.assertions(4);

      client.onCall(callObserver);
      client.onAuthChange(authObserver);

      client.publicUpdateAuth(auth);
      client.callListeners.update(query);

      expect(authObserver).toHaveBeenCalledTimes(1);
      expect(callObserver).toHaveBeenCalledTimes(1);

      client.unsubscribe();

      client.publicUpdateAuth(auth);
      client.callListeners.update(query);

      expect(authObserver).toHaveBeenCalledTimes(1);
      expect(callObserver).toHaveBeenCalledTimes(1);
    });
  });

  type Params = {
    requiredQuery: string;
    optionalQuery?: string;
    requiredPath: string;
    optionalPath?: string;
    requiredBody: string;
    optionalBody?: string;
  };

  // Mock data for testing
  const mockParams: Params = {
    requiredQuery: 'requiredQuery',
    requiredPath: 'requiredPath',
    requiredBody: 'requiredBody',
  };

  // Mock template for testing
  const mockTemplate: BaseTemplate<Params> = {
    url: '/movies/:requiredPath/:optionalPath/popular?requiredQuery=&optionalQuery=',
    method: HttpMethod.POST,
    opts: {
      parameters: {
        query: {
          requiredQuery: true,
          optionalQuery: false,
        },
        path: {
          requiredPath: true,
          optionalPath: false,
        },
      },
    },
    body: {
      requiredBody: true,
      optionalBody: false,
    },
  };

  describe('transform', () => {
    it('should transform the template and params', () => {
      expect.assertions(3);

      const transformPayload: BaseTransformed = {
        template: { ...mockTemplate, seed: { requiredQuery: 'seeded' } },
        params: { added: 'added' },
        init: { keepalive: true },
      };

      const transform = vi.spyOn(client, '_transform').mockReturnValueOnce(transformPayload);

      const result = client._transform(mockTemplate, mockParams);

      expect(transform).toHaveBeenCalledTimes(1);
      expect(transform).toHaveBeenCalledWith(mockTemplate, mockParams);
      expect(result).toStrictEqual(transformPayload);
    });
  });

  describe('parseBody', () => {
    it('should parse body to JSON string', () => {
      expect.assertions(1);

      const result = parseBody(mockTemplate.body!, mockParams);
      expect(result).toBe('{"requiredBody":"requiredBody"}');
    });

    it('should throw an error for missing mandatory body parameter', () => {
      expect.assertions(1);

      const mockBody: Record<string, unknown> = { ...mockParams, optionalBody: 'optionalBody' };
      delete mockBody.requiredBody;
      const testFunction = () => parseBody(mockTemplate.body!, mockBody);
      expect(testFunction).toThrow("Missing mandatory body parameter: 'requiredBody'");
    });
  });

  describe('parseUrl', () => {
    it('should construct a valid URL for API request', async () => {
      expect.assertions(2);

      const result = parseUrl(mockTemplate, mockParams, mockEndpoint);

      expect(result).toBeInstanceOf(URL);
      expect(result?.toString()).toBe(`${mockEndpoint}/movies/requiredPath/popular?requiredQuery=requiredQuery`);
    });

    it('should throw an error for missing mandatory query parameter', async () => {
      expect.assertions(1);

      const testFunction = () => parseUrl(mockTemplate, { ...mockParams, requiredQuery: '' }, mockEndpoint);
      expect(testFunction).toThrow("Missing mandatory query parameter: 'requiredQuery'");
    });

    it('should throw an error for missing mandatory path parameter', async () => {
      expect.assertions(1);

      const testFunction = () => parseUrl(mockTemplate, { ...mockParams, requiredPath: '' }, mockEndpoint);
      expect(testFunction).toThrow("Missing mandatory path parameter: 'requiredPath'");
    });

    it('should inject param from template and not url', async () => {
      expect.assertions(2);

      const result = parseUrl(
        { ...mockTemplate, url: '/movies/:requiredPath/:optionalPath/popular?additional' },
        { ...mockParams, optionalQuery: 'optionalQuery' },
        mockEndpoint,
      );

      expect(result).toBeInstanceOf(URL);
      expect(result?.toString()).toBe(`${mockEndpoint}/movies/requiredPath/popular?requiredQuery=requiredQuery&optionalQuery=optionalQuery`);
    });
  });

  describe('call', () => {
    it('should call an endpoint', async () => {
      expect.assertions(2);

      const spyFetch = vi.spyOn(CancellableFetch, 'fetch').mockResolvedValue(response);

      const result = await client.publicCall(mockTemplate, mockParams);

      expect(spyFetch).toHaveBeenCalledWith(`${mockEndpoint}/movies/requiredPath/popular?requiredQuery=requiredQuery`, {
        body: '{"requiredBody":"requiredBody"}',
        headers: {
          [BaseApiHeaders.ContentType]: BaseHeaderContentType.Json,
        },
        method: HttpMethod.POST,
      });

      expect(result).toBe(response);
    });

    it('should cancel a call to an endpoint', async () => {
      expect.assertions(2);

      const spyFetch = vi.spyOn(CancellableFetch, 'fetch').mockImplementation(() => {
        const promise = new Promise<Response>(resolve => {
          setTimeout(() => resolve(response), 500);
        });
        return CancellablePromise.from(promise);
      });

      const result$ = client.publicCall(mockTemplate, mockParams);

      result$.cancel();

      expect(spyFetch).toHaveBeenCalledWith(`${mockEndpoint}/movies/requiredPath/popular?requiredQuery=requiredQuery`, {
        body: '{"requiredBody":"requiredBody"}',
        headers: {
          [BaseApiHeaders.ContentType]: BaseHeaderContentType.Json,
        },
        method: HttpMethod.POST,
      });

      await expect(result$).rejects.toThrow('The operation was aborted.');
    });

    it('should call an endpoint with seed value', async () => {
      expect.assertions(2);

      const spyFetch = vi.spyOn(CancellableFetch, 'fetch').mockResolvedValue(response);

      const _template = { ...mockTemplate };
      _template.seed = { requiredQuery: 'seeded' };

      const _params = { ...mockParams };
      delete _params.requiredQuery;

      const result = await client.publicCall(_template, _params);

      expect(spyFetch).toHaveBeenCalledWith(`${mockEndpoint}/movies/requiredPath/popular?requiredQuery=seeded`, {
        body: '{"requiredBody":"requiredBody"}',
        headers: {
          [BaseApiHeaders.ContentType]: BaseHeaderContentType.Json,
        },
        method: HttpMethod.POST,
      });

      expect(result).toBe(response);
    });
  });

  describe('parseResponse', () => {
    it('should parse the response with additional context', async () => {
      expect.assertions(3);

      const request = {
        init: {
          body: '{"requiredBody":"requiredBody"}',
          headers: {
            'Content-Type': 'application/json',
          },
          method: 'POST',
        },
        input: 'https://api-endpoint.url/movies/requiredPath/popular?requiredQuery=requiredQuery',
      };

      const spyParseResponse = vi.spyOn(client, '_parseResponse');

      const spyFetch = vi.spyOn(CancellableFetch, 'fetch').mockResolvedValue(response);

      const result = await client.publicCall(mockTemplate, mockParams);

      expect(spyFetch).toHaveBeenCalledWith(`${mockEndpoint}/movies/requiredPath/popular?requiredQuery=requiredQuery`, {
        body: '{"requiredBody":"requiredBody"}',
        headers: {
          [BaseApiHeaders.ContentType]: BaseHeaderContentType.Json,
        },
        method: HttpMethod.POST,
      });

      expect(spyParseResponse).toHaveBeenCalledWith(response, request, mockTemplate);
      expect(result).toBe(response);
    });
  });
});
