import { command } from "$app/server";
import { schema } from "./test.schema.ts";

export const test = command(schema, async (data) => {
  console.log(data)
  return { success: true };
})