<script lang="ts">
	import { CommandForm } from '$lib/command-form.svelte.ts';
	import { test } from './test.remote.ts';
	import { schema } from './test.schema.ts';

	const f = new CommandForm(schema, {
		command: test,
		onSubmit: async (data) => {
			console.log(data);
		},
		onSuccess: async (res) => {
			console.log('success');
		}
	});
</script>

<input type="text" placeholder="Name" bind:value={f.form.name} />
<button onclick={f.submit}>submit</button>
{#if f.errors.name?.message}
	<p style="color: red">{f.errors.name.message}</p>
{/if}
