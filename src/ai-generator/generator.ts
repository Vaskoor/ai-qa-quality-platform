import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseOpenApi } from './openapi-parser.js';
import { createLlmClient, type ChatMessage, type LlmClient } from './llm-client.js';
import { SYSTEM_PROMPT, buildUserPrompt, extractJson } from './prompt.js';
import { validateCases, dedupeCases } from './validator.js';
import { emitPlaywrightSpec, emitContractFixture } from './codegen.js';
import { logger } from './logger.js';
import type { Endpoint, GeneratedTestCase } from './types.js';

export interface GenerateOptions {
  specPath: string;
  outDir: string;
  maxCasesPerEndpoint: number;
  endpointFilter?: string;
  concurrency?: number;
}

export interface GenerateSummary {
  endpoints: number;
  generated: number;
  invalid: number;
  files: string[];
}

export async function generateTests(opts: GenerateOptions): Promise<GenerateSummary> {
  const llm = createLlmClient();
  logger.info({ llm: llm.name, spec: opts.specPath }, 'Parsing OpenAPI spec');
  const endpoints = await parseOpenApi(opts.specPath);

  const filtered = opts.endpointFilter
    ? endpoints.filter(
        (e) =>
          e.path.includes(opts.endpointFilter!) ||
          e.method.toLowerCase() === opts.endpointFilter!.toLowerCase() ||
          e.id.includes(opts.endpointFilter!)
      )
    : endpoints;

  logger.info({ endpoints: filtered.length }, 'Endpoints to process');

  await mkdir(opts.outDir, { recursive: true });
  const fixturesDir = path.join(opts.outDir, '..', 'generated-fixtures');
  await mkdir(fixturesDir, { recursive: true });

  const files: string[] = [];
  let generated = 0;
  let invalid = 0;

  const concurrency = opts.concurrency ?? 3;
  const results = await mapWithConcurrency(filtered, concurrency, async (endpoint) => {
    try {
      const cases = await generateForEndpoint(endpoint, llm, opts.maxCasesPerEndpoint);
      return { endpoint, cases, error: undefined as string | undefined };
    } catch (err) {
      logger.error({ endpoint: endpoint.id, err: String(err) }, 'Generation failed');
      return { endpoint, cases: [] as GeneratedTestCase[], error: String(err) };
    }
  });

  for (const { endpoint, cases } of results) {
    if (cases.length === 0) continue;

    const specFile = path.join(opts.outDir, `${endpoint.id}.spec.ts`);
    await writeFile(specFile, emitPlaywrightSpec(endpoint.id, cases), 'utf8');
    files.push(specFile);

    const fixtureFile = path.join(fixturesDir, `${endpoint.id}.json`);
    await writeFile(fixtureFile, emitContractFixture(endpoint.id, cases), 'utf8');
    files.push(fixtureFile);

    generated += cases.length;
  }

  return { endpoints: filtered.length, generated, invalid, files };
}

async function generateForEndpoint(
  endpoint: Endpoint,
  llm: LlmClient,
  maxCases: number
): Promise<GeneratedTestCase[]> {
  const messages: ChatMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: buildUserPrompt(endpoint, maxCases) },
  ];

  logger.debug({ endpoint: endpoint.id }, 'Requesting test cases from LLM');
  const raw = await llm.complete(messages, { json: true, temperature: 0.2 });

  let payload: unknown;
  try {
    payload = extractJson(raw);
  } catch (err) {
    logger.warn({ endpoint: endpoint.id, err: String(err) }, 'Failed to parse LLM JSON');
    return [];
  }

  const { valid, invalid } = validateCases(payload, endpoint.id, endpoint.method, endpoint.path);
  if (invalid.length) {
    logger.warn({ endpoint: endpoint.id, invalid: invalid.length }, 'Discarded invalid cases');
  }

  const deduped = dedupeCases(valid).slice(0, maxCases);
  logger.info({ endpoint: endpoint.id, cases: deduped.length }, 'Generated cases');
  return deduped;
}

/** Simple bounded-concurrency map (no external deps). */
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const i = cursor++;
      results[i] = await fn(items[i], i);
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}