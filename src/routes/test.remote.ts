import { command } from '$app/server';
import { scenarioSchema, schema } from './test.schema.js';

export const test = command(schema, async (data) => {
  await new Promise((resolve) => setTimeout(resolve, 350));
  return { success: true, received: data, completedAt: new Date() };
});

export const testScenario = command(scenarioSchema, async ({ value }) => ({ value }));
