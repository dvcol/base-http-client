export type CacheStoreEntity<V = unknown, T = string> = {
  key: string;
  value: V;
  type?: T;
  cachedAt: number;
  accessedAt?: number;
};

export type CacheStore<T = unknown> = {
  get(key: string): CacheStoreEntity<T> | Promise<CacheStoreEntity<T>> | undefined;
  set(key: string, value: CacheStoreEntity<T>): CacheStore<T> | Promise<CacheStore<T>>;
  delete(key: string): boolean | Promise<boolean>;
  clear(regex?: string): void | Promise<void>;
  /** the duration in milliseconds after which the cache will be cleared */
  retention?: number;
  /** if true, the cache will be deleted if an error occurs */
  evictOnError?: boolean;
};

export const CacheRetention = {
  /** 1 hour */
  Hour: 60 * 60 * 1000,
  /** 1 day */
  Day: 24 * 60 * 60 * 1000,
  /** 1 week */
  Week: 7 * 24 * 60 * 60 * 1000,
  /** 1 month */
  Month: 31 * 24 * 60 * 60 * 1000,
  /** 1 year */
  Year: 365 * 24 * 60 * 60 * 1000,
} as const;
