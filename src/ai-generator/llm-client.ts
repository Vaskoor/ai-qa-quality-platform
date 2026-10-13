import OpenAI from 'openai';
import { logger } from './logger.js';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LlmClient {
  complete(messages: ChatMessage[], opts?: { json?: boolean; temperature?: number }): Promise<string>;
  readonly name: string;
}

class OpenAiClient implements LlmClient {
  readonly name: string;
  private client: OpenAI;
  private model: string;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error(
        'OPENAI_API_KEY is not set. Set it in .env, or set QA_USE_MOCK_LLM=true for offline generation.'
      );
    }
    this.client = new OpenAI({
      apiKey,
      baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    });
    this.model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    this.name = `openai:${this.model}`;
  }

  async complete(
    messages: ChatMessage[],
    opts: { json?: boolean; temperature?: number } = {}
  ): Promise<string> {
    const res = await this.client.chat.completions.create({
      model: this.model,
      messages: messages as any,
      temperature: opts.temperature ?? 0.2,
      response_format: opts.json ? { type: 'json_object' } : undefined,
    });
    return res.choices[0]?.message?.content ?? '';
  }
}

class MockClient implements LlmClient {
  readonly name = 'mock:deterministic';

  async complete(messages: ChatMessage[]): Promise<string> {
    const last = messages[messages.length - 1]?.content ?? '';
    const match = last.match(/<<<ENDPOINT>>>([\s\S]*?)<<<END>>>/);
    if (!match) {
      logger.warn('MockClient received no endpoint block; returning empty cases');
      return JSON.stringify({ cases: [] });
    }
    const endpoint = JSON.parse(match[1]);
    return JSON.stringify({ cases: heuristicCases(endpoint) });
  }
}

function heuristicCases(endpoint: any): any[] {
  const cases: any[] = [];
  const method = String(endpoint.method).toUpperCase();
  const path = endpoint.path;
  const successStatus = method === 'POST' ? 201 : method === 'DELETE' ? 204 : 200;
  const hasPathParam = (endpoint.parameters ?? []).some((p: any) => p.in === 'path');

  // 1. Happy path
  cases.push({
    name: `${method} ${path} — happy path`,
    description: `Verifies ${path} returns a success status for a valid request.`,
    category: 'happy-path',
    method,
    path,
    pathParams: samplePathParams(endpoint),
    queryParams: sampleQueryParams(endpoint, true),
    headers: { 'Content-Type': 'application/json' },
    body: sampleBody(endpoint),
    expectedStatus: [successStatus, 200, 201, 202, 204],
    assertions: ['response time < 2000ms', 'content-type is JSON when body present'],
    tags: endpoint.tags ?? [],
  });

  // 2. Validation: missing required query params (path params are required
  //    by definition; a missing path segment usually surfaces as 404, which
  //    we cover as a separate "not found" case below).
  const requiredQuery = (endpoint.parameters ?? []).filter(
    (p: any) => p.required && p.in === 'query'
  );
  for (const p of requiredQuery.slice(0, 2)) {
    const qp = sampleQueryParams(endpoint, true);
    delete qp[p.name];
    cases.push({
      name: `${method} ${path} — missing required query param '${p.name}'`,
      description: `Expects 4xx when required query parameter '${p.name}' is absent.`,
      category: 'validation',
      method,
      path,
      pathParams: samplePathParams(endpoint),
      queryParams: qp,
      headers: { 'Content-Type': 'application/json' },
      body: sampleBody(endpoint),
      expectedStatus: [400, 404, 422],
      assertions: ['server rejects the request without 5xx'],
      tags: [...(endpoint.tags ?? []), 'negative'],
    });
  }

  // 3. Malformed body for write methods
  if (['POST', 'PUT', 'PATCH'].includes(method)) {
    cases.push({
      name: `${method} ${path} — malformed JSON body`,
      description: 'Expects a 4xx when the body is syntactically invalid.',
      category: 'error-handling',
      method,
      path,
      pathParams: samplePathParams(endpoint),
      queryParams: sampleQueryParams(endpoint, true),
      headers: { 'Content-Type': 'application/json' },
      body: [], // valid JSON but wrong shape (not an object) -> 400
      expectedStatus: [400, 404, 415, 422],
      assertions: ['server does not 500 on malformed input'],
      tags: [...(endpoint.tags ?? []), 'negative'],
    });
  }

  // 4. Auth negative (only if spec hints at security)
  if (endpoint.security || endpoint.requiresAuth) {
    cases.push({
      name: `${method} ${path} — unauthorized without token`,
      description: 'Expects 401/403 when no credentials are provided.',
      category: 'auth',
      method,
      path,
      pathParams: samplePathParams(endpoint),
      queryParams: sampleQueryParams(endpoint, true),
      headers: { 'Content-Type': 'application/json' },
      body: sampleBody(endpoint),
      expectedStatus: [401, 403],
      assertions: ['WWW-Authenticate header present or error code returned'],
      tags: [...(endpoint.tags ?? []), 'security'],
    });
  }

  // 5. Not found for GET with a path param
  if (hasPathParam && method === 'GET') {
    cases.push({
      name: `${method} ${path} — unknown resource id`,
      description: 'Expects 404 for a well-formed but non-existent id.',
      category: 'edge-case',
      method,
      path,
      pathParams: { ...samplePathParams(endpoint), ...overrideFirstPathParam(endpoint) },
      queryParams: sampleQueryParams(endpoint, true),
      headers: { 'Content-Type': 'application/json' },
      expectedStatus: [404],
      assertions: ['error body present'],
      tags: [...(endpoint.tags ?? []), 'negative'],
    });
  }

  return cases;
}

