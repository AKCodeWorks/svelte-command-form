import type { StandardSchemaV1 } from '@standard-schema/spec';
import type { RemoteFunctionIssue } from '../types/command-form.types.js';

function transformIssues(
  issues?: ReadonlyArray<StandardSchemaV1.Issue>
): Record<string, RemoteFunctionIssue> {
  const transformed: Record<string, RemoteFunctionIssue> = {};
  if (!issues?.length) return transformed;
  for (const issue of issues) {
    transformed[issue?.path?.join('.') || ''] = {
      message: issue.message
    };
  }
  return transformed;
}

export { transformIssues };
