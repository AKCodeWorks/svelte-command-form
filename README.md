# svelte-command-form

Modern form state management for Svelte built on top of the [Standard Schema](https://github.com/standard-schema/standard-schema) protocol. `svelte-command-form` helps you pair type-safe validators with imperative “command” functions (load actions, server functions, RPC endpoints, etc.) while keeping client state, server errors, and validation feedback perfectly aligned.

## Features

- **Schema-agnostic validation** – Works with any library that implements the Standard Schema v1 interface (Zod, Valibot, TypeBox, custom validators, …).
- **Command-first workflow** – Wire forms directly to your remote command (e.g. [`command` from `$app/server`](https://kit.svelte.dev/docs/load#command-functions)), and let the helper manage submission, success, and error hooks.
- **Typed form state** – `form`, `errors`, and `issues` are all strongly typed from your schema, so your component code stays in sync with validation rules.
- **Friendly + raw errors** – Surface user-friendly `errors` for rendering, while also exposing the untouched validator `issues` array for logging/analytics.
- **Helpers for remote inputs** – Includes `normalizeFiles` for bundling file uploads and `standardValidate` for reusing schema validation outside the form class.

## Installation

```bash
pnpm add svelte-command-form
# or
npm install svelte-command-form
```

`svelte-command-form` declares `svelte` as a peer dependency (Svelte 5+). Make sure your project already depends on Svelte before installing.

## Quick start

```svelte
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

<input bind:value={form.form.name} placeholder="Name" />
{#if form.errors.name}
  <p class="error">{form.errors.name.message}</p>
{/if}

<button disabled={form.submitting} on:click|preventDefault={form.submit}>
  {form.submitting ? 'Saving…' : 'Save'}
</button>
```

### Standard Schema compatibility

Any schema object that exposes the `~standard` property works:

```ts
import { z } from 'zod';
import { valibotSchema } from 'valibot';
import type { StandardSchemaV1 } from '@standard-schema/spec';

const userSchema = z
  .object({
    name: z.string().min(2),
    email: z.string().email()
  }) satisfies StandardSchemaV1;

const form = new CommandForm(userSchema, { command: saveUser });
```

## API

### `new CommandForm(schema, options)`

| Option | Type | Description |
| --- | --- | --- |
| `initial` | `Partial<T>` \| `() => Partial<T>` | Optional initial values. Returning a function lets you compute defaults per instance. |
| `command` | `(input: TIn) => Promise<TOut>` | Required remote command. The resolved value is stored in `result`. |
| `invalidate` | `string \| string[] \| 'all'` | Optional SvelteKit invalidation target(s) to refresh once a submission succeeds. |
| `reset` | `'onSuccess' \| 'always' \| 'onError'` | Optional reset behavior (default: no auto reset). |
| `onSubmit` | `(data) => void \| Promise<void>` | Called right after the schema parse succeeds, before `command`. |
| `onSuccess` | `(result) => void \| Promise<void>` | Runs after `command` resolves. |
| `onError` | `(err) => void \| Promise<void>` | Runs after client, schema, or HTTP errors are handled. |

#### Instance fields

- `form` – `$state` proxy representing the form model. Bind inputs directly to its keys.
- `errors` – `$state` map of `{ [field]: { message } }` that is ideal for user-facing feedback.
- `issues` – `$state<SchemaIssues | null>` storing the untouched array emitted by `standardValidate`. Use this for logging or non-standard UI patterns.
- `submitting` – Boolean getter reflecting `submit()` progress.
- `result` – Getter exposing the last command result (or `null`).

#### Methods

- `set(values, clear?)` – Merge values into the form. Pass `true` to replace instead of merge.
- `reset()` – Restore the form to its initial state.
- `validate()` – Runs schema validation without submitting, updating both `errors` and `issues`.
- `submit()` – Parses the schema, calls hooks, executes the configured command, manages invalidation, and populates error state on failure.
- `getErrors()` / `getIssues()` – Accessor helpers useful outside of `$state` reactivity (e.g., from tests).

### `standardValidate(schema, input)`

A small helper that runs the Standard Schema `validate` function, awaits async results, and throws `SchemaValidationError` when issues are returned. Use it to share validation logic between the form and other server utilities.

### `SchemaValidationError`

Custom error class wrapping the exact `issues` array returned by your schema. Catch it to reuse `transformIssues` or custom logging.

### `normalizeFiles(files: File[])`

Utility that converts a `File[]` into JSON-friendly objects `{ name, type, size, bytes }`, making it easy to send uploads through command functions.

## Error handling

When validation fails, `CommandForm`:

1. Throws/catches `SchemaValidationError` from `standardValidate`.
2. Converts issues into `errors` (per field) via `transformIssues`.
3. Stores the raw issue array in `issues` for programmatic access.

If the command throws an `HttpError` from SvelteKit, the helper looks for `err.body.issues` and merges them into the same structures. Any other error is forwarded to `onError` after clearing submission state.

## Development

- `pnpm dev` – Play with the demo app in `src/routes`.
- `pnpm check` – Run `svelte-check` for type and accessibility diagnostics.
- `pnpm test` – Execute the Vitest suite (if present).
- `pnpm prepack` – Builds the library with `svelte-package` + `publint` (also run as part of `pnpm build`).

## Publishing

1. Confirm `package.json` metadata (name, version, description, license, repository, etc.).
2. Run `pnpm build` to emit `dist/`.
3. Inspect the output (`npm pack --dry-run`) if desired.
4. Publish: `npm publish` (or `pnpm publish`).

## License

[MIT](LICENSE)
