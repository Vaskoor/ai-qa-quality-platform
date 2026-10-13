#!/usr/bin/env bash
# ============================================================
# Orchestrates the full QA pipeline locally:
#   generate -> api/generated/contract/ui/visual -> perf -> security
# ============================================================
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

BOLD="\033[1m"; GREEN="\033[32m"; RED="\033[31m"; CYAN="\033[36m"; RESET="\033[0m"
FAILED=0

step()  { echo -e "\n${BOLD}${CYAN}▶ $1${RESET}"; }
ok()    { echo -e "${GREEN}✓ $1${RESET}"; }
fail()  { echo -e "${RED}✗ $1${RESET}"; FAILED=1; }

if [ ! -d node_modules ]; then
  step "Installing dependencies"
  npm install || { fail "npm install"; exit 1; }
fi

step "1/6  AI test generation from OpenAPI spec"
npm run generate:tests && ok "test generation" || fail "test generation"

step "2/6  Playwright: api + generated + contract + ui"
npx playwright test --project=api --project=generated --project=contract --project=ui \
  && ok "functional + contract + ui tests" || fail "functional tests"

step "3/6  Visual regression"
npx playwright test --project=visual \
  && ok "visual tests" || fail "visual tests"

step "4/6  Performance (k6)"
if command -v k6 >/dev/null 2>&1; then
  npm run test:perf && ok "performance thresholds" || fail "performance"
else
  echo "⚠ k6 not installed — skipping (brew install k6)"
fi

step "5/6  Security (OWASP ZAP)"
bash scripts/run-zap.sh && ok "security scan" || fail "security"

step "6/6  Summary"
echo "HTML report: playwright-report/index.html"

if [ "$FAILED" -eq 0 ]; then
  echo -e "\n${GREEN}${BOLD}✅ All QA stages passed.${RESET}\n"
  exit 0
else
  echo -e "\n${RED}${BOLD}❌ One or more QA stages failed.${RESET}\n"
  exit 1
fi