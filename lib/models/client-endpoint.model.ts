import type { CacheStoreEntity, CancellablePromise, HttpMethods, RecursiveRecord } from '@dvcol/common-utils';

import type { BaseBody, BaseInit, BaseTemplate, BaseTemplateOptions } from '~/models/base-template.model';

export type CacheResponse<T> = {
  previous?: CacheStoreEntity<TypedResponse<T>>;
  current?: CacheStoreEntity<TypedResponse<T>>;
  isCache?: boolean;
  evict?: () => string | boolean | undefined | Promise<string | boolean | undefined>;
};

export type TypedResponse<T> = Omit<Response, 'json'> & {
  json(): Promise<T>;
  cache?: CacheResponse<T>;
};

export type ResponseOrTypedResponse<T = unknown> = T extends never ? Response : TypedResponse<T>;

export type ClientEndpointCall<Parameter extends RecursiveRecord = Record<string, never>, Response = unknown> = (
  param?: Parameter,
  init?: BaseInit,
) => CancellablePromise<ResponseOrTypedResponse<Response>>;

export interface ClientEndpoint<Parameter extends RecursiveRecord = Record<string, never>, Response = unknown> {
  (param?: Parameter, init?: BaseInit): CancellablePromise<ResponseOrTypedResponse<Response>>;
}

export type CacheKeyFunction<Parameter extends RecursiveRecord = RecursiveRecord> = (
  param?: Parameter,
  init?: BaseInit,
  cacheOption?: BaseCacheOption,
) => string;

export type BaseCacheOption = {
  /** If true, the cache will be forcefully evicted */
  force?: boolean;
  /** The duration in milliseconds after which the cached values are ignored (computed from the cachedAt value). */
  retention?: number;
  /** If true, the eviction date will be persisted and enforce in subsequent calls, regardless or retention context. */
  saveRetention?: boolean;
  /** If true, the cache will be deleted if an error occurs. */
  evictOnError?: boolean;
  /** Overrides or complements the cache key computation. */
  cacheKey?: string | ((key: string) => string);
};

export type ClientEndpointCache<Parameter extends RecursiveRecord = Record<string, never>, Response = unknown> = {
  evict: (param?: Parameter, init?: BaseInit, cacheOptions?: BaseCacheOption) => Promise<string | undefined>;
} & ((param?: Parameter, init?: BaseInit, cacheOptions?: BaseCacheOption) => CancellablePromise<TypedResponse<Response>>);

const nonImplementedFunction = () => {
  throw new Error('Not implemented');
};

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export class ClientEndpoint<
  Parameter extends RecursiveRecord = Record<string, never>,
  Response = unknown,
  Cache extends boolean = true,
  Option extends BaseTemplateOptions = BaseTemplateOptions,
> implements BaseTemplate<Parameter, Option>
{
  method: HttpMethods;
  url: string;
  opts: Option;
  body?: BaseBody<string | keyof Parameter>;
  init?: BaseInit;
  seed?: Partial<Parameter>;
  transform?: (param: Parameter) => Parameter;
  validate?: (param: Parameter) => boolean;
  cached: Cache extends true ? Omit<this, 'cached'> & ClientEndpointCache<Parameter, Response> : never;
  resolve: (param?: Parameter) => URL;

  get config() {
    return {
      method: this.method,
      url: this.url,
      opts: this.opts,
      init: this.init,
      body: this.body,
    };
  }

  constructor(template: BaseTemplate<Parameter, Option>) {
    Object.keys(template).forEach(key => {
      this[key] = template[key];
    });

    this.init = this.init ?? {};
    this.opts = { cache: true, ...template.opts } as Option;
    this.resolve = this.resolve ?? nonImplementedFunction;
  }
}

export type IApi<Parameter extends RecursiveRecord = RecursiveRecord, Response = unknown, Cache extends boolean = boolean> = {
  [key: string]: ClientEndpoint<Parameter, Response, Cache> | IApi<Parameter>;
};
