import { isHttpError } from '@sveltejs/kit';
import { invalidate, invalidateAll } from '$app/navigation';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import { issueAt, pathKeys, transformIssues } from '../helpers/transform-issues.js';
import type {
  CommandFormErrorPath,
  CommandFormErrors,
  CommandFormOptions,
  CommandFormState
} from '../types/command-form.types.js';
import {
  isSchemaIssues,
  SchemaValidationError,
  standardValidate,
  type SchemaIssues
} from '../helpers/standard-validate.js';

type SchemaInput<Schema extends StandardSchemaV1> = StandardSchemaV1.InferInput<Schema>;
type SchemaData<Schema extends StandardSchemaV1> = StandardSchemaV1.InferOutput<Schema>;

function isRecord(value: unknown): value is Record<PropertyKey, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validationIssuesFrom(error: unknown): SchemaIssues | null {
  if (error instanceof SchemaValidationError) return error.issues;
  if (!isHttpError(error) || !isRecord(error.body) || !('issues' in error.body)) return null;
  return isSchemaIssues(error.body.issues) ? error.body.issues : null;
}

export class CommandForm<Schema extends StandardSchemaV1, TOut> {
  private schema: Schema;
  private options: CommandFormOptions<SchemaInput<Schema>, SchemaData<Schema>, TOut>;
  private _submission: Promise<Awaited<TOut> | null> | null = null;

  form = $state<CommandFormState<SchemaInput<Schema>>>({} as CommandFormState<SchemaInput<Schema>>);
  errors = $state<CommandFormErrors<SchemaInput<Schema>>>({} as CommandFormErrors<SchemaInput<Schema>>);
  issues = $state<SchemaIssues | null>(null);
  private _submitting = $state(false);
  private _result = $state<Awaited<TOut> | null>(null);

  constructor(
    schema: Schema,
    options: CommandFormOptions<
      SchemaInput<NoInfer<Schema>>,
      SchemaData<NoInfer<Schema>>,
      TOut
    >
  ) {
    this.schema = schema;
    this.options = options;
    this.form = this.resolveInitial();
  }

  private resolveInitial(): CommandFormState<SchemaInput<Schema>> {
    const initial = this.options.initial;
    if (typeof initial === 'function') return initial();
    return (initial ?? {}) as CommandFormState<SchemaInput<Schema>>;
  }

  private clearErrors(clearRawIssues = true) {
    this.errors = {} as CommandFormErrors<SchemaInput<Schema>>;
    if (clearRawIssues) this.issues = null;
  }

  private setErrorsFromIssues(issues: SchemaIssues) {
    this.errors = transformIssues<SchemaInput<Schema>>(issues);
    this.issues = issues;
  }

  private parseForm(data: SchemaInput<Schema>): Promise<SchemaData<Schema>> {
    return standardValidate(this.schema, data);
  }

  addError = (error: { path: CommandFormErrorPath | PropertyKey; message: string }) => {
    const path = Array.isArray(error.path) ? error.path : [error.path];
    let node = this.errors as Record<PropertyKey, unknown>;
    for (const key of pathKeys(path)) {
      const child = node[key];
      if (!isRecord(child)) node[key] = {};
      node = node[key] as Record<PropertyKey, unknown>;
    }
    node.message ??= error.message;
    node.messages = Array.isArray(node.messages)
      ? [...node.messages, error.message]
      : [error.message];
  };

  errorAt = (path: CommandFormErrorPath | PropertyKey) =>
    issueAt(this.errors, Array.isArray(path) ? path : [path]);

  reset = () => {
    this.form = this.resolveInitial();
    return this.form;
  };

  set = (values: CommandFormState<SchemaInput<Schema>>, clearIfExists = false) => {
    if (!clearIfExists && isRecord(this.form) && isRecord(values)) {
      Object.assign(this.form, values);
    } else {
      this.form = values;
    }
    return this.form;
  };

  validate = async (): Promise<boolean> => {
    try {
      await this.parseForm(this.form as SchemaInput<Schema>);
      this.clearErrors();
      return true;
    } catch (error: unknown) {
      const issues = validationIssuesFrom(error);
      if (!issues) throw error;
      this.setErrorsFromIssues(issues);
      return false;
    }
  };

  private performSubmit = async (): Promise<Awaited<TOut> | null> => {
    this._submitting = true;
    this.clearErrors();
    this._result = null;

    try {
      const workingCopy = $state.snapshot(this.form) as CommandFormState<SchemaInput<Schema>>;
      const input = (await this.options.preprocess?.(workingCopy)) ?? workingCopy;
      const parsed = await this.parseForm(input as SchemaInput<Schema>);

      await this.options.onSubmit?.(parsed);
      const result = await this.options.command(input as SchemaInput<Schema>);
      this._result = result;
      await this.options.onSuccess?.(result);

      if (this.options.invalidate) {
        if (Array.isArray(this.options.invalidate)) {
          for (const dependency of this.options.invalidate) await invalidate(dependency);
        } else if (this.options.invalidate === 'all') {
          await invalidateAll();
        } else {
          await invalidate(this.options.invalidate);
        }
      }

      if (this.options.reset === 'onSuccess') this.reset();
      return result;
    } catch (error: unknown) {
      if (this.options.reset === 'onError') this.reset();

      const issues = validationIssuesFrom(error);
      if (issues) {
        this.setErrorsFromIssues(issues);
        await this.options.onError?.(error);
        return null;
      }

      await this.options.onError?.(error);
      throw error;
    } finally {
      if (this.options.reset === 'always') this.reset();
      try {
        await this.options.onSettled?.(this._result);
      } finally {
        this._submitting = false;
      }
    }
  };

  submit = async (): Promise<Awaited<TOut> | null> => {
    if (this._submission) return this._submission;

    const submission = this.performSubmit();
    this._submission = submission;
    try {
      return await submission;
    } finally {
      if (this._submission === submission) this._submission = null;
    }
  };

  get submitting() {
    return this._submitting;
  }

  get result() {
    return this._result;
  }

  getErrors() {
    return this.errors;
  }

  getIssues() {
    return this.issues;
  }
}
