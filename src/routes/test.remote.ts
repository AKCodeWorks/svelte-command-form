import { command } from "$app/server";
import { schema } from "./test.schema.ts";


export const test = command(schema, async (d) => {
  console.log("running comand")
  console.log(d)
  return { success: true };
})