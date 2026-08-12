import { TransformFnParams } from 'class-transformer';

export const toNumberIfNotBlank = ({ value }: TransformFnParams): unknown => {
  if (
    value === null ||
    value === undefined ||
    (typeof value === 'string' && value.trim() === '')
  ) {
    return value;
  }

  return Number(value);
};
