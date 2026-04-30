#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@taskflow.local}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-Admin1234!}"
SMOKE_TS="$(date +%s)"

json_get() {
  node -e "const fs=require('fs');const p=process.argv[1];const f=process.argv[2];const j=JSON.parse(fs.readFileSync(f,'utf8')); const v=p.split('.').reduce((o,k)=>o&&o[k],j); process.stdout.write(String(v??''));" "$1" "$2"
}

request() {
  local name="$1"; shift
  local out="/tmp/${name}.json"
  local code
  code=$(curl -sS -o "$out" -w '%{http_code}' "$@")
  echo "$name -> HTTP $code" >&2
  echo "$code"
}

signin_code=$(request signin -X POST "$BASE_URL/auth/signin" -H 'Content-Type: application/json' -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")
if [[ "$signin_code" -ge 500 ]]; then
  echo "Signin returned server error"
  exit 1
fi

TOKEN=$(json_get token /tmp/signin.json)
USER_ID=$(json_get user.id /tmp/signin.json)
BUSINESS_ID=$(json_get user.businessId /tmp/signin.json)
TENANT_ID=$(json_get user.tenantId /tmp/signin.json)
ROLE=$(json_get user.role /tmp/signin.json)

if [[ -z "$TOKEN" ]]; then
  echo "No JWT token from signin"
  exit 1
fi

if [[ -z "$BUSINESS_ID" ]]; then
  list_code=$(request businesses_all -X GET "$BASE_URL/businesses/all" -H "Authorization: Bearer $TOKEN" -H "x-tenant-id: $TENANT_ID" -H "x-user-id: $USER_ID" -H "x-user-role: $ROLE")
  if [[ "$list_code" -ge 500 ]]; then
    echo "businesses/all returned server error"
    exit 1
  fi
  BUSINESS_ID=$(node -e "const fs=require('fs');const j=JSON.parse(fs.readFileSync('/tmp/businesses_all.json','utf8'));process.stdout.write(String(Array.isArray(j)&&j[0]?j[0].id:''));")
fi

CLIENT_ID=""
if [[ -n "$BUSINESS_ID" ]]; then
  create_client_code=$(request smoke_client_create -X POST "$BASE_URL/clients" \
    -H "Authorization: Bearer $TOKEN" \
    -H "x-tenant-id: $TENANT_ID" \
    -H "x-business-id: $BUSINESS_ID" \
    -H "x-user-id: $USER_ID" \
    -H "x-user-role: $ROLE" \
    -H 'Content-Type: application/json' \
    -d "{\"businessId\":\"$BUSINESS_ID\",\"assignedUserId\":\"$USER_ID\",\"name\":\"Smoke Client\",\"email\":\"smoke.client.$SMOKE_TS@taskflow.local\"}")
  if [[ "$create_client_code" -lt 500 ]]; then
    CLIENT_ID=$(json_get id /tmp/smoke_client_create.json)
  fi
fi

if [[ -z "$CLIENT_ID" ]]; then
  clients_code=$(request clients_by_business -X GET "$BASE_URL/clients/by-business/$BUSINESS_ID" -H "Authorization: Bearer $TOKEN" -H "x-tenant-id: $TENANT_ID" -H "x-user-id: $USER_ID" -H "x-user-role: $ROLE" -H "x-employee-user-id: $USER_ID")
  if [[ "$clients_code" -ge 500 ]]; then
    echo "clients/by-business returned server error"
    exit 1
  fi
  CLIENT_ID=$(node -e "const fs=require('fs');const j=JSON.parse(fs.readFileSync('/tmp/clients_by_business.json','utf8'));process.stdout.write(String(Array.isArray(j)&&j[0]?j[0].id:''));")
fi

if [[ -z "$CLIENT_ID" ]]; then
  echo "No client assigned to current user for invoice smoke test"
  exit 1
fi

invoice_code=$(request smoke_invoice_create -X POST "$BASE_URL/invoices" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: $TENANT_ID" \
  -H "x-business-id: $BUSINESS_ID" \
  -H "x-user-id: $USER_ID" \
  -H "x-user-role: $ROLE" \
  -H 'Content-Type: application/json' \
  -d "{\"businessId\":\"$BUSINESS_ID\",\"clientId\":\"$CLIENT_ID\",\"issueDate\":\"2026-04-30\",\"dueDate\":\"2026-05-15\",\"items\":[{\"description\":\"Smoke Item\",\"quantity\":1,\"unitPrice\":50}],\"taxAmount\":0}")
if [[ "$invoice_code" -lt 200 || "$invoice_code" -ge 300 ]]; then
  echo "POST /invoices smoke test failed: expected 2xx, got $invoice_code"
  cat /tmp/smoke_invoice_create.json
  exit 1
fi

categories_code=$(request smoke_exp_categories -X GET "$BASE_URL/expenses/categories" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: $TENANT_ID" \
  -H "x-business-id: $BUSINESS_ID" \
  -H "x-user-id: $USER_ID" \
  -H "x-user-role: $ROLE")
if [[ "$categories_code" -ge 500 ]]; then
  echo "GET /expenses/categories failed with server error"
  exit 1
fi

CATEGORY_ID=$(node -e "const fs=require('fs');const j=JSON.parse(fs.readFileSync('/tmp/smoke_exp_categories.json','utf8'));process.stdout.write(String(Array.isArray(j)&&j[0]?j[0].id:''));")

expense_code=$(request smoke_expense_create -X POST "$BASE_URL/expenses" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: $TENANT_ID" \
  -H "x-business-id: $BUSINESS_ID" \
  -H "x-user-id: $USER_ID" \
  -H "x-user-role: $ROLE" \
  -H 'Content-Type: application/json' \
  -d "{\"amount\":10,\"date\":\"2026-04-30\",\"description\":\"Smoke Expense\",\"categoryId\":\"$CATEGORY_ID\",\"businessId\":\"$BUSINESS_ID\"}")
if [[ "$expense_code" -ge 500 ]]; then
  echo "POST /expenses smoke test failed with server error"
  exit 1
fi

echo "Smoke API tests passed"
