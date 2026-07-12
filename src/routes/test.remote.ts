import { command } from '$app/server';
import {
	fileSchema,
	primitiveSchema,
	rootArraySchema,
	scenarioSchema,
	schema
} from './test.schema.js';

function logCommandInput(name: string, data: unknown) {
	console.log(`[svelte-command-form test] ${name}`, data);
}

export const test = command(schema, async (data) => {
	logCommandInput('test', data);
	await new Promise((resolve) => setTimeout(resolve, 350));
	return { success: true, received: data, completedAt: new Date() };
});

export const testScenario = command(scenarioSchema, async (data) => {
	logCommandInput('testScenario', data);
	return { value: data.value };
});

export const testPrimitive = command(primitiveSchema, async (value) => {
	logCommandInput('testPrimitive', value);
	return { value, type: typeof value };
});

export const testRootArray = command(rootArraySchema, async (value) => {
	logCommandInput('testRootArray', value);
	return { value, length: value.length };
});

export const testFiles = command(fileSchema, async (data) => {
	logCommandInput('testFiles', data);
	console.log(
		'[svelte-command-form test] testFiles metadata',
		data.attachments.map((file) => ({
			name: file.name,
			type: file.type,
			size: file.size,
			lastModified: file.lastModified
		}))
	);

	return {
		files: await Promise.all(
			data.attachments.map(async (file) => ({
				name: file.name,
				type: file.type,
				size: file.size,
				lastModified: file.lastModified,
				receivedBytes: (await file.arrayBuffer()).byteLength
			}))
		)
	};
});
