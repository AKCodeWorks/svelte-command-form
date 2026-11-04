// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type { SchemaIssues } from '#lib/helpers/standard-validate.js';

declare global {
	namespace App {
		interface Error {
			issues?: SchemaIssues;
		}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
