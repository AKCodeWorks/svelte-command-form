import type { StandardSchemaV1 } from '@standard-schema/spec';
import type {
	CommandFormErrorPath,
	CommandFormErrors,
	RemoteFunctionIssue
} from '../types/command-form.types.js';

function pathKeys(path: CommandFormErrorPath = []): PropertyKey[] {
	return path.map((segment) =>
		typeof segment === 'object' && segment !== null ? segment.key : segment
	);
}

function transformIssues<T = unknown>(
	issues?: ReadonlyArray<StandardSchemaV1.Issue>
): CommandFormErrors<T> {
	const root = {} as CommandFormErrors<T>;

	for (const issue of issues ?? []) {
		let node = root as Record<PropertyKey, unknown>;
		for (const key of pathKeys(issue.path)) {
			node = (node[key] ??= {}) as Record<PropertyKey, unknown>;
		}

		const messages = Array.isArray(node.messages)
			? [...(node.messages as string[]), issue.message]
			: [issue.message];
		node.message ??= issue.message;
		node.messages = messages;
	}

	return root;
}

function issueAt<T>(
	errors: CommandFormErrors<T>,
	path: CommandFormErrorPath
): RemoteFunctionIssue | undefined {
	let node: unknown = errors;
	for (const key of pathKeys(path)) {
		if (!node || typeof node !== 'object') return undefined;
		node = (node as Record<PropertyKey, unknown>)[key];
	}
	return node &&
		typeof node === 'object' &&
		typeof (node as RemoteFunctionIssue).message === 'string'
		? (node as RemoteFunctionIssue)
		: undefined;
}

export { issueAt, pathKeys, transformIssues };
