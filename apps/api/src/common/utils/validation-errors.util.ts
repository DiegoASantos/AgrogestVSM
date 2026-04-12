import type { ValidationError } from "class-validator";

export type ValidationIssue = {
  field: string;
  messages: string[];
};

export function flattenValidationErrors(
  errors: ValidationError[],
  parentPath = ""
): ValidationIssue[] {
  return errors.flatMap((error) => {
    const field = parentPath ? `${parentPath}.${error.property}` : error.property;
    const messages = Object.values(error.constraints ?? {});
    const nestedErrors = flattenValidationErrors(error.children ?? [], field);

    const issues = messages.length > 0 ? [{ field, messages }] : [];

    return [...issues, ...nestedErrors];
  });
}
