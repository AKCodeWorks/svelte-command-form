import type { StandardSchemaV1 } from "@standard-schema/spec";


export type SchemaIssues = ReadonlyArray<StandardSchemaV1.Issue>;

export class SchemaValidationError extends Error {
  readonly issues: SchemaIssues;

  constructor(issues: SchemaIssues) {
    super('Invalid form data');
    this.issues = issues;
  }
}

export async function standardValidate<T extends StandardSchemaV1>(
  schema: T,
  input: StandardSchemaV1.InferInput<T>
): Promise<StandardSchemaV1.InferOutput<T>> {
  let result = schema['~standard'].validate(input);
  if (result instanceof Promise) result = await result;

  if ('issues' in result && result.issues?.length) {
    throw new SchemaValidationError(result.issues);
  }

  if ('value' in result) {
    return result.value;
  }

  throw new Error('Schema validation did not return a value');
}