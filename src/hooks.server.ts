// import { ServerValidationError } from "$lib/helpers/server-validation-error.ts";
// import type { SchemaValidationError } from "$lib/index.ts";
// import type { HandleServerError, HandleValidationError, RequestEvent } from "@sveltejs/kit";
// import { sequence } from "@sveltejs/kit/hooks";


import { SchemaValidationError } from "$lib/index.ts";
import type { HandleServerError } from "@sveltejs/kit";



export const handleError: HandleServerError = async ({ error }) => {
  if (error instanceof SchemaValidationError) return error as SchemaValidationError
};