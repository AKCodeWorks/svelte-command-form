# svelte-command-form

Svelte-Command-Form allows you to have easy to use forms with commands instead of remote forms. Is this redundant? Maybe. However, you may not want to use an HTML form everytime. The API is greatly influenced by SvelteKit-Superforms, so if you are used to that you shouldn't have a problem here.

Whenever possible you should use the SvelteKit provided `form` remote function since commands will fail in non-JS environments, but there may be cases where that is not practical or you just like the ease of interacting with an object instead of form data.

## Features

- **Schema-agnostic validation** – Works with any library that implements the [Standard Schema V1]("https://standardschema.dev/") interface. If you are unsure if your schema validation library is compatible see the list of [compatible libraries](https://standardschema.dev/#what-schema-libraries-implement-the-spec).
- **Command-first workflow** – Wire forms directly to your remote command ([`command` from `$app/server`](https://svelte.dev/docs/kit/remote-functions#command)), and let the helper manage submission, success, and error hooks.
- **Typed form state** – `form`, `errors`, and `issues` are all strongly typed from your schema, so your component code stays in sync with validation rules.
- **Friendly + raw errors** – Surface user-friendly `errors` for rendering, while also exposing the untouched validator `issues` array for logging/analytics.
- **Helpers for remote inputs** – Includes `normalizeFiles` for bundling file uploads and `standardValidate` for reusing schema validation outside the form class.

  > Standard validate was yoinked straight from the `StandardSchema` GitHub

## Installation

```bash
pnpm add @akcodeworks/svelte-command-form
# or
npm install @akcodeworks/svelte-command-form
```

## Quick start

```html
<script lang="ts">
	import { CommandForm } from 'svelte-command-form';
	import { schema } from '$lib/schemas/user.schema';
	import { saveUser } from '$lib/server/save-user';

	const form = new CommandForm(schema, {
		initial: { name: '' },
		command: saveUser,
		reset: 'onSuccess',
		onSuccess: (result) => console.log('Saved', result)
	});
</script>

<input bind:value="{form.form.name}" placeholder="Name" />
{#if form.errors.name}
<p class="error">{form.errors.name.message}</p>
{/if}

<button disabled="{form.submitting}" onclick="{form.submit}">
	{form.submitting ? 'Saving…' : 'Save'}
</button>
```

### Showing validation errors

`CommandForm` keeps two synchronized error stores:

- `errors` – per-field objects `{ message: string }` that are easy to render.
- `issues` – the untouched Standard Schema issue array (useful for logs/analytics).

To display errors in the DOM, check the keyed entry in `form.errors`:

```html
<label>
	Name
	<input bind:value="{form.form.name}" />
</label>
{#if form.errors.name}
<p class="error">{form.errors.name.message}</p>
{/if}

<label>
	Age
	<input type="number" bind:value="{form.form.age}" />
</label>
{#if form.errors.age}
<p class="error">{form.errors.age.message}</p>
{/if}
```

Running `await form.validate()` triggers the same schema parsing as `submit()` without sending data, so you can eagerly show validation feedback (e.g., on blur). Whenever validation passes, both `errors` and `issues` are cleared.

Array and nested errors follow the dot-path reported by your schema. If the schema declares `names: z.array(z.string())` and the user submits `[123]`, the error map becomes:

```ts
{
  'names.0': { message: 'Expected string' }
}
```

Render that however makes sense—either surface the aggregated message near the group (`form.errors['names.0']?.message`) or group entries by prefix to display per-item errors.

### Standard Schema compatibility

Any schema object that exposes the `~standard` property works:

```ts
import { z } from 'zod'; // or create a schema with any StandardSchemaV1 compliant lib.

const userSchema = z.object({
	name: z.string().min(2),
	email: z.string().email()
});

const form = new CommandForm(userSchema, { command: saveUser });
```

## API

### `new CommandForm(schema, options)`

#### `schema`

The schema that the command accepts.

```typescript
// someCommand.schema.ts

import { z } from 'zod';

const schema = z.object({
	name: z.string().min(1, 'Must have a name')
});

export { schema as someCommandSchema };
```

```html
<script lang="ts">
	import { someCommandSchema } from '$lib/someCommand.schema.ts';

	const cmd = new CommandForm(someCommandSchema, {
		// ... other options
	});
</script>
```

---

#### `options.initial`

Optional initial values. Returning a functions lets you compute defaults per form instance and/or when computed values change, like when using `$derived()`

> You must set default values here if you are using them, default values are not able to be extracted from a `StandardSchemaV1`

**Example:**

```html
<script lang="ts">
	let { data } = $props();
	let { name } = $derived(data);

	const cmd = new CommandForm(schema, {
		// if you do not use a function to get the value of name here
		// you will never get the updated value
		initial: () => ({
			name
		})
		// ...other options
	});
</script>

<input bind:value="{form.name}" />
<button onclick="{cmd.form.submit}">Change Name</button>
```

---

#### `options.command`

The command function that is being called.

**Example:**

```html
<script lang="ts">
	import someCommand from '$lib/remote/some-command.remote';

	const cmd = new CommandForm(schema, {
		command: someCommand
		// ...other options
	});
</script>
```

---

#### `options.invalidate`

Optional SvelteKit invalidation targets. Can be set to a single string, a string[] for multiple targets, or a literal of `all` to run `invalidateAll()`

> This only runs on successful form submissions

**Example:**

```html
<script lang="ts">
	const cmd = new CommandForm(schema, {
		invalidate: 'user:details' // invalidates routes with depends("user:details") set
		// ...other options
	});
</script>
```

---

#### `options.reset`

Allows you to select if the form should be reset. By default, the form never resets. This accepts a value of `onSuccess` | `onError` or `always`

**Example:**

```html
<script lang="ts">
	const cmd = new CommandForm(schema, {
		reset: 'always' // the form will reset after submission no matter what
		// ...other options
	});
</script>
```

---

#### `options.preprocess()`

Allows you to preprocess any data you have set when the form is submitted. This will run prior to any parsing on the client. For example if you would need to convert an input of type 'date' to an ISO string on the client before submitting. If this is a promise, it will be awaited before continuing.

```html
<script lang="ts">
	const cmd = new CommandForm(schema, {
		preprocess: (data) => {
			cmd.set({ someDate: new Date(data.someDate).toISOString() });
		}
		// ... other options
	});
</script>

<input type="date" bind:value="{cmd.form.someDate}" />
```

---

#### `options.onSuccess()`

Runs if the form is submitted and returns sucessfully. You will have access to the returned value from the `command` that is ran. This can also be a promise.

```html
<script lang="ts">
	const cmd = new CommandForm(schema, {
		onSuccess: (response) => {
			toast.success(`${response.name} has been updated!`);
		}
		// ... other options
	});
</script>

<input type="date" bind:value="{cmd.form.someDate}" />
```

---

#### `options.onError()`

Runs if the command fails and an error is returned.

```html
<script lang="ts">
	const cmd = new CommandForm(schema, {
		onError: (error) => {
			toast.error('Oops! Something went wrong!');
			console.error(error);
		}
		// ... other options
	});
</script>
```

---

### Methods & Values

When you create a `new CommandForm` you get access to several methods and values that will help you manage your form state, submit, reset, and/or display errors.

In the following examples we will be using the following command form.

```html
<script lang="ts">
	const cmd = new CommandForm(schema, {
		initial: {
			name: 'Ada Lovelace',
			age: '30'
		}
	});
</script>
```

#### `.form`

Gives you access to the data within the form. Useful when binding to inputs.

```svelte
<input placeholder="What is your name?" bind:value={cmd.form.name} />
```

---

#### `.set(values, clear?: boolean )`

Allows you to programatically merge form field values in bulk or add other values. If you set clear to true, it will replace all values instead of merging them in.

```typescript
set({ name: 'Linus Torvalds' });

// cmd.form will now be {name: "Linus Torvalds", age: 30}

set({ name: 'Linus Sebastian' }, true);

// cmd.form will now be {name: "Linus Sebastian"}
```

---

#### `.reset()`

Resets the form to the initial values that were passed in when it was instantiated.

> Note: If you are using an accessor function inside of `options.initial` it will reset to the newest available value instead of what it was when you instantiated it.

---

#### `.validate()`

Runs the parser and populates any errors. Useful if you want to display errors in realtime as the user is filling out the form. It will also clear any errors as they are corrected each time it is run.

> If you are using `options.preprocess` this is not ran during `validate()` however if you are using a schema library preprocessor such as `zod.preprocess` it should be ran within the parse.

```svelte
<input bind:value={cmd.form.name} onchange={cmd.validate} />

{#if cmd.errors.name}
<!-- display the error -->
{#if}
```

---

#### `.submitting`

Returns a boolean indicatiing whether the form is in flight or not. Useful for setting disabled states or showing loading spinners while the data is processed.

```svelte
{#if cmd.submitting}
	Please wait while we update your name...
{:else}
	<input bind:value={cmd.form.name} />
{/if}
<button onclick={cmd.submit} disabled={cmd.submitting}>Submit</button>
```

---

#### `errors`

Returns back an easily accessible object with any validation errors. See [Errors](#errors) for more information on how to render.

#### `issues`

Returns back the raw validation issues. See [Issues](#issues) for more information.

---

## Handling file uploads

SvelteKit command functions currently expect JSON-serializable payloads, so `File` objects cannot be passed directly from
the client to a command.

Use the provided `normalizeFiles` helper to convert browser
`File` instances into serializable blobs inside the `onSubmit` hook (so the parsed
data that reaches your command already contains normalized entries):

```html
<script lang="ts">
	import { CommandForm, normalizeFiles } from 'svelte-command-form';
	import { zodSchema } from '$lib/schemas/upload.schema';
	import { uploadCommand } from '$lib/server/upload.remote';

	const cmd = new CommandForm(zodSchema, {
		command: uploadCommand,
		async preprocess(data) {
			cmd.form.attachments = await normalizeFiles(data.attachments);
		}
	});

	const handleFiles = (event: Event) => {
		const input = event.target as HTMLInputElement;
		form.set({ attachments: input.files ? [...input.files] : [] });
	};
</script>

<input type="file" multiple onchange="{handleFiles}" />
```

`normalizeFiles` outputs objects like:

```ts
type NormalizedFile = {
	name: string;
	type: string;
	size: number;
	bytes: Uint8Array;
};
```

Both the Zod and Valibot schemas above can be adapted to accept either `File[]` (for client-side validation) or this normalized structure if you prefer validating the serialized payload on the server.

## Error handling

When validation fails, `CommandForm`:

1. Throws/catches `SchemaValidationError` from `standardValidate`.
2. Converts issues into `errors` (per field) via `transformIssues`.
3. Stores the raw issue array in `issues` for programmatic access.

If the command throws an `HttpError` from SvelteKit, the helper looks for `err.body.issues` and merges them into the same structures. Any other error is forwarded to `onError` after clearing submission state. You can handle validation errors to populate this in your `hooks.server.ts`

## Manual Errors

You can add errors manually by using the `addErrors` method on the client or by throwing a `new SchemaValidationError` inside of the remote function.

```typescript
// server add error
const someFunc = command(schema, async (data) => {
	const user = await db.find({where: email: data.email})
	if(!user) throw new SchemaValidationError([{ message: "User does with this email does not exist!", path: ['email'] }])
})
```

```html
<!-- +page.svelte -->
<script lang="ts">
	const form = new CommandForm(schema, {
		command: someCommand
	});

	function addError() {
		form.addError({ path: 'name', message: 'Test Error' });
	}
</script>

<button onclick="{addError}">Add an Error</button>
```

## Contributing

Feel free to contribute by opening a PR with a detailed description of why you are wanting to change what you are changing. If it can be tested with Vitest, that is preferred.

## License

[MIT](LICENSE)
