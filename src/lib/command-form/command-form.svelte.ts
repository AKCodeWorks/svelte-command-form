/* eslint-disable @typescript-eslint/no-explicit-any */
import { isHttpError } from '@sveltejs/kit';
import { invalidate, invalidateAll } from '$app/navigation';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import type { HttpError } from '@sveltejs/kit';
import { transformIssues } from '../helpers/transform-issues.js';
import type { CommandFormErrors, CommandFormOptions } from '../types/command-form.types.js';
import { SchemaValidationError, standardValidate, type SchemaIssues } from '../helpers/standard-validate.js';

type SchemaData<Schema extends StandardSchemaV1> = StandardSchemaV1.InferOutput<Schema>;

export class CommandForm<Schema extends StandardSchemaV1, TOut> {
  private schema: Schema;
  private options: CommandFormOptions<SchemaData<Schema>, TOut>;

  form = $state<Partial<SchemaData<Schema>>>({});
  errors = $state<CommandFormErrors<SchemaData<Schema>>>({});
  issues = $state<SchemaIssues | null>(null);
  private _submitting = $state(false);
  private _result = $state<Awaited<TOut> | null>(null);

  constructor(schema: Schema, options: CommandFormOptions<SchemaData<Schema>, TOut>) {
    this.schema = schema;
    this.options = options;

    this.set(this.resolveInitial(), true);
  }

  private resolveInitial(): Partial<SchemaData<Schema>> {
    const initial = this.options.initial;
    if (typeof initial === 'function') return initial();
    return initial ?? {};
  }

  private clearErrors(clearRawIssues = true) {
    for (const key in this.errors) delete (this.errors as any)[key];
    if (clearRawIssues) this.issues = null;
  }

  private setErrorsFromIssues(issues: SchemaIssues) {
    const transformed = transformIssues(issues);
    this.clearErrors(false);
    this.issues = issues;
    for (const [key, val] of Object.entries(transformed)) {
      (this.errors as any)[key] = val;
    }
  }

  private setErrorsFromRecord(record: Record<string, { message: string }>) {
    this.clearErrors();
    this.issues = null;
    for (const [key, val] of Object.entries(record)) {
      (this.errors as any)[key] = val;
    }
  }

  private async parseForm(): Promise<SchemaData<Schema>> {
    return standardValidate(this.schema, this.form as StandardSchemaV1.InferInput<Schema>);
  }

  // set path to keyof schema or string

  addError = (error: { path: string, message: string }) => {
    (this.errors as any)[error.path] = { message: error.message };
  }

  reset = () => {
    for (const key in this.form) delete (this.form as any)[key];
    Object.assign(this.form, this.resolveInitial());
  };

  set = (values: Partial<SchemaData<Schema>>, clearIfExists = false) => {
    if (clearIfExists) {
      for (const key in this.form) delete (this.form as any)[key];
    }
    Object.assign(this.form, values);
    return this.form;
  };

  validate = async () => {
    try {
      await this.parseForm();
      this.errors = {};
      this.issues = null;
    } catch (err: unknown) {
      if (err instanceof SchemaValidationError) {
        this.setErrorsFromIssues(err.issues);
      } else {
        throw err;
      }
    }
  };

  submit = async (): Promise<Awaited<TOut> | null> => {
    this._submitting = true;
    this.clearErrors();
    this._result = null;

    try {
      await this.options.preprocess?.(this.form)
      const parsed = await this.parseForm();
      await this.options.onSubmit?.(parsed);

      const res = await this.options.command(parsed);
      this._result = res;

      this.issues = null;
      await this.options.onSuccess?.(res);

      if (this.options.invalidate) {
        if (Array.isArray(this.options.invalidate)) {
          for (const inv of this.options.invalidate) await invalidate(inv);
        } else if (this.options.invalidate === 'all') {
          await invalidateAll();
        } else {
          await invalidate(this.options.invalidate);
        }
      }

      if (this.options.reset === 'onSuccess') this.reset();
      return res;
    } catch (err: unknown) {
      if (this.options.reset === 'onError') this.reset();

      if (err instanceof SchemaValidationError) {
        this.setErrorsFromIssues(err.issues);
        await this.options.onError?.(err);
        return null;
      }



      if (isHttpError(err)) {
        const httpError = err as HttpError & { body: any };
        if (Array.isArray(httpError.body?.issues) && httpError.body.issues.every((i: any) => 'path' in i && 'message' in i)) {
          this.setErrorsFromIssues(httpError.body.issues);
          await this.options.onError?.(err);
          return null;
        }
        const transformed = httpError.body.issues;
        if (transformed) {
          this.setErrorsFromRecord(transformed);
        }
      }

      await this.options.onError?.(err);
      return null;
    } finally {
      this._submitting = false;
      if (this.options.reset === 'always') this.reset();
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
