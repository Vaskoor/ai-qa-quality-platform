import SwaggerParser from '@apidevtools/swagger-parser';
import type { Endpoint, EndpointParam, EndpointRequestBody, EndpointResponse } from './types.js';

type JsonObject = Record<string, any>;

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'];

/**
 * Parses an OpenAPI/Swagger document (URL or file path) and normalizes every
 * operation into our internal `Endpoint` representation.
 */
export async function parseOpenApi(specPathOrUrl: string): Promise<Endpoint[]> {
  const api = (await SwaggerParser.dereference(specPathOrUrl)) as JsonObject;

  const paths: JsonObject = api.paths ?? {};
  const globalParams: EndpointParam[] = normalizeParams(api.components?.parameters);

  const endpoints: Endpoint[] = [];

  for (const [rawPath, pathItem] of Object.entries(paths)) {
    if (!pathItem) continue;
    const pathLevelParams = normalizeParams((pathItem as JsonObject).parameters);

    for (const method of HTTP_METHODS) {
      const op = (pathItem as JsonObject)[method] as JsonObject | undefined;
      if (!op) continue;

      const combinedParams = dedupeParams([
        ...globalParams,
        ...pathLevelParams,
        ...normalizeParams(op.parameters),
      ]);

      endpoints.push({
        id: `${method}__${slugify(rawPath)}`,
        method: method.toUpperCase(),
        path: rawPath,
        operationId: op.operationId,
        summary: op.summary,
        description: op.description,
        tags: Array.isArray(op.tags) ? op.tags : [],
        parameters: combinedParams,
        requestBody: normalizeRequestBody(op.requestBody),
        responses: normalizeResponses(op.responses),
      });
    }
  }

  return endpoints;
}

function slugify(p: string): string {
  return p
    .replace(/^\//, '')
    .replace(/[{}]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/_+/g, '_')
    .toLowerCase() || 'root';
}

function normalizeParams(params: any): EndpointParam[] {
  if (!Array.isArray(params)) return [];
  return params
    .filter((p) => p && (p.name || p.$ref))
    .map((p) => ({
      name: p.name,
      in: p.in ?? 'query',
      required: Boolean(p.required) || p.in === 'path',
      schema: p.schema,
      example: p.example ?? p.schema?.example,
      description: p.description,
    }));
}

function dedupeParams(params: EndpointParam[]): EndpointParam[] {
  const seen = new Set<string>();
  const out: EndpointParam[] = [];
  for (const p of params) {
    const key = `${p.in}:${p.name}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(p);
  }
  return out;
}

function normalizeRequestBody(body: any): EndpointRequestBody | undefined {
  if (!body) return undefined;
  const content: JsonObject = body.content ?? {};
  const [contentType, media] = Object.entries(content)[0] ?? ['application/json', {}];
  return {
    contentType,
    required: Boolean(body.required),
    schema: (media as JsonObject)?.schema,
    example: (media as JsonObject)?.example ?? (media as JsonObject)?.schema?.example,
  };
}

function normalizeResponses(responses: any): EndpointResponse[] {
  if (!responses) return [];
  return Object.entries(responses).map(([statusCode, res]: [string, any]) => {
    const content: JsonObject = res?.content ?? {};
    const [contentType, media] = Object.entries(content)[0] ?? [undefined, undefined];
    return {
      statusCode,
      description: res?.description,
      contentType: contentType as string | undefined,
      schema: (media as JsonObject)?.schema,
    };
  });
}

export function summarizeEndpoints(endpoints: Endpoint[]): string {
  return endpoints
    .map((e) => `  ${e.method.padEnd(6)} ${e.path}${e.summary ? `  — ${e.summary}` : ''}`)
    .join('\n');
}