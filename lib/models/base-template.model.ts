import type { HttpMethods, RecursiveRecord } from '@dvcol/common-utils';

export type BaseRequest = {
  input: RequestInfo;
  init: RequestInit & { headers: RequestInit['headers'] };
};

export type BaseInit = Omit<Partial<BaseRequest['init']>, 'method'>;

export type BaseBody<
  T extends string | number | symbol = string | number | symbol,
  V extends boolean | symbol | string = boolean | symbol | string,
> = Partial<Record<T, V>>;

export type BaseTemplateOptions<
  T extends string | number | symbol = string | number | symbol,
  V extends boolean | symbol | string = boolean | symbol | string,
> = {
  /**
   * Enables caching of requests (defaults to true).
   * If a number is provided, it will be used as the retention time in milliseconds.
   */
  cache?: boolean | number | { retention?: number; evictOnError?: boolean };
  /** Boolean record or required (truthy) or optional parameters (falsy) */
  parameters?: {
    /** Boolean record or required (truthy) or optional path parameters (falsy) */
    path?: Partial<Record<T, V>>;
    /** Boolean record or required (truthy) or optional query parameters (falsy) */
    query?: Partial<Record<T, V>>;
  };
};

export type BaseTemplate<P extends RecursiveRecord = RecursiveRecord, O extends BaseTemplateOptions = BaseTemplateOptions> = {
  method: HttpMethods;
  url: string;
  opts?: O;
  /** Boolean record or required (truthy) or optional fields (falsy) */
  body?: BaseBody<string | keyof P>;
  /** Partial fetch request init */
  init?: BaseInit;
  /** Validate the parameters before performing request */
  validate?: (param: P) => boolean;
  /** Transform the parameters before performing request */
  transform?: (param: P) => P;
  /** Default seed parameters */
  seed?: Partial<P>;
};
