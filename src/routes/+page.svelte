<script lang="ts">
	import { CommandForm } from '$lib/command-form/command-form.svelte.js';
	import { test } from './test.remote.js';
	import { schema, TestEnum } from './test.schema.js';

	let { data } = $props();
	let events = $state<string[]>([]);
	let nextOptionId = $state(2);

	function record(message: string) {
		events.unshift(`${new Date().toLocaleTimeString()} — ${message}`);
		events = events.slice(0, 8);
	}

	const f = new CommandForm(schema, {
		command: test,
		initial: () => ({
			name: 'Cheese',
			age: 10,
			address: { street: '123 Test Street', city: 'Testville' },
			options: [{ id: 'option-1', value: 'Cheddar' }],
			hobbies: ['Coding'],
			status: TestEnum.ONE
		}),
		onSubmit: (value) => record(`onSubmit: ${value.name}`),
		onSuccess: () => record('onSuccess'),
		onSettled: (result) => record(`onSettled: ${result ? 'result received' : 'no result'}`),
		onError: (error) => record(`onError: ${error instanceof Error ? error.message : 'unknown error'}`),
		invalidate: 'invalidate:test'
	});

	function addOption() {
		f.form.options ??= [];
		f.form.options.push({ id: `option-${nextOptionId}`, value: '' });
		nextOptionId += 1;
	}

	function removeOption(index: number) {
		f.form.options?.splice(index, 1);
	}

	function addHobby() {
		f.form.hobbies ??= [];
		f.form.hobbies.push('');
	}
</script>

<svelte:head><title>CommandForm test harness</title></svelte:head>

<main>
	<header class="hero">
		<p class="eyebrow">Development route</p>
		<h1>CommandForm test harness</h1>
		<p>Exercise each public behavior independently and inspect its reactive state.</p>
	</header>

	<section>
		<div class="section-heading">
			<div><span>01</span><h2>Scalar and nested fields</h2></div>
			<p>Direct bindings, nested objects, enums, and field-level validation.</p>
		</div>
		<div class="grid">
			<label>Name <input bind:value={f.form.name} aria-invalid={!!f.errors.name?.message} /></label>
			<label>Age <input type="number" bind:value={f.form.age} aria-invalid={!!f.errors.age?.message} /></label>
			<label>Street <input bind:value={f.form.address!.street} aria-invalid={!!f.errors.address?.street?.message} /></label>
			<label>City <input bind:value={f.form.address!.city} aria-invalid={!!f.errors.address?.city?.message} /></label>
			<label>Status
				<select bind:value={f.form.status}>
					{#each Object.values(TestEnum) as status (status)}<option value={status}>{status}</option>{/each}
				</select>
			</label>
		</div>
		<div class="errors">
			{#each [f.errors.name?.message, f.errors.age?.message, f.errors.address?.street?.message, f.errors.address?.city?.message].filter(Boolean) as message, index (index)}
				<p>{message}</p>
			{/each}
		</div>
	</section>

	<section>
		<div class="section-heading">
			<div><span>02</span><h2>Dynamic arrays</h2></div>
			<p>Add, remove, bind, and validate nested array entries.</p>
		</div>
		<div class="rows">
			{#each f.form.options ?? [] as option, index (option.id)}
				<div class="array-row">
					<input aria-label="Option ID" bind:value={option.id} placeholder="ID" />
					<input aria-label="Option value" bind:value={option.value} placeholder="Value" aria-invalid={!!f.errors.options?.[index]?.value?.message} />
					<button class="danger" onclick={() => removeOption(index)}>Remove</button>
					{#if f.errors.options?.[index]?.value?.message}<small>{f.errors.options[index]?.value?.message}</small>{/if}
				</div>
			{/each}
			{#if f.errors.options?.message}<p class="error">{f.errors.options.message}</p>{/if}
			<button onclick={addOption}>Add option</button>
		</div>

		<h3>Primitive array</h3>
		<div class="rows">
			{#each f.form.hobbies ?? [] as hobby, index (index)}
				<div class="array-row compact">
					<input bind:value={f.form.hobbies![index]} placeholder="Hobby" aria-invalid={!!f.errors.hobbies?.[index]?.message} />
					<button class="danger" onclick={() => f.form.hobbies?.splice(index, 1)}>Remove</button>
					{#if f.errors.hobbies?.[index]?.message}<small>{f.errors.hobbies[index]?.message}</small>{/if}
				</div>
			{/each}
			<button onclick={addHobby}>Add hobby</button>
		</div>
	</section>

	<section>
		<div class="section-heading">
			<div><span>03</span><h2>Error API</h2></div>
			<p>Compare schema validation with manual scalar and nested-array errors.</p>
		</div>
		<div class="actions">
			<button onclick={() => f.validate()}>Validate locally</button>
			<button onclick={() => f.addError({ path: 'name', message: 'Manual name error' })}>Add name error</button>
			<button onclick={() => f.addError({ path: ['options', 0, 'value'], message: 'Manual nested error' })}>Add nested error</button>
		</div>
		<pre>{JSON.stringify(f.errors, null, 2)}</pre>
	</section>

	<section>
		<div class="section-heading">
			<div><span>04</span><h2>Mutation and reset API</h2></div>
			<p>Test partial set, replacement set, and initial-value restoration.</p>
		</div>
		<div class="actions">
			<button onclick={() => f.set({ name: 'Set by API' })}>Partial set</button>
			<button onclick={() => f.reset()}>Reset to initial</button>
		</div>
	</section>

	<section>
		<div class="section-heading">
			<div><span>05</span><h2>Remote submission lifecycle</h2></div>
			<p>Tests validation, command execution, callbacks, result state, and invalidation.</p>
		</div>
		<div class="actions">
			<button class="primary" disabled={f.submitting} onclick={() => f.submit()}>{f.submitting ? 'Submitting…' : 'Submit command'}</button>
		</div>
		<div class="status-grid">
			<div><b>Result</b><pre>{JSON.stringify(f.result, null, 2)}</pre></div>
			<div><b>Lifecycle events</b>{#if events.length}<ol>{#each events as event, index (index)}<li>{event}</li>{/each}</ol>{:else}<p>Nothing recorded yet.</p>{/if}</div>
			<div><b>Invalidated load data</b><p>{data.options.length} generated options</p></div>
		</div>
	</section>

	<section>
		<div class="section-heading">
			<div><span>06</span><h2>Live state inspector</h2></div>
			<p>Use this snapshot to confirm direct mutations and inferred data shape.</p>
		</div>
		<pre>{JSON.stringify(f.form, null, 2)}</pre>
	</section>
</main>

<style>
	:global(*) { box-sizing: border-box; }
	:global(body) { margin: 0; background: #f5f5f2; color: #20221f; font-family: Inter, ui-sans-serif, system-ui, sans-serif; }
	main { width: min(1080px, calc(100% - 2rem)); margin: 0 auto; padding: 4rem 0 8rem; }
	.hero { border-bottom: 3px solid #20221f; padding-bottom: 2rem; margin-bottom: 1.25rem; }
	.eyebrow, .section-heading span { color: #6a6f65; font: 700 .75rem/1 monospace; letter-spacing: .12em; text-transform: uppercase; }
	h1 { font-size: clamp(2.5rem, 7vw, 5.5rem); letter-spacing: -.06em; line-height: .95; margin: .5rem 0 1rem; }
	section { background: white; border: 1px solid #d9dbd4; margin-top: 1rem; padding: clamp(1rem, 3vw, 2rem); }
	.section-heading { display: flex; justify-content: space-between; gap: 2rem; border-bottom: 1px solid #d9dbd4; padding-bottom: 1rem; margin-bottom: 1.5rem; }
	.section-heading div { display: flex; align-items: baseline; gap: .75rem; }
	.section-heading h2 { margin: 0; font-size: 1.35rem; }
	.section-heading p { max-width: 32rem; margin: 0; color: #6a6f65; }
	.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 1rem; }
	label { display: grid; gap: .4rem; font-size: .85rem; font-weight: 700; }
	input, select, button { border: 1px solid #bfc2b9; border-radius: 3px; background: white; color: inherit; font: inherit; padding: .7rem .8rem; }
	input:focus, select:focus { outline: 2px solid #5167d8; outline-offset: 1px; }
	[aria-invalid='true'] { border-color: #b72e2e; }
	button { cursor: pointer; font-weight: 700; }
	button:hover { border-color: #20221f; }
	button:disabled { cursor: wait; opacity: .6; }
	.primary { background: #20221f; color: white; }
	.danger { color: #a12424; }
	.actions, .rows { display: flex; flex-wrap: wrap; gap: .65rem; }
	.rows { flex-direction: column; align-items: flex-start; }
	.array-row { width: 100%; display: grid; grid-template-columns: 1fr 2fr auto; gap: .65rem; }
	.array-row.compact { grid-template-columns: 1fr auto; }
	.array-row small { grid-column: 2 / -1; color: #a12424; }
	.errors, .error { color: #a12424; font-size: .85rem; }
	pre { overflow: auto; min-height: 3rem; padding: 1rem; background: #20221f; color: #d9f99d; font: .8rem/1.5 ui-monospace, monospace; }
	.status-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 1rem; margin-top: 1.5rem; }
	ol { padding-left: 1.25rem; font: .8rem/1.7 ui-monospace, monospace; }
	h3 { margin-top: 2rem; }
	@media (max-width: 650px) { .section-heading { display: block; } .section-heading p { margin-top: .75rem; } .array-row { grid-template-columns: 1fr; } .array-row small { grid-column: 1; } }
</style>
