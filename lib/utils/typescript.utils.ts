// eslint-disable-next-line @typescript-eslint/no-explicit-any -- generic typing
export type RecursiveRecord<T = any> =
  | {
      [key: string]: T | RecursiveRecord<T>;
    }
  | Record<string, never>;
