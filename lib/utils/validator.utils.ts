import { MaxValidationError, MinMaxValidationError, MinValidationError, NaNValidationError } from './error.utils';

export const ValidatorUtils = {
  isNumber: (value: string | number, name?: string) => {
    const _value = Number(value);
    if (Number.isNaN(_value)) throw new NaNValidationError(value, name);
    return _value;
  },
  max: (value: number | string, { max, name }: { max: number; name?: string }) => {
    const _value = ValidatorUtils.isNumber(value);
    if (_value > max) throw new MaxValidationError({ value: _value, max, name });
    return _value;
  },
  min: (value: number | string, { min, name }: { min: number; name?: string }) => {
    const _value = ValidatorUtils.isNumber(value);
    if (_value < min) throw new MinValidationError({ value: _value, min, name });
    return _value;
  },
  minMax: (value: number | string, { min, max, name }: { min: number; max: number; name?: string }) => {
    const _value = ValidatorUtils.isNumber(value);
    if (_value < min || _value > max) throw new MinMaxValidationError({ value: _value, min, max, name });
    return _value;
  },
  maxLength: (value: string | { length: number }, { max, name }: { max: number; name?: string }) => {
    return ValidatorUtils.max(value.length, { max, name });
  },
  minLength: (value: string | { length: number }, { min, name }: { min: number; name?: string }) => {
    return ValidatorUtils.min(value.length, { min, name });
  },
  minMaxlength: (value: string | { length: number }, { min, max, name }: { min: number; max: number; name?: string }) => {
    return ValidatorUtils.minMax(value.length, { min, max, name });
  },
};
