import { command } from "$app/server";
import { schema } from "./test.schema.ts";
import { SchemaValidationError } from "$lib/index.ts";


export const test = command(schema, async (data) => {
  console.log(data)
  throw new SchemaValidationError([{ path: ['name'], message: 'Name is invalid server error!!' }])
})