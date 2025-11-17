import z from "zod";

const testSchema = z.object({
  name: z.string().min(2, "Name is required"),
  age: z.number().min(0)
})

export { testSchema };