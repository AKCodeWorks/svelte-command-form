import { command } from "$app/server";
import { schema } from "./test.schema.ts";
import { SchemaValidationError } from "$lib/index.ts";


export const test = command(schema, async () => {

  throw new SchemaValidationError([{ path: ['email'], message: 'Name is invalid server error!!' }])
})