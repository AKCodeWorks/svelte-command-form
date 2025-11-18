<script lang="ts">
	import { CommandForm } from '$lib/command-form/command-form.svelte.ts';
	import { test } from './test.remote.ts';
	import { schema, TestEnum } from './test.schema.ts';

	const f = new CommandForm(schema, {
		command: test,
		initial: {
			hobbies: ['coding'],
			status: TestEnum.ONE
		},
		onSubmit: async (data) => {
			console.log(data);
		},
		onSuccess: async (res) => {
			console.log('success');
			console.log(res.success);
		},
		onError: async (err) => {
			console.log('error', err);
		}
	});

	$inspect(f.errors);
</script>

<input type="text" placeholder="Name" bind:value={f.form.name} />

<button onclick={f.submit}>submit</button>
<button onclick={() => f.addError({ path: 'name', message: 'yeet' })}>custom error</button>
{#if f.errors.name?.message}
	<p style="color: red">{f.errors.name.message}</p>
{/if}
