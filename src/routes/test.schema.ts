import z from 'zod';

export enum TestEnum {
	ONE = 'one',
	TWO = 'two'
}

const schema = z.object({
	name: z.string().min(2, 'Name must contain at least 2 characters'),
	age: z.number().int().min(0, 'Age must be a positive whole number'),
	address: z.object({
		street: z.string().min(5, 'Street must contain at least 5 characters'),
		city: z.string().min(2, 'City must contain at least 2 characters')
	}),
	options: z
		.array(
			z.object({
				id: z.string().min(1, 'Option ID is required'),
				value: z.string().min(3, 'Option value must contain at least 3 characters')
			})
		)
		.min(1, 'Add at least one option'),
	hobbies: z.array(z.string().min(2, 'Hobby names must contain at least 2 characters')).min(1),
	status: z.enum(TestEnum),
	date: z.coerce.date()
});

const scenarioSchema = z.object({
	value: z.string().min(2, 'Enter at least 2 characters')
});

const primitiveSchema = z.string().trim().min(3, 'Enter at least 3 characters');

const rootArraySchema = z
	.array(z.string().trim().min(2, 'Each item must contain at least 2 characters'))
	.min(1, 'Add at least one item');

const fileSchema = z.object({
	attachments: z.array(z.file()).min(1, 'Choose at least one file')
});

export { fileSchema, primitiveSchema, rootArraySchema, scenarioSchema, schema };
