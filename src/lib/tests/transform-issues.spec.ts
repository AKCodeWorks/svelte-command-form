import { describe, expect, it } from 'vitest';
import { issueAt, transformIssues } from '../helpers/transform-issues.js';

describe('nested validation issues', () => {
	it('preserves arrays, path segment objects and multiple messages', () => {
		const errors = transformIssues<{ options: Array<{ name: string }> }>([
			{ path: ['options', 1, { key: 'name' }], message: 'Required' },
			{ path: ['options', 1, 'name'], message: 'Too short' }
		]);

		expect(errors.options?.[1]?.name).toEqual({
			message: 'Required',
			messages: ['Required', 'Too short']
		});
		expect(issueAt(errors, ['options', 1, 'name'])?.messages).toEqual(['Required', 'Too short']);
	});
});
