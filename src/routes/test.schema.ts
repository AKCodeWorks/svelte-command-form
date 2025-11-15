import z from 'zod'

const schema = z.object({
  name: z.string().min(2, "Name is required"),
  age: z.number().min(0, "Age must be a positive number"),
  address: z.object({
    street: z.string().min(5, "Street is required"),
    city: z.string().min(2, "City is required"),
    zip: z.string().min(5, "ZIP code is required")
  }),
  hobbies: z.array(z.string()).min(1, "At least one hobby is required")
})

export { schema }