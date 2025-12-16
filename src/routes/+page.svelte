<script lang="ts">
	import { CommandForm } from '$lib/command-form/command-form.svelte.js';
	import { test } from './test.remote.ts';
	import { schema, TestEnum } from './test.schema.ts';
	let { data } = $props();

	let options = $derived(data.options);

	const f = new CommandForm(schema, {
		command: test,
		initial: () => {
			return {
				name: 'Cheese',
				options: options
			};
		},
		onSubmit: async (data) => {
			console.log(data);
		},
		onSuccess: async (res) => {
			console.log('success');
		},
		onSettled: async (res) => {
			f.reset();
		},
		onError: async (err) => {
			console.error('error', err);
		},
		invalidate: 'invalidate:test'
	});
</script>

<input type="text" placeholder="Name" bind:value={f.form.name} />

<button onclick={f.submit}>submit</button>
<button onclick={() => f.addError({ path: 'name', message: 'yeet' })}>custom error</button>
{#if f.errors.name?.message}
	<p style="color: red">{f.errors.name.message}</p>
{/if}

{#each f.form.options as option (option.id)}
	{option.value}
{/each}
