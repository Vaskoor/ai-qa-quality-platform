import Ajv from 'ajv';
import type { GeneratedTestCase, GenerationResult } from './types.js';

const ajv = new Ajv({ allErrors: true, strict: false });

const testCaseSchema = {
  type: 'object',
  required: ['name', 'description', 'category', 'method', 'path', 'expectedStatus'],
  properties: {
    name: { type: 'string', minLength: 3 },
    description: { type: 'string' },
    category: {
      type: 'string',
      enum: ['happy-path', 'validation', 'auth', 'edge-case', 'error-handling', 'contract'],
    },
    method: { type: 'string' },
    path: { type: 'string' },
    pathParams: { type: 'object' },
    queryParams: { type: 'object' },
    headers: { type: 'object' },
    body: {},
    expectedStatus: {
      anyOf: [
        { type: 'number' },
        { type: 'array', items: { type: 'number' }, minItems: 1 },
      ],
    },
    assertions: { type: 'array', items: { type: 'string' } },
    tags: { type: 'array', items: { type: 'string' } },
  },
  additionalProperties: true,
};

const resultSchema = {
  type: 'object',
  required: ['cases'],
  properties: { cases: { type: 'array', items: testCaseSchema } },
};

const validateResult = ajv.compile(resultSchema);

export interface ValidationOutcome {
  valid: GeneratedTestCase[];
  invalid: { case: unknown; errors: string[] }[];
}

export function validateCases(
  payload: unknown,
  endpointId: string,
  method: string,
  path: string
): ValidationOutcome {
  const valid: GeneratedTestCase[] = [];
  const invalid: { case: unknown; errors: string[] }[] = [];

  if (!validateResult(payload)) {
    return {
      valid,
      invalid: [{ case: payload, errors: (validateResult.errors ?? []).map(String) }],
    };
  }

  for (const c of ((payload as unknown) as GenerationResult).cases) {
    const consistent =
      String(c.method).toUpperCase() === method.toUpperCase() && c.path === path;
    if (!consistent) {
      invalid.push({
        case: c,
        errors: [`method/path mismatch: expected ${method} ${path}, got ${c.method} ${c.path}`],
      });
      continue;
    }
    valid.push(c);
  }

  return { valid, invalid };
}

export function dedupeCases(cases: GeneratedTestCase[]): GeneratedTestCase[] {
  const seen = new Set<string>();
  const out: GeneratedTestCase[] = [];
  for (const c of cases) {
    const key = `${c.method}:${c.path}:${c.name}:${JSON.stringify(c.expectedStatus)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(c);
  }
  return out;
}