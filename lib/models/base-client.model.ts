import type { CacheStore, RecursiveRecord, CancellablePromise } from '@dvcol/common-utils';

import type { BaseInit, BaseRequest, BaseTemplate, BaseTemplateOptions } from '~/models/base-template.model';

export type BaseQuery<R extends BaseRequest = BaseRequest, Q = unknown> = {
  /** The request information. */
  request: R;
  /** The query promise. */
  query: CancellablePromise<Q>;
};

export type BaseSettings<S extends RecursiveRecord = RecursiveRecord> = S & {
  /** The domain name (i.e. https://api.domain.ext) */
  endpoint: string;
  /** A cors proxy endpoint to use for requests when in a browser */
  corsProxy?: string;
  /** A cors prefix to use for requests when in a browser */
  corsPrefix?: string;
};

export type BaseOptions<S extends BaseSettings = BaseSettings, R extends Response = Response> = S & {
  /** Optional cache store to manage cache read/write */
  cacheStore?: CacheStore<R>;
};

export type BaseTransformed<P extends RecursiveRecord = RecursiveRecord, O extends BaseTemplateOptions = BaseTemplateOptions> = {
  template: BaseTemplate<P, O>;
  params: P;
  init: BaseInit;
};
