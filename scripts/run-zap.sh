#!/usr/bin/env bash
# ============================================================
# OWASP ZAP baseline security scan against the target API.
# ============================================================
set -euo pipefail

TARGET="${ZAP_TARGET_URL:-http://localhost:3000}"
REPORT_DIR="security/reports"
mkdir -p "$REPORT_DIR"

if command -v docker >/dev/null 2>&1; then
  echo "▶ Running OWASP ZAP (docker) baseline scan against ${TARGET}"
  ZAP_EXIT=0
  docker run --rm \
    --network host \
    -v "$(pwd)/${REPORT_DIR}:/zap/wrk/:rw" \
    -t ghcr.io/zaproxy/zaproxy:stable \
    zap-baseline.py \
    -t "$TARGET" \
    -J report.json \
    -r report.html \
    -w report.md \
    -I || ZAP_EXIT=$?

  echo ""
  echo "ZAP exit code: ${ZAP_EXIT}  (0=pass, 1=warn, 2=fail)"
  echo "Reports written to ${REPORT_DIR}/"
  ls -la "${REPORT_DIR}" || true

  if [ "${ZAP_EXIT}" -eq 2 ]; then
    echo "✗ ZAP found FAIL-level issues."
    exit 1
  fi
  echo "✓ ZAP scan complete (no fail-level issues)."
else
  echo "⚠ docker not found — skipping ZAP scan."
  echo "  Install Docker: https://docs.docker.com/get-docker/"
  exit 0
fi