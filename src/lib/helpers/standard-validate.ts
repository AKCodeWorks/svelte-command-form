import type { StandardSchemaV1 } from '@standard-schema/spec';

export type SchemaIssues = ReadonlyArray<StandardSchemaV1.Issue>;

function isPropertyKey(value: unknown): value is PropertyKey {
	return typeof value === 'string' || typeof value === 'number' || typeof value === 'symbol';
}

function isPathSegment(value: unknown): value is StandardSchemaV1.PathSegment {
	return typeof value === 'object' && value !== null && 'key' in value && isPropertyKey(value.key);
}

export function isSchemaIssues(value: unknown): value is SchemaIssues {
	return (
		Array.isArray(value) &&
		value.every((issue) => {
			if (
				typeof issue !== 'object' ||
				issue === null ||
				!('message' in issue) ||
				typeof issue.message !== 'string'
			) {
				return false;
			}
			if (!('path' in issue) || issue.path === undefined) return true;
			return (
				Array.isArray(issue.path) &&
				issue.path.every((part: unknown) => isPropertyKey(part) || isPathSegment(part))
			);
		})
	);
}

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
