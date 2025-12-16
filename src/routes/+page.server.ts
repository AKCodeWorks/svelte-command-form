export const load = async ({ depends }) => {
  depends('invalidate:test');
  let total = 1
  await new Promise((r) => setTimeout(r, 500));
  const options = Array.from({ length: Math.floor(Math.random() * 15) + total }, (_, i) => ({ id: i.toString(), value: `Option ${i + 1}` }))
  total++
  return {
    options
  }
}