function samplePathParams(endpoint: any): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const p of endpoint.parameters ?? []) {
    if (p.in === 'path') out[p.name] = p.example ?? sampleForType(p.schema);
  }
  return out;
}

function overrideFirstPathParam(endpoint: any): Record<string, unknown> {
  for (const p of endpoint.parameters ?? []) {
    if (p.in === 'path') return { [p.name]: '999999999' };
  }
  return {};
}

function sampleQueryParams(endpoint: any, onlyRequired: boolean): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const p of endpoint.parameters ?? []) {
    if (p.in !== 'query') continue;
    if (onlyRequired && !p.required) continue;
    out[p.name] = p.example ?? sampleForType(p.schema);
  }
  return out;
}

function sampleBody(endpoint: any): unknown {
  if (!endpoint.requestBody) return undefined;
  if (endpoint.requestBody.example) return endpoint.requestBody.example;
  return sampleForType(endpoint.requestBody.schema);
}

function sampleForType(schema: any): unknown {
  if (!schema) return 'sample';
  if (schema.example !== undefined) return schema.example;
  if (schema.enum?.length) return schema.enum[0];
  switch (schema.type) {
    case 'integer':
    case 'number':
      return schema.minimum ?? 1;
    case 'boolean':
      return true;
    case 'array':
      return [sampleForType(schema.items)];
    case 'object':
      return sampleObject(schema);
    case 'string':
      if (schema.format === 'date-time') return new Date().toISOString();
      if (schema.format === 'uuid') return '00000000-0000-0000-0000-000000000000';
      if (schema.format === 'email') return 'qa@example.com';
      return schema.minLength ? 'a'.repeat(schema.minLength) : 'sample';
    default:
      return 'sample';
  }
}

function sampleObject(schema: any): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  const required: string[] = schema.required ?? [];
  const props = schema.properties ?? {};
  for (const [key, val] of Object.entries(props)) {
    if (required.length && !required.includes(key)) continue;
    obj[key] = sampleForType(val);
  }
  return obj;
}

export function createLlmClient(): LlmClient {
  const useMock = String(process.env.QA_USE_MOCK_LLM).toLowerCase() === 'true';
  if (useMock || !process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.startsWith('sk-your')) {
    logger.warn('Using deterministic MOCK LLM client (no real API key configured).');
    return new MockClient();
  }
  return new OpenAiClient();
}