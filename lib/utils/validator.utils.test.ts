import { describe, expect, it } from 'vitest';

import { MaxValidationError, MinMaxValidationError, MinValidationError, NaNValidationError } from './error.utils';
import { ValidatorUtils } from './validator.utils';

describe('validators.utils.ts', () => {
  it('isNumber', () => {
    expect.assertions(4);

    expect(ValidatorUtils.isNumber(12)).toBeTruthy();
    expect(ValidatorUtils.isNumber('12')).toBeTruthy();
    expect(() => ValidatorUtils.isNumber('not a number')).toThrow(new NaNValidationError('not a number'));
    expect(() => ValidatorUtils.isNumber('not a number', 'field')).toThrow(new NaNValidationError('not a number', 'field'));
  });

  it('max', () => {
    expect.assertions(4);

    expect(ValidatorUtils.max(12, { max: 12 })).toBeTruthy();
    expect(() => ValidatorUtils.max(13, { max: 12 })).toThrow(new MaxValidationError({ value: 13, max: 12 }));
    expect(ValidatorUtils.max(12, { max: 12, name: 'field' })).toBeTruthy();
    expect(() => ValidatorUtils.max(13, { max: 12, name: 'field' })).toThrow(new MaxValidationError({ value: 13, max: 12, name: 'field' }));
  });

  it('min', () => {
    expect.assertions(4);

    expect(ValidatorUtils.min(12, { min: 12 })).toBeTruthy();
    expect(() => ValidatorUtils.min(11, { min: 12 })).toThrow(new MinValidationError({ value: 11, min: 12 }));
    expect(ValidatorUtils.min(12, { min: 12, name: 'field' })).toBeTruthy();
    expect(() => ValidatorUtils.min(11, { min: 12, name: 'field' })).toThrow(new MinValidationError({ value: 11, min: 12, name: 'field' }));
  });

  describe('minMax', () => {
    it('should validate without error', () => {
      expect.assertions(2);

      expect(ValidatorUtils.minMax(12, { min: 12, max: 12 })).toBeTruthy();
      expect(ValidatorUtils.minMax(12, { min: 10, max: 14, name: 'field' })).toBeTruthy();
    });

    it('should throw a validation error', () => {
      expect.assertions(4);

      expect(() => ValidatorUtils.minMax(11, { min: 12, max: 12 })).toThrow(new MinMaxValidationError({ value: 11, min: 12, max: 12 }));
      expect(() => ValidatorUtils.minMax(13, { min: 12, max: 12, name: 'field' })).toThrow(
        new MinMaxValidationError({ value: 13, min: 12, max: 12, name: 'field' }),
      );
      expect(() => ValidatorUtils.minMax(9, { min: 10, max: 12 })).toThrow(new MinMaxValidationError({ value: 9, min: 10, max: 12 }));
      expect(() => ValidatorUtils.minMax(13, { min: 10, max: 12, name: 'field' })).toThrow(
        new MinMaxValidationError({ value: 13, min: 10, max: 12, name: 'field' }),
      );
    });
  });

  describe('length', () => {
    it('min', () => {
      expect.assertions(4);

      expect(ValidatorUtils.minLength('abcdefg', { min: 3 })).toBeTruthy();
      expect(() => ValidatorUtils.minLength([1, 2], { min: 3 })).toThrow(new MinValidationError({ value: 2, min: 3 }));
      expect(ValidatorUtils.minLength([1, 2, 3, 4], { min: 3, name: 'field' })).toBeTruthy();
      expect(() => ValidatorUtils.minLength('ab', { min: 3, name: 'field' })).toThrow(new MinValidationError({ value: 2, min: 3, name: 'field' }));
    });

    it('max', () => {
      expect.assertions(4);

      expect(ValidatorUtils.maxLength('abc', { max: 3 })).toBeTruthy();
      expect(() => ValidatorUtils.maxLength('abcd', { max: 3 })).toThrow(new MaxValidationError({ value: 4, max: 3 }));
      expect(ValidatorUtils.maxLength([1, 2], { max: 3, name: 'field' })).toBeTruthy();
      expect(() => ValidatorUtils.maxLength([1, 2, 3, 4], { max: 3, name: 'field' })).toThrow(
        new MaxValidationError({ value: 4, max: 3, name: 'field' }),
      );
    });

    it('minMax', () => {
      expect.assertions(4);

      expect(ValidatorUtils.minMaxlength('abc', { min: 3, max: 3 })).toBeTruthy();
      expect(() => ValidatorUtils.minMaxlength('abcd', { min: 1, max: 3 })).toThrow(new MinMaxValidationError({ value: 4, min: 1, max: 3 }));
      expect(ValidatorUtils.minMaxlength([1, 2], { min: 1, max: 3, name: 'field' })).toBeTruthy();
      expect(() => ValidatorUtils.minMaxlength([1, 2, 3, 4], { min: 1, max: 3, name: 'field' })).toThrow(
        new MinMaxValidationError({ value: 4, min: 1, max: 3, name: 'field' }),
      );
    });
  });
});
