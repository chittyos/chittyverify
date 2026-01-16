#!/bin/bash
set -euo pipefail
echo "=== chittyverify Onboarding ==="
curl -s -X POST "${GETCHITTY_ENDPOINT:-https://get.chitty.cc/api/onboard}" \
  -H "Content-Type: application/json" \
  -d '{"service_name":"chittyverify","organization":"CHITTYFOUNDATION","type":"foundation","tier":1,"domains":["verify.chitty.cc"]}' | jq .
