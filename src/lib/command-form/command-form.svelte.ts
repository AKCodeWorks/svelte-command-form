/* eslint-disable @typescript-eslint/no-explicit-any */
import { isHttpError } from '@sveltejs/kit';
import { invalidate, invalidateAll } from '$app/navigation';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import type { HttpError } from '@sveltejs/kit';
import { issueAt, pathKeys, transformIssues } from '../helpers/transform-issues.js';
import type { CommandFormErrorPath, CommandFormErrors, CommandFormOptions } from '../types/command-form.types.js';
import { SchemaValidationError, standardValidate, type SchemaIssues } from '../helpers/standard-validate.js';

type SchemaInput<Schema extends StandardSchemaV1> = StandardSchemaV1.InferInput<Schema>;
type SchemaData<Schema extends StandardSchemaV1> = StandardSchemaV1.InferOutput<Schema>;

export class CommandForm<Schema extends StandardSchemaV1, TOut> {
  private schema: Schema;
  private options: CommandFormOptions<SchemaInput<Schema>, SchemaData<Schema>, TOut>;

  form = $state<Partial<SchemaInput<Schema>>>({});
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

    this.set(this.resolveInitial(), true);
  }

  private resolveInitial(): Partial<SchemaInput<Schema>> {
    const initial = this.options.initial;
    if (typeof initial === 'function') return initial();
    return initial ?? {};
  }

  private clearErrors(clearRawIssues = true) {
    for (const key in this.errors) delete (this.errors as any)[key];
    if (clearRawIssues) this.issues = null;
  }

  private setErrorsFromIssues(issues: SchemaIssues) {
    const transformed = transformIssues<SchemaInput<Schema>>(issues);
    this.clearErrors(false);
    this.issues = issues;
    Object.assign(this.errors, transformed);
  }

  private setErrorsFromRecord(record: Record<string, { message: string }>) {
    this.clearErrors();
    this.issues = null;
    for (const [key, val] of Object.entries(record)) {
      (this.errors as any)[key] = val;
    }
  }

  private async parseForm(
    data?: StandardSchemaV1.InferInput<Schema>
  ): Promise<SchemaData<Schema>> {
    const target = data ?? this.form;
    return standardValidate(this.schema, target);
  }

  addError = (error: { path: CommandFormErrorPath | PropertyKey, message: string }) => {
    const path = Array.isArray(error.path) ? error.path : [error.path];
    let node = this.errors as Record<PropertyKey, any>;
    for (const key of pathKeys(path)) node = (node[key] ??= {});
    node.message ??= error.message;
    node.messages = [...(node.messages ?? []), error.message];
  };

  errorAt = (path: CommandFormErrorPath | PropertyKey) =>
    issueAt(this.errors, Array.isArray(path) ? path : [path]);

  reset = () => {
    for (const key in this.form) delete (this.form as any)[key];
    Object.assign(this.form, this.resolveInitial());
  };

  set = (values: Partial<SchemaInput<Schema>>, clearIfExists = false) => {
    if (clearIfExists) {
      for (const key in this.form) delete (this.form as any)[key];
    }
    Object.assign(this.form, values);
    return this.form;
  };

  validate = async () => {
    try {
      await this.parseForm();
      this.errors = {} as CommandFormErrors<SchemaInput<Schema>>;
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

      const workingCopy = $state.snapshot(this.form)

      const preprocessed =
        (await this.options.preprocess?.(workingCopy)) ?? workingCopy;

      const input = preprocessed as SchemaInput<Schema>;
      const parsed = await this.parseForm(input);

      await this.options.onSubmit?.(parsed);

      const res = await this.options.command(input);

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
      this.options.onSettled?.(this._result || null)
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
