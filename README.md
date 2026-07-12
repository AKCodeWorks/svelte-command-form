# svelte-command-form

`svelte-command-form` manages reactive form state around SvelteKit remote commands. It is useful when an HTML form and SvelteKit's remote `form` API are not a good fit—for example, an editor driven by buttons, a dialog, or a form assembled from several interactive components.

Use SvelteKit's remote `form` API when progressive enhancement matters. Commands require JavaScript.

The schema passed to `CommandForm` is the same [Standard Schema V1](https://standardschema.dev/) schema passed to SvelteKit's `command`. Zod, Valibot, ArkType, and other Standard Schema implementations are supported.

## Installation

```bash
pnpm add @akcodeworks/svelte-command-form
```

```bash
npm install @akcodeworks/svelte-command-form
```

## Usage

Define one schema and use it for both the command and the client form.

```ts
// src/lib/user.schema.ts
import { z } from 'zod';

export const userSchema = z.object({
	name: z.string().trim().min(2, 'Enter a name'),
	email: z.email('Enter a valid email'),
	roles: z.array(z.string()).min(1, 'Choose at least one role')
});
```

```ts
// src/lib/user.remote.ts
import { command } from '$app/server';
import { userSchema } from './user.schema.js';

export const saveUser = command(userSchema, async (user) => {
	// `user` is the validated output of userSchema
	return { id: crypto.randomUUID(), user };
});
```

```svelte
<script lang="ts">
	import { CommandForm } from '@akcodeworks/svelte-command-form';
	import { saveUser } from '$lib/user.remote.js';
	import { userSchema } from '$lib/user.schema.js';

	const user = new CommandForm(userSchema, {
		command: saveUser,
		initial: {
			name: '',
			email: '',
			roles: ['member']
		},
		reset: 'onSuccess',
		onSuccess: (result) => {
			console.log('Saved user', result.id);
		}
	});
</script>

<label>
	Name
	<input bind:value={user.form.name} aria-invalid={!!user.errors.name?.message} />
</label>
{#if user.errors.name?.message}
	<p>{user.errors.name.message}</p>
{/if}

<label>
	Email
	<input type="email" bind:value={user.form.email} aria-invalid={!!user.errors.email?.message} />
</label>
{#if user.errors.email?.message}
	<p>{user.errors.email.message}</p>
{/if}

<button onclick={() => user.submit()} disabled={user.submitting}>
	{user.submitting ? 'Saving…' : 'Save'}
</button>
```

## Errors

`errors` follows the shape of the schema input. Nested objects and arrays remain nested:

```ts
const schema = z.object({
	address: z.object({
		city: z.string().min(2)
	}),
	contacts: z.array(
		z.object({
			email: z.email()
		})
	)
});
```

```svelte
{#if form.errors.address?.city?.message}
	<p>{form.errors.address.city.message}</p>
{/if}

{#each form.form.contacts ?? [] as contact, index}
	<input bind:value={contact.email} />
	{#if form.errors.contacts?.[index]?.email?.message}
		<p>{form.errors.contacts[index]?.email?.message}</p>
	{/if}
{/each}
```

Each error node contains the first message in `message` and every message reported for that path in `messages`. The untouched Standard Schema issue array is available as `issues`.

```ts
form.errors.contacts?.[0]?.email?.message;
form.errors.contacts?.[0]?.email?.messages;
form.issues;
```

You can also look up an error by a Standard Schema path or add one locally:

```ts
form.errorAt(['contacts', 0, 'email']);

form.addError({
	path: ['contacts', 0, 'email'],
	message: 'This address is already in use'
});
```

`validate()` runs client-side schema validation without invoking the command. It resolves to `true` when valid and `false` when validation issues were found.

```ts
const valid = await form.validate();
```

Unexpected validator errors are not converted into validation errors; they reject normally.

## Schema input and output

SvelteKit commands distinguish between schema input and validated output. `CommandForm` does the same:

- `form`, `initial`, `set`, and `preprocess` use `StandardSchemaV1.InferInput<Schema>`.
- `onSubmit` receives `StandardSchemaV1.InferOutput<Schema>` after client validation.
- `command` receives the schema input and validates it again on the server.

This matters for coercing and transforming schemas:

```ts
const schema = z.object({
	publishedAt: z.coerce.date()
});

const form = new CommandForm(schema, {
	command: publish,
	initial: { publishedAt: '2026-07-12' },
	onSubmit: (data) => {
		// data.publishedAt is a Date
	}
});
```

Any Standard Schema accepted by SvelteKit's `command` can be used, including primitive and root-array schemas. Non-object schemas require an initial value and use whole-value replacement:

```ts
const search = new CommandForm(z.string().min(2), {
	command: runSearch,
	initial: ''
});

search.set('svelte');
search.form; // string
```

```ts
const tags = new CommandForm(z.array(z.string().min(1)), {
	command: saveTags,
	initial: ['svelte']
});

tags.form.push('typescript');
tags.set(['replacement', 'values']);
```

Object schemas may omit `initial`; their form state starts as an empty object and is filled with partial updates.

## Options

### `command`

The SvelteKit `RemoteCommand` associated with the schema. Its input must match the schema's inferred input.

### `initial`

Initial form state, or a function that returns it. A function is evaluated when the form is constructed and every time `reset()` runs.

```ts
const form = new CommandForm(schema, {
	command: updateProfile,
	initial: () => ({
		name: currentProfile.name
	})
});
```

`initial` is required for primitive and root-array schemas because a default value cannot be inferred from Standard Schema metadata.

### `preprocess`

Runs before client validation and receives a snapshot of the current form state. It returns form state, which may still be partial for object schemas, and may be asynchronous. The schema remains responsible for determining whether the resulting state is complete and valid. The live form is not changed by preprocessing.

```ts
const form = new CommandForm(schema, {
	command: saveProfile,
	initial: { name: '', tags: [] },
	preprocess: async (data) => ({
		...data,
		name: data.name?.trim()
	})
});
```

`validate()` does not run `preprocess`; it validates the current form state directly.

### `onSubmit`

Runs after client validation and before the remote command. It receives the schema's validated output and may be asynchronous.

```ts
onSubmit: async (data) => {
	await auditAttempt(data);
};
```

### `onSuccess`

Runs after the remote command resolves. It receives the command result and is awaited before invalidation and automatic success reset.

```ts
onSuccess: (result) => {
	console.log(result);
};
```

### `onError`

Runs for validation failures and unexpected submission failures. Validation failures populate `errors` and make `submit()` resolve to `null`. Unexpected failures call `onError` and then reject from `submit()`.

```ts
try {
	await form.submit();
} catch (error) {
	// network errors, ordinary HTTP errors, and callback failures
}
```

Errors thrown by `onError` also reject from `submit()`.

### `onSettled`

Runs after success or failure and is awaited. It receives the command result on success and `null` when no result was produced. It runs after invalidation and automatic reset behavior.

```ts
onSettled: async (result) => {
	await stopProgressIndicator(result);
};
```

Falsy command results such as `false`, `0`, and `''` are passed through unchanged.

### `invalidate`

Runs SvelteKit invalidation after a successful command and `onSuccess` callback.

```ts
invalidate: 'user:details';
```

```ts
invalidate: ['user:details', 'user:list'];
```

```ts
invalidate: 'all';
```

The string forms call `invalidate`; `'all'` calls `invalidateAll`.

### `reset`

Controls automatic reset behavior. Accepted values are `'onSuccess'`, `'onError'`, and `'always'`. By default the form is not reset automatically.

## State and methods

### `form`

Reactive input state inferred from the schema. Object schemas expose partial object state. Primitive and root-array schemas expose the complete input value.

### `errors` and `issues`

Reactive validation state. `errors` is a nested tree intended for rendering; `issues` is the raw Standard Schema issue array or `null`.

`getErrors()` and `getIssues()` return the same current values when method access is more convenient.

### `result`

The most recent successful command result, or `null` before a result is available. Falsy command results are preserved.

### `submitting`

`true` from the start of preprocessing until the asynchronous `onSettled` callback completes. Concurrent calls to `submit()` share the same in-flight submission, so the command is not invoked twice.

### `submit()`

Preprocesses, validates, runs the lifecycle callbacks, invokes the command, invalidates dependencies, and applies reset behavior. It resolves to the command result on success and `null` for recognized validation failures. Unexpected failures reject.

### `set(values, clearIfExists?)`

For object schemas, `set(values)` merges partial values into the current form. Passing `true` replaces the object instead.

```ts
form.set({ name: 'Ada' });
form.set({ name: 'Grace' }, true);
```

Primitive and root-array values are always replaced:

```ts
search.set('remote functions');
tags.set(['svelte', 'typescript']);
```

### `reset()`

Replaces the current form state with `initial`. If `initial` is a function, the function is evaluated again. The reset value is returned.

### `validate()`

Validates current form state, updates `errors` and `issues`, and resolves to a boolean. It does not invoke `preprocess`, lifecycle callbacks, or the remote command.

### `addError()` and `errorAt()`

`addError()` adds a client-side error at a property or Standard Schema path. `errorAt()` returns the error at a path if one exists.

## Server validation errors

Business rules checked inside a command can be returned as field errors by throwing `SchemaValidationError` and exposing its issues through SvelteKit's server error handler.

Add the issue shape to `App.Error`:

```ts
// src/app.d.ts
import type { SchemaIssues } from '@akcodeworks/svelte-command-form';

declare global {
	namespace App {
		interface Error {
			issues?: SchemaIssues;
		}
	}
}

export {};
```

Return the issues from `handleError`:

```ts
// src/hooks.server.ts
import type { HandleServerError } from '@sveltejs/kit';
import { SchemaValidationError } from '@akcodeworks/svelte-command-form';

export const handleError: HandleServerError = ({ error }) => {
	if (error instanceof SchemaValidationError) {
		return {
			message: error.message,
			issues: error.issues
		};
	}

	return { message: 'Internal error' };
};
```

Then throw the error in the command:

```ts
import { command } from '$app/server';
import { SchemaValidationError } from '@akcodeworks/svelte-command-form';
import { userSchema } from './user.schema.js';

export const saveUser = command(userSchema, async (user) => {
	if (await emailExists(user.email)) {
		throw new SchemaValidationError([{ path: ['email'], message: 'This email is already in use' }]);
	}

	return persistUser(user);
});
```

Only HTTP errors with a valid Standard Schema issue array are treated as validation failures. Other HTTP, network, and application errors reject from `submit()`.

## File inputs

SvelteKit commands accept `File` objects directly. Add files to the schema and form state without converting them first:

```ts
// upload.schema.ts
import { z } from 'zod';

export const uploadSchema = z.object({
	attachments: z.array(z.file()).min(1, 'Choose at least one file')
});
```

The command receives `File` instances and can use the normal `File` methods:

```ts
// upload.remote.ts
import { command } from '$app/server';
import { uploadSchema } from './upload.schema.js';

export const upload = command(uploadSchema, async ({ attachments }) => {
	for (const file of attachments) {
		const bytes = await file.arrayBuffer();
		await storeFile(file.name, bytes);
	}

	return { uploaded: attachments.length };
});
```

```svelte
<script lang="ts">
	import { CommandForm } from '@akcodeworks/svelte-command-form';
	import { upload } from './upload.remote.js';
	import { uploadSchema } from './upload.schema.js';

	const form = new CommandForm(uploadSchema, {
		command: upload,
		initial: { attachments: [] }
	});

	function selectFiles(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		form.set({ attachments: Array.from(input.files ?? []) });
	}
</script>

<input type="file" multiple onchange={selectFiles} />
<button onclick={() => form.submit()}>Upload</button>
```

## Exports

```ts
import {
	CommandForm,
	SchemaValidationError,
	issueAt,
	standardValidate,
	transformIssues
} from '@akcodeworks/svelte-command-form';
```

The package also exports `CommandFormOptions`, `CommandFormErrors`, `CommandFormErrorPath`, `CommandFormState`, `RemoteCommand`, `RemoteFunctionIssue`, and `SchemaIssues` as TypeScript types.

## Contributing

Open a pull request with a description of the behavior being changed. Include Vitest coverage when the behavior can be tested without a browser.

## License

[MIT](LICENSE)
