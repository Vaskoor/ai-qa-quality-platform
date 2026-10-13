import type { Endpoint } from './types.js';

export const SYSTEM_PROMPT = `You are a senior QA automation engineer specialising in API testing.
You are given ONE OpenAPI endpoint definition. Produce a JSON object of high-quality, runnable test cases.

RULES:
- Output ONLY valid JSON matching this shape: { "cases": TestCase[] }.
- Each TestCase MUST include: name, description, category, method, path, expectedStatus.
- category MUST be one of: happy-path, validation, auth, edge-case, error-handling, contract.
- method/path MUST exactly match the given endpoint.
- expectedStatus MUST be a number or array of numbers.
- Use realistic sample values. For path params, always supply values in "pathParams".
- Include at least one happy-path, and where applicable: validation, auth, edge-case tests.
- Keep each test case independent and idempotent where possible.
- Do NOT wrap the JSON in markdown fences.
- Do NOT invent endpoints that were not given.`;

export function buildUserPrompt(endpoint: Endpoint, maxCases: number): string {
  const trimmed = {
    id: endpoint.id,
    method: endpoint.method,
    path: endpoint.path,
    summary: endpoint.summary,
    description: endpoint.description,
    tags: endpoint.tags,
    parameters: endpoint.parameters,
    requestBody: endpoint.requestBody,
    responses: endpoint.responses,
    security: (endpoint as any).security,
    requiresAuth: (endpoint as any).requiresAuth,
  };

  return `Generate at most ${maxCases} test cases for the following endpoint.
Return JSON of the form { "cases": [...] }.

<<<ENDPOINT>>>
${JSON.stringify(trimmed, null, 2)}
<<<END>>>`;
}

export function extractJson(raw: string): unknown {
  let text = raw.trim();
  text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('No JSON object found in LLM response');
  }
  return JSON.parse(text.slice(start, end + 1));
}