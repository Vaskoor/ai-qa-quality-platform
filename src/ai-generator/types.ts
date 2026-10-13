/**
 * Shared types for the AI test-generation pipeline.
 */

export interface EndpointParam {
  name: string;
  in: 'path' | 'query' | 'header' | 'cookie';
  required: boolean;
  schema?: Record<string, unknown>;
  example?: unknown;
  description?: string;
}

export interface EndpointRequestBody {
  contentType: string;
  required: boolean;
  schema?: Record<string, unknown>;
  example?: unknown;
}

export interface EndpointResponse {
  statusCode: string;
  description?: string;
  contentType?: string;
  schema?: Record<string, unknown>;
}

/** A normalized representation of one OpenAPI operation. */
export interface Endpoint {
  id: string;
  method: string;
  path: string;
  operationId?: string;
  summary?: string;
  description?: string;
  tags: string[];
  parameters: EndpointParam[];
  requestBody?: EndpointRequestBody;
  responses: EndpointResponse[];
}

/** A single AI-generated test case (validated against this schema). */
export interface GeneratedTestCase {
  name: string;
  description: string;
  category:
    | 'happy-path'
    | 'validation'
    | 'auth'
    | 'edge-case'
    | 'error-handling'
    | 'contract';
  method: string;
  path: string;
  pathParams?: Record<string, unknown>;
  queryParams?: Record<string, unknown>;
  headers?: Record<string, string>;
  body?: unknown;
  expectedStatus: number | number[];
  assertions?: string[];
  tags?: string[];
}

export interface GenerationResult {
  endpointId: string;
  method: string;
  path: string;
  cases: GeneratedTestCase[];
}