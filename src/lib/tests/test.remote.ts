import { command } from "$app/server";
import { testSchema } from "./test.schema.ts";

const testRemoteCommand = command(testSchema, async (data) => {
  return data
})

export { testRemoteCommand };