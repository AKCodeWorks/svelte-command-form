import { error } from '@sveltejs/kit';
import type { RemoteCommand } from '@sveltejs/kit';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { CommandForm } from '../command-form/command-form.svelte.js';
import { isSchemaIssues } from '../helpers/standard-validate.js';

function command<Input, Output>(fn: (input: Input) => Promise<Output> | Output) {
	return fn as unknown as RemoteCommand<Input, Output>;
}

describe('submission behavior', () => {
	it('allows preprocess to return partial object state and validates it afterward', async () => {
		const remote = vi.fn(({ name, age }: { name: string; age: number }) => ({ name, age }));
		const onSubmit = vi.fn();
		const form = new CommandForm(z.object({ name: z.string(), age: z.number() }), {
			initial: { name: '  Ada  ', age: 36 },
			command: command(remote),
			preprocess: (state) => ({ name: state.name?.trim(), age: state.age }),
			onSubmit
		});

		await expect(form.submit()).resolves.toEqual({ name: 'Ada', age: 36 });
		expect(onSubmit).toHaveBeenCalledWith({ name: 'Ada', age: 36 });
		expect(remote).toHaveBeenCalledWith({ name: 'Ada', age: 36 });
	});

	it('allows present form properties to explicitly contain undefined', () => {
		const form = new CommandForm(z.object({ name: z.string(), age: z.number() }), {
			initial: { name: undefined, age: undefined },
			command: command(({ name, age }: { name: string; age: number }) => ({ name, age })),
			preprocess: (state) => ({
				...state,
				name: state.name?.trim()
			})
		});

		expect(form.form).toEqual({ name: undefined, age: undefined });
	});

	it('reports schema errors when partial preprocessed state is incomplete', async () => {
		const remote = vi.fn();
		const form = new CommandForm(z.object({ name: z.string(), age: z.number() }), {
			initial: { name: 'Ada' },
			command: command(remote),
			preprocess: (state) => ({ name: state.name?.trim() })
		});

		await expect(form.submit()).resolves.toBeNull();
		expect(form.errors.age?.message).toBeDefined();
		expect(remote).not.toHaveBeenCalled();
	});

	it('calls onError and rejects unexpected errors', async () => {
		const failure = new Error('network failed');
		const onError = vi.fn();
		const form = new CommandForm(z.object({ value: z.string() }), {
			initial: { value: 'valid' },
			command: command(async () => {
				throw failure;
			}),
			onError
		});

		await expect(form.submit()).rejects.toBe(failure);
		expect(onError).toHaveBeenCalledWith(failure);
	});

	it('awaits onSettled and preserves a falsy result', async () => {
		const order: string[] = [];
		const form = new CommandForm(z.object({ value: z.string() }), {
			initial: { value: 'valid' },
			command: command(() => false),
			onSettled: async (result) => {
				await Promise.resolve();
				order.push(`settled:${String(result)}`);
			}
		});

		await expect(form.submit()).resolves.toBe(false);
		expect(form.result).toBe(false);
		expect(order).toEqual(['settled:false']);
		expect(form.submitting).toBe(false);
	});

	it('shares one in-flight submission between concurrent callers', async () => {
		let resolve!: (value: string) => void;
		const pending = new Promise<string>((done) => (resolve = done));
		const remote = vi.fn(() => pending);
		const form = new CommandForm(z.object({ value: z.string() }), {
			initial: { value: 'valid' },
			command: command(remote)
		});

		const first = form.submit();
		const second = form.submit();
		resolve('done');

		await expect(Promise.all([first, second])).resolves.toEqual(['done', 'done']);
		expect(remote).toHaveBeenCalledOnce();
	});

	it('keeps recognized validation failures as null results', async () => {
		const form = new CommandForm(z.object({ value: z.string() }), {
			initial: { value: 'valid' },
			command: command(() => {
				error(422, {
					message: 'Invalid input',
					issues: [{ message: 'Rejected by server', path: ['value'] }]
				} as Error & { issues: Array<{ message: string; path: PropertyKey[] }> });
			})
		});

		await expect(form.submit()).resolves.toBeNull();
		expect(form.errors.value?.message).toBe('Rejected by server');
	});

	it('rejects HTTP failures that do not follow the validation protocol', async () => {
		const form = new CommandForm(z.object({ value: z.string() }), {
			initial: { value: 'valid' },
			command: command(() => error(500, 'Server exploded'))
		});

		await expect(form.submit()).rejects.toMatchObject({ status: 500 });
	});
});

describe('root schema state', () => {
	it('replaces and resets primitive values', () => {
		const form = new CommandForm(z.string(), {
			initial: 'initial',
			command: command((value: string) => value)
		});

		expect(form.set('changed')).toBe('changed');
		expect(form.reset()).toBe('initial');
	});

	it('replaces and resets root arrays', () => {
		const form = new CommandForm(z.array(z.string()), {
			initial: ['initial'],
			command: command((value: string[]) => value)
		});

		expect(form.set(['changed'])).toEqual(['changed']);
		expect(form.reset()).toEqual(['initial']);
	});
});

describe('file inputs', () => {
	it('passes File instances through validation and submission unchanged', async () => {
		const file = new File(['file contents'], 'test.txt', {
			type: 'text/plain',
			lastModified: 123
		});
		const remote = vi.fn(async ({ attachments }: { attachments: File[] }) => ({
			name: attachments[0].name,
			bytes: (await attachments[0].arrayBuffer()).byteLength
		}));
		const form = new CommandForm(z.object({ attachments: z.array(z.file()) }), {
			initial: { attachments: [] },
			command: command(remote)
		});

		form.set({ attachments: [file] });

		await expect(form.submit()).resolves.toEqual({ name: 'test.txt', bytes: 13 });
		expect(remote.mock.calls[0][0].attachments[0]).toBeInstanceOf(File);
	});
});

describe('validation issue protocol', () => {
	it('accepts Standard Schema issues and rejects lookalikes', () => {
		expect(isSchemaIssues([{ message: 'Invalid', path: ['items', 0, { key: 'name' }] }])).toBe(
			true
		);
		expect(isSchemaIssues([{ message: 'Invalid', path: [{ nope: 'name' }] }])).toBe(false);
		expect(isSchemaIssues({ value: { message: 'Invalid' } })).toBe(false);
	});
});
