export const ValidationErrorTypes = {
  ValidationError: 'ValidationError',
  NaNValidationError: 'NaNValidationError',
  MinValidationError: 'MinValidationError',
  MaxValidationError: 'MaxValidationError',
  MinMaxValidationError: 'MinMaxValidationError',
} as const;

export const ErrorTypes = {
  ...ValidationErrorTypes,
  ApiError: 'ApiError',
  InvalidParameterError: 'InvalidParameterError',
  PollingExpiredError: 'PollingExpiredError',
  PollingCancelledError: 'PollingCancelledError',
  ExpiredTokenError: 'ExpiredTokenError',
  RateLimitError: 'RateLimitError',
  InvalidCsrfError: 'InvalidCsrfError',
} as const;

export class ApiError<R extends Response = Response> extends Error {
  /**
   * Inner error that this error wraps.
   */
  readonly error?: Error | R;

  constructor(message: string, error?: Error | R) {
    super(message);
    this.name = ErrorTypes.ApiError;
    this.error = error;
  }
}

export class ValidationError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = ValidationErrorTypes.ValidationError;
  }
}

export class NaNValidationError extends ValidationError {
  readonly type = ValidationErrorTypes.NaNValidationError;
  constructor(value: string | number, name?: string) {
    super(`Expected a valid number${name ? ` for '${name}'` : ''}, but received '${value}'.`);
  }
}

export class MinValidationError extends ValidationError {
  readonly type = ValidationErrorTypes.MinValidationError;
  constructor({ value, min, name }: { value: string | number; min: number; name?: string }) {
    super(`Expected a number less than or equal to '${min}'${name ? ` for '${name}'` : ''}, but received '${value}'.`);
  }
}

export class MaxValidationError extends ValidationError {
  readonly type = ValidationErrorTypes.MaxValidationError;
  constructor({ value, max, name }: { value: string | number; max: number; name?: string }) {
    super(`Expected a number more than or equal to '${max}'${name ? ` for '${name}'` : ''}, but received '${value}'.`);
  }
}

export class MinMaxValidationError extends ValidationError {
  readonly type = ValidationErrorTypes.MinMaxValidationError;
  constructor({ value, min, max, name }: { value: string | number; min: number; max: number; name?: string }) {
    super(`Expected a number between '${min}' and '${max}'${name ? ` for '${name}'` : ''}, but received '${value}'.`);
  }
}

export class InvalidParameterError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = ErrorTypes.InvalidParameterError;
  }
}

export class PollingExpiredError extends Error {
  constructor(message: string = 'Polling expired.') {
    super(message);
    this.name = ErrorTypes.PollingExpiredError;
  }
}

export class PollingCancelledError extends Error {
  constructor(message: string = 'Polling cancelled.') {
    super(message);
    this.name = ErrorTypes.PollingCancelledError;
  }
}

export class ExpiredTokenError<R extends Response = Response> extends ApiError<R> {
  constructor(message?: string, error?: Error | R) {
    super(message, error);
    this.name = ErrorTypes.ExpiredTokenError;
  }
}

export class RateLimitError<R extends Response = Response> extends ApiError<R> {
  constructor(message?: string, error?: Error | R) {
    super(message, error);
    this.name = ErrorTypes.RateLimitError;
  }
}

export class InvalidCsrfError extends Error {
  readonly state?: string;
  readonly expected?: string;
  constructor({ state, expected }: { state?: string; expected?: string } = {}) {
    super(`Invalid CSRF (State): expected '${expected}', but received ${state}`);
    this.name = ErrorTypes.InvalidCsrfError;
    this.state = state;
    this.expected = expected;
  }
}
