import type { HandleServerError } from '@sveltejs/kit/hooks';

// import { ServerValidationError } from "#lib/helpers/server-validation-error.ts";
// import type { SchemaValidationError } from "#lib/index.ts";
// import type { HandleServerError, HandleValidationError, RequestEvent } from "@sveltejs/kit";
// import { sequence } from "@sveltejs/kit/hooks";

import { SchemaValidationError } from '#lib/index.ts';

export const handleError: HandleServerError = async ({ error, kind }) => {
	if (kind === 'app' && error instanceof SchemaValidationError) {
		return {
			status: 400,
			message: error.message,
			issues: error.issues
		};
	}
};
