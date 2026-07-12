import type { RemoteCommand } from '@sveltejs/kit';
import type { StandardSchemaV1 } from '@standard-schema/spec';

interface RemoteFunctionIssue {
	readonly message: string;
	readonly messages: readonly string[];
}

type CommandFormErrors<T> = Partial<RemoteFunctionIssue> &
	(T extends readonly (infer Item)[]
		? { [index: number]: CommandFormErrors<Item> | undefined }
		: T extends object
			? { [K in keyof T]?: CommandFormErrors<T[K]> }
			: object);

type CommandFormErrorPath = ReadonlyArray<PropertyKey | StandardSchemaV1.PathSegment>;

type CommandFormState<TInput> = TInput extends readonly unknown[]
	? TInput
	: TInput extends object
		? Partial<TInput>
		: TInput;

type InitialOption<TInput> = TInput extends readonly unknown[]
	? { initial: CommandFormState<TInput> | (() => CommandFormState<TInput>) }
	: TInput extends object
		? { initial?: CommandFormState<TInput> | (() => CommandFormState<TInput>) }
		: { initial: CommandFormState<TInput> | (() => CommandFormState<TInput>) };

type CommandFormOptions<TInput, TValidated, TOut> = InitialOption<TInput> & {
	invalidate?: string | string[] | 'all';
	command: RemoteCommand<TInput, TOut>;
	reset?: 'onSuccess' | 'always' | 'onError';
	preprocess?: (
		data: CommandFormState<TInput>
	) => Promise<CommandFormState<TInput>> | CommandFormState<TInput>;
	onSubmit?: (data: TValidated) => Promise<void> | void;
	onSuccess?: (result: Awaited<TOut>) => Promise<void> | void;
	onSettled?: (result: Awaited<TOut> | null) => Promise<void> | void;
	onError?: (err: unknown) => Promise<void> | void;
};

export type {
	CommandFormOptions,
	CommandFormErrors,
	CommandFormErrorPath,
	CommandFormState,
	RemoteCommand,
	RemoteFunctionIssue
};
