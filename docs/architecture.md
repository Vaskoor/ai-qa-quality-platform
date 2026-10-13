# Architecture

## Overview

The platform is a **quality pipeline** composed of independent stages that all
consume the same system under test (the demo API + its OpenAPI spec).

## Data flow

1. **Ingest** — `src/ai-generator/openapi-parser.ts` dereferences the OpenAPI doc
   and normalizes each operation into an `Endpoint`.
2. **Reason** — `llm-client.ts` sends the endpoint to an OpenAI-compatible model
   (or the deterministic mock) with a strict JSON contract.
3. **Validate** — `validator.ts` uses Ajv to reject malformed or inconsistent
   cases (e.g. method/path mismatch).
4. **Emit** — `codegen.ts` writes runnable Playwright specs + JSON fixtures.
5. **Execute** — Playwright runs API/generated/contract/ui/visual projects.
6. **Stress** — k6 applies load and enforces p95/p99 + error-rate thresholds.
7. **Harden** — OWASP ZAP baseline scan flags common vulnerabilities.
8. **Observe** — the API exposes Prometheus metrics scraped by Prometheus and
   visualised in Grafana.
9. **Gate** — GitHub Actions aggregates job results into a single quality gate.

## Design decisions

- **Offline-first AI**: a deterministic mock LLM means CI and demos never depend
  on a paid API or network flakiness, while a real key upgrades quality transparently.
- **Schema-validated generation**: LLM output is untrusted input — every case is
  validated before it can become a test.
- **Self-contained system under test**: the demo API ships in-repo so the whole
  pipeline runs with `npm install && npm run qa:full`.
- **Thresholds as code**: perf and security pass/fail criteria live in the repo.

## Extending

- Point `OPENAPI_SPEC_PATH` at any real spec (file or URL).
- Add Playwright projects for new layers in `playwright.config.ts`.
- Add Prometheus scrape targets in `observability/prometheus/prometheus.yml`.