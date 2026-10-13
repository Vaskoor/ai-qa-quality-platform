# 🤖 AI-Powered QA Quality Platform

> An end-to-end quality platform that uses **AI to generate API tests from OpenAPI specs**, then runs them alongside **UI, contract, visual, performance, and security** checks — all wired into **CI/CD** with **Grafana + Prometheus** observability.

![QA Pipeline](https://github.com/Vaskoor/ai-qa-quality-platform/actions/workflows/qa-pipeline.yml/badge.svg)

---

## ✨ What it does

| Layer | Tool | Purpose |
|-------|------|---------|
| 🧠 **AI Test Generation** | OpenAI / mock LLM | Parses an OpenAPI spec and generates Playwright API test cases per endpoint |
| 🌐 **UI Testing** | Playwright | Drives the QA dashboard in a real browser |
| 🔌 **API Testing** | Playwright `request` | Functional endpoint coverage |
| 📜 **Contract Testing** | Ajv + OpenAPI | Validates live responses against the spec schema |
| 👁 **Visual Regression** | Playwright screenshots | Pixel-diff detection on the dashboard |
| ⚡ **Performance** | k6 | Load test with p95/p99 thresholds that gate CI |
| 🔒 **Security** | OWASP ZAP | Automated baseline vulnerability scan |
| 📊 **Observability** | Prometheus + Grafana | Live metrics, latency, error-rate dashboards |
| 🚀 **CI/CD** | GitHub Actions | Full pipeline + quality gate on every push |

---

## 🏗 Architecture

```
┌────────────────┐     ┌───────────────────┐     ┌─────────────────────┐
│ OpenAPI Spec   │────▶│ AI Test Generator │────▶│ Generated Playwright│
│ (petstore.json)│     │ (LLM + validator) │     │ API specs           │
└────────────────┘     └───────────────────┘     └──────────┬──────────┘
                                                             │
         ┌───────────────────────────────────────────────────┼────────────────────────────┐
         ▼                    ▼                  ▼            ▼            ▼
   ┌──────────┐        ┌──────────┐       ┌──────────┐  ┌──────────┐ ┌──────────┐
   │ API tests│        │ UI tests │       │ Contract │  │ Visual   │ │ k6 Perf  │
   └──────────┘        └──────────┘       └──────────┘  └──────────┘ └──────────┘
         │                    │                  │            │            │
         └────────────────────┴────────┬─────────┴────────────┴────────────┘
                                       ▼
                             ┌──────────────────┐     ┌──────────────┐
                             │ Quality Gate     │────▶│ Prometheus + │
                             │ (CI pass/fail)   │     │ Grafana      │
                             └──────────────────┘     └──────────────┘
                                       ▲
                             ┌─────────┴──────────┐
                             │ OWASP ZAP Security │
                             └────────────────────┘
```

---

## 🚀 Quick start

```bash
# 1. Install
npm install
npx playwright install chromium

# 2. Configure (optional — works offline with a deterministic mock LLM by default)
cp .env.example .env
#   → set OPENAI_API_KEY to use a real LLM
#   → or leave QA_USE_MOCK_LLM=true for offline generation

# 3. Start the demo API (system under test)
npm run demo:server

# 4. Generate tests from the OpenAPI spec with AI
npm run generate:tests

# 5. Run everything
npm run qa:full
```

Open the dashboard at <http://localhost:3000/ui> and the OpenAPI spec at
<http://localhost:3000/openapi.json>.

---

## 🧠 AI test generation

```bash
# Real LLM (needs OPENAI_API_KEY)
QA_USE_MOCK_LLM=false npm run generate:tests

# Deterministic offline generation (no API key)
QA_USE_MOCK_LLM=true npm run generate:tests

# Inspect the endpoints discovered in the spec
npx tsx src/ai-generator/cli.ts inspect --spec ./specs/petstore-openapi.json

# Filter to one endpoint/method
npm run generate:tests -- --filter post
```

The generator:
1. Parses/dereferences the OpenAPI document (`swagger-parser`).
2. Normalizes every operation into a typed `Endpoint`.
3. Prompts an OpenAI-compatible LLM for structured JSON test cases.
4. **Validates** the LLM output with Ajv and rejects malformed/mismatched cases.
5. Emits runnable Playwright specs into `tests/generated/`.

---

## 📊 Observability

```bash
npm run observability:up      # Prometheus :9090, Grafana :3001 (admin/admin)
npm run demo:server           # API exposes /metrics
# open Grafana → QA → "QA Platform — API Overview"
npm run observability:down
```

---

## 🧪 Test commands

| Command | Description |
|---------|-------------|
| `npm run test:api` | Core API tests |
| `npm run test:ui` | Browser UI tests |
| `npm run test:contract` | OpenAPI schema contract tests |
| `npm run test:visual` | Visual regression |
| `npm run test:perf` | k6 load test with thresholds |
| `npm run test:security` | OWASP ZAP baseline scan |
| `npm run qa:full` | Full local pipeline |

---

## 🔁 CI/CD

`.github/workflows/qa-pipeline.yml` runs five jobs — **generate-and-test**, **visual**,
**performance**, **security** — and a final **quality-gate** job that fails the build
unless the critical stages pass. Reports (Playwright, k6, ZAP) are uploaded as artifacts.

---

## 🗂 Project layout

```
ai-qa-quality-platform/
├── src/
│   ├── ai-generator/     # OpenAPI parsing, LLM client, validation, codegen, CLI
│   └── api/              # Demo API under test + /ui dashboard + /metrics
├── tests/
│   ├── api/              # Hand-written functional API tests
│   ├── contract/         # Ajv schema contract tests
│   ├── ui/               # Playwright browser tests
│   ├── visual/           # Visual regression tests
│   └── generated/        # AI-generated specs (gitignored)
├── perf/                 # k6 load test + thresholds
├── security/             # ZAP rules + reports
├── observability/        # Prometheus + Grafana + docker-compose
├── specs/                # OpenAPI documents
├── scripts/              # Pipeline + scan scripts
└── .github/workflows/    # CI/CD
```

---

## 🛠 Tech stack

**TypeScript · Node.js · Playwright · OpenAI API · Ajv · k6 · OWASP ZAP · Prometheus · Grafana · Docker · GitHub Actions**

---

## 📄 License

MIT