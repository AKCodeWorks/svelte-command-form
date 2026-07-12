<script lang="ts">
	import { CommandForm } from '$lib/command-form/command-form.svelte.js';
	import { test, testScenario } from './test.remote.js';
	import { scenarioSchema, schema, TestEnum } from './test.schema.js';

	let { data } = $props();
	let events = $state<string[]>([]);
	let nextOptionId = $state(2);
	let preprocessed = $state<unknown>(null);
	let accessorOutput = $state<unknown>(null);
	let initialRun = $state(0);

	function record(message: string) {
		events.unshift(`${new Date().toLocaleTimeString()} — ${message}`);
		events = events.slice(0, 8);
	}

	const f = new CommandForm(schema, {
		command: test,
		initial: () => ({
			name: `Cheese ${++initialRun}`,
			age: 10,
			address: { street: '123 Test Street', city: 'Testville' },
			options: [{ id: 'option-1', value: 'Cheddar' }],
			hobbies: ['Coding'],
			status: TestEnum.ONE,
			date: '2026-07-12'
		}),
		preprocess: async (value) => {
			record('preprocess started');
			await new Promise((resolve) => setTimeout(resolve, 200));
			const processed = {
				name: value.name?.trim() ?? '',
				age: value.age ?? -1,
				address: value.address ?? { street: '', city: '' },
				options: (value.options ?? []).map((option) => ({ ...option, value: option.value.trim() })),
				hobbies: (value.hobbies ?? []).map((hobby) => hobby.trim()),
				status: value.status ?? TestEnum.ONE,
				date: value.date ?? new Date().toISOString()
			};
			preprocessed = processed;
			record('preprocess completed');
			return processed;
		},
		onSubmit: (value) => record(`onSubmit: ${value.name}`),
		onSuccess: (result) => record(`onSuccess: ${result.success}`),
		onSettled: (result) => record(`onSettled: ${result ? 'result received' : 'no result'}`),
		onError: (error) => record(`onError: ${error instanceof Error ? error.message : 'unknown error'}`),
		invalidate: 'invalidate:test'
	});

	const resetOnSuccess = new CommandForm(scenarioSchema, {
		command: testScenario,
		initial: { value: 'success initial' },
		reset: 'onSuccess',
		invalidate: ['invalidate:test', 'invalidate:secondary']
	});

	const resetOnError = new CommandForm(scenarioSchema, {
		command: testScenario,
		initial: { value: 'error initial' },
		reset: 'onError'
	});

	const resetAlways = new CommandForm(scenarioSchema, {
		command: testScenario,
		initial: { value: 'always initial' },
		reset: 'always',
		invalidate: 'all'
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
			<label>Date
				<input
					type="date"
					value={typeof f.form.date === 'string' ? f.form.date : ''}
					oninput={(event) => f.form.date = event.currentTarget.value}
				/>
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
			<button onclick={() => f.reset()}>Reset form</button>
		</div>
	</section>

	<section>
		<div class="section-heading">
			<div><span>05</span><h2>Remote submission lifecycle</h2></div>
			<p>Tests preprocess, validation, every callback, command execution, result state, and string invalidation.</p>
		</div>
		<div class="actions">
			<button class="primary" disabled={f.submitting} onclick={() => f.submit()}>{f.submitting ? 'Submitting…' : 'Submit command'}</button>
			<button onclick={() => { f.form.name = ''; void f.submit(); }}>Submit invalid data</button>
			<button onclick={() => events = []}>Clear events</button>
		</div>
		<div class="status-grid">
			<div><b>Result</b><pre>{JSON.stringify(f.result, null, 2)}</pre></div>
			<div><b>Preprocess output</b><pre>{JSON.stringify(preprocessed, null, 2)}</pre></div>
			<div><b>Lifecycle events</b>{#if events.length}<ol>{#each events as event, index (index)}<li>{event}</li>{/each}</ol>{:else}<p>Nothing recorded yet.</p>{/if}</div>
			<div><b>Invalidated load data</b><p>{data.options.length} generated options</p></div>
		</div>
	</section>

	<section>
		<div class="section-heading">
			<div><span>06</span><h2>Automatic reset and invalidation modes</h2></div>
			<p>Separate instances cover onSuccess, onError, always, string arrays, and invalidateAll.</p>
		</div>
		<div class="scenario-grid">
			<div class="scenario">
				<b>reset: onSuccess · invalidate: string[]</b>
				<input bind:value={resetOnSuccess.form.value} aria-label="On-success value" />
				<button onclick={() => resetOnSuccess.submit()} disabled={resetOnSuccess.submitting}>Submit valid</button>
				<code>{resetOnSuccess.form.value}</code>
			</div>
			<div class="scenario">
				<b>reset: onError</b>
				<input bind:value={resetOnError.form.value} aria-label="On-error value" />
				<button onclick={() => { resetOnError.form.value = ''; void resetOnError.submit(); }} disabled={resetOnError.submitting}>Submit invalid</button>
				<code>{resetOnError.form.value}</code>
			</div>
			<div class="scenario">
				<b>reset: always · invalidate: all</b>
				<input bind:value={resetAlways.form.value} aria-label="Always-reset value" />
				<button onclick={() => resetAlways.submit()} disabled={resetAlways.submitting}>Submit valid</button>
				<code>{resetAlways.form.value}</code>
			</div>
		</div>
	</section>

	<section>
		<div class="section-heading">
			<div><span>07</span><h2>Accessors and replacement set</h2></div>
			<p>Exercises errorAt, getErrors, getIssues, and set with clearIfExists.</p>
		</div>
		<div class="actions">
			<button onclick={() => accessorOutput = f.errorAt(['options', 0, 'value'])}>errorAt nested path</button>
			<button onclick={() => accessorOutput = f.getErrors()}>getErrors()</button>
			<button onclick={() => accessorOutput = f.getIssues()}>getIssues()</button>
			<button onclick={() => accessorOutput = resetAlways.set({ value: 'replacement set' }, true)}>set(values, true)</button>
		</div>
		<pre>{JSON.stringify(accessorOutput, null, 2)}</pre>
	</section>

	<section>
		<div class="section-heading">
			<div><span>08</span><h2>Live state inspector</h2></div>
			<p>Confirms direct mutation, factory initial values, reactive properties, errors, and raw issues.</p>
		</div>
		<div class="status-grid">
			<div><b>form</b><pre>{JSON.stringify(f.form, null, 2)}</pre></div>
			<div><b>errors</b><pre>{JSON.stringify(f.errors, null, 2)}</pre></div>
			<div><b>issues</b><pre>{JSON.stringify(f.issues, null, 2)}</pre></div>
			<div><b>properties</b><pre>{JSON.stringify({ submitting: f.submitting, result: f.result, initialFactoryRuns: initialRun }, null, 2)}</pre></div>
		</div>
	</section>
</main>

<style>
	:global(*) { box-sizing: border-box; }
	:global(body) { margin: 0; background: #f5f5f2; color: #20221f; font-family: Inter, ui-sans-serif, system-ui, sans-serif; }
	main { width: min(1080px, calc(100% - 2rem)); margin: 0 auto; padding: 4rem 0 8rem; }
	.section-heading span { color: #6a6f65; font: 700 .75rem/1 monospace; letter-spacing: .12em; text-transform: uppercase; }
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
	.scenario-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1rem; }
	.scenario { display: grid; align-content: start; gap: .65rem; padding: 1rem; border: 1px solid #d9dbd4; }
	.scenario code { overflow-wrap: anywhere; color: #5167d8; }
	ol { padding-left: 1.25rem; font: .8rem/1.7 ui-monospace, monospace; }
	h3 { margin-top: 2rem; }
	@media (max-width: 650px) { .section-heading { display: block; } .section-heading p { margin-top: .75rem; } .array-row { grid-template-columns: 1fr; } .array-row small { grid-column: 1; } }
</style>
