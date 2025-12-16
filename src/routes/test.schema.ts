import z from 'zod'
export enum TestEnum {
  ONE = 'one'
}
const schema = z.object({
  name: z.string().min(2, "Name is required"),
  options: z.array(z.object({
    id: z.string(),
    value: z.string()
  })),
  // age: z.number().min(0, "Age must be a positive number"),
  // address: z.object({
  //   street: z.string().min(5, "Street is required"),
  //   city: z.string().min(2, "City is required"),
  //   zip: z.string().min(5, "ZIP code is required")
  // }),
  // hobbies: z.array(z.string()).min(1, "At least one hobby is required"),
  // status: z.enum(TestEnum)
})

export { schema }