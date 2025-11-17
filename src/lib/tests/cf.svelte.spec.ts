import { CommandForm, SchemaValidationError } from '$lib/index.ts';
import { describe, it, expect } from 'vitest';
import { testRemoteCommand } from './test.remote.ts';
import { testSchema } from './test.schema.ts';
// there is no way to actually test the other parts of remote functions currently without a hacky mockup...for now just test client side parts
// https://github.com/sveltejs/kit/issues/14796

describe('initial values', async () => {
	it('test client side transforms', async () => {
		let someNum = $state(1)
		const f = new CommandForm(testSchema, {
			command: testRemoteCommand,
			onSubmit: async () => {
				throw new SchemaValidationError([{ message: "Test Error", path: ['name'] }])
			}
		})

		expect(f.errors).toStrictEqual({})

		f.set({ name: "Vitest" })

		expect(f.form.name).toBe("Vitest")

		f.set({ name: "TestVitest", age: 5 })

		expect(f.form).toStrictEqual({ name: "TestVitest", age: 5 })

		f.set({ age: 10 }, true)

		expect(f.form).toStrictEqual({ age: 10 })

		f.form.name = "DirectSet"

		expect(f.form).toStrictEqual({ name: "DirectSet", age: 10 })

		f.addError({ path: 'name', message: "Test Error" })

		expect(f.errors).toStrictEqual({ name: { message: "Test Error" } })

		// test initial values without a getter func so reset should go back to inital value not the derived updated value
		const ff = new CommandForm(testSchema, {
			command: testRemoteCommand,
			initial: { name: "Initial Name", age: someNum + 1 }
		})

		expect(ff.form).toStrictEqual({ name: "Initial Name", age: 2 })

		someNum = 2


		expect(ff.form).toStrictEqual({ name: "Initial Name", age: 2 })

		ff.reset()

		expect(ff.form).toStrictEqual({ name: "Initial Name", age: 2 })

		someNum = 1

		// do same test but with a getter function to see if it reacts

		const fff = new CommandForm(testSchema, {
			command: testRemoteCommand,
			initial: () => ({ name: "Initial Name", age: someNum + 1 })
		})

		expect(fff.form).toStrictEqual({ name: "Initial Name", age: 2 })

		someNum++

		expect(fff.form).toStrictEqual({ name: "Initial Name", age: 2 })

		fff.reset()

		expect(fff.form).toStrictEqual({ name: "Initial Name", age: 3 })
	});
});
