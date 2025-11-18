import type { RemoteCommand } from "@sveltejs/kit";
interface RemoteFunctionIssue {
  readonly message: string;
}
type CommandFormErrors<TIn> = {
  [K in keyof TIn]?: RemoteFunctionIssue;
};

type CommandFormOptions<TIn, TOut> = {
  initial?: Partial<TIn> | (() => Partial<TIn>);
  invalidate?: string | string[] | 'all';
  command: RemoteCommand<TIn, TOut>;
  reset?: 'onSuccess' | 'always' | 'onError';
  preprocess?: (data: TIn) => Promise<TIn> | TIn;
  onSubmit?: (data: TIn) => Promise<void> | void;
  onSuccess?: (result: Awaited<TOut>) => Promise<void> | void;
  onError?: (err: unknown) => Promise<void> | void;
};

export { type CommandFormOptions, type CommandFormErrors, type RemoteCommand, type RemoteFunctionIssue };
