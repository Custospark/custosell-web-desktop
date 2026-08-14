#!/usr/bin/env bash
set -euo pipefail
API="http://localhost:8000/api/v1"
EMAIL="${1:-info@custospark.com}"
PASS="${2:-123456}"

pass() { echo "✅ $1"; }
fail() { echo "❌ $1"; exit 1; }
check_money() {
  local label="$1" expected="$2" actual="$3"
  if awk -v e="$expected" -v a="$actual" 'BEGIN { exit (e == a || (e - a)^2 < 0.0004) ? 0 : 1 }'; then
    pass "$label: $actual"
  else
    fail "$label expected $expected got $actual"
  fi
}

echo "=== 1. Login ==="
LOGIN=$(curl -s "$API/auth/login" -X POST \
  -H "Content-Type: application/json" -H "Accept: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}")
TOKEN=$(echo "$LOGIN" | python -c "import sys,json; print(json.load(sys.stdin).get('token',''))" 2>/dev/null || echo "")
[[ -n "$TOKEN" ]] || fail "Login failed: $LOGIN"
pass "Logged in"

AUTH=(-H "Authorization: Bearer $TOKEN" -H "Accept: application/json" -H "Content-Type: application/json")

echo "=== 2. Fetch product ==="
PRODUCTS=$(curl -s "$API/products" "${AUTH[@]}")
PRODUCT_ID=$(echo "$PRODUCTS" | python -c "import sys,json; d=json.load(sys.stdin); items=d if isinstance(d,list) else d.get('data',[]); print(items[0]['id'] if items else '')")
UNIT_PRICE=$(echo "$PRODUCTS" | python -c "import sys,json; d=json.load(sys.stdin); items=d if isinstance(d,list) else d.get('data',[]); print(items[0]['unit_price'] if items else '')")
[[ -n "$PRODUCT_ID" ]] || fail "No products found"
pass "Product id=$PRODUCT_ID price=$UNIT_PRICE"

QTY=1
TOTAL=$(python -c "print(round($QTY * float('$UNIT_PRICE'), 2))")
SUBTOTAL=$TOTAL
PAY_NOW=1500
BALANCE=$(python -c "print(round($TOTAL - $PAY_NOW, 2))")

echo "=== 3. Installment sale (pay $PAY_NOW of $TOTAL) ==="
SALE_RESP=$(curl -s "$API/sales" -X POST "${AUTH[@]}" \
  -d "{\"items\":[{\"product_id\":$PRODUCT_ID,\"quantity\":$QTY,\"unit_price\":$UNIT_PRICE}],\"subtotal\":$SUBTOTAL,\"tax_total\":0,\"discount_amount\":0,\"total_amount\":$TOTAL,\"payment_method\":\"cash\",\"amount_paid\":$PAY_NOW,\"amount_tendered\":$PAY_NOW,\"shift_id\":4}")
SALE_ID=$(echo "$SALE_RESP" | python -c "import sys,json; d=json.load(sys.stdin); r=d.get('data',d); print(r.get('id',''))")
SALE_RECEIPT=$(echo "$SALE_RESP" | python -c "import sys,json; d=json.load(sys.stdin); r=d.get('data',d); print(r.get('receipt_number',''))")
SALE_STATUS=$(echo "$SALE_RESP" | python -c "import sys,json; d=json.load(sys.stdin); r=d.get('data',d); print(r.get('payment_status',''))")
SALE_PAID=$(echo "$SALE_RESP" | python -c "import sys,json; d=json.load(sys.stdin); r=d.get('data',d); print(r.get('amount_paid',''))")
[[ -n "$SALE_ID" ]] || fail "Sale create failed: $SALE_RESP"
pass "Sale $SALE_RECEIPT id=$SALE_ID status=$SALE_STATUS"
check_money "Sale amount_paid" "$PAY_NOW" "$SALE_PAID"
[[ "$SALE_STATUS" == "partially_paid" ]] || fail "Expected partially_paid got $SALE_STATUS"

PAY1=$(echo "$SALE_RESP" | python -c "import sys,json; d=json.load(sys.stdin); r=d.get('data',d); ps=r.get('payments') or []; print(ps[0]['receipt_number'] if ps else 'NONE')")
[[ "$PAY1" != "NONE" ]] && pass "Initial payment receipt: $PAY1"

echo "=== 4. Follow-up sale payment ($BALANCE) ==="
PAY2_RESP=$(curl -s "$API/sales/$SALE_ID/payment" -X POST "${AUTH[@]}" \
  -d "{\"amount\":$BALANCE,\"payment_method\":\"mobile_money\",\"amount_tendered\":$BALANCE}")
SALE2_STATUS=$(echo "$PAY2_RESP" | python -c "import sys,json; d=json.load(sys.stdin); s=d.get('sale',{}); print(s.get('payment_status',''))")
PAY2_AMT=$(echo "$PAY2_RESP" | python -c "import sys,json; d=json.load(sys.stdin); print(d.get('payment',{}).get('amount',''))")
PAY2_BAL=$(echo "$PAY2_RESP" | python -c "import sys,json; d=json.load(sys.stdin); print(d.get('payment',{}).get('balance_after',''))")
check_money "Follow-up payment amount" "$BALANCE" "$PAY2_AMT"
check_money "Sale balance after" "0" "$PAY2_BAL"
[[ "$SALE2_STATUS" == "paid" ]] || fail "Expected sale paid got $SALE2_STATUS"
pass "Sale fully paid"

echo "=== 5. Create invoice ==="
INV_SUB=$TOTAL
INV_TAX=0
INV_TOTAL=$TOTAL
INV_RESP=$(curl -s "$API/invoices" -X POST "${AUTH[@]}" \
  -d "{\"issue_date\":\"2026-07-05\",\"due_date\":\"2026-07-12\",\"items\":[{\"description\":\"Sorghum - Small verify\",\"quantity\":$QTY,\"unit_price\":$UNIT_PRICE,\"subtotal\":$INV_SUB}],\"tax_total\":$INV_TAX}")
INV_ID=$(echo "$INV_RESP" | python -c "import sys,json; d=json.load(sys.stdin); r=d.get('data',d); print(r.get('id',''))")
INV_NUM=$(echo "$INV_RESP" | python -c "import sys,json; d=json.load(sys.stdin); r=d.get('data',d); print(r.get('invoice_number',''))")
INV_TOTAL_ACT=$(echo "$INV_RESP" | python -c "import sys,json; d=json.load(sys.stdin); r=d.get('data',d); print(r.get('total_amount',''))")
[[ -n "$INV_ID" ]] || fail "Invoice create failed: $INV_RESP"
pass "Invoice $INV_NUM id=$INV_ID"
check_money "Invoice total" "$INV_TOTAL" "$INV_TOTAL_ACT"

echo "=== 6. Send invoice ==="
SEND=$(curl -s "$API/invoices/$INV_ID/send" -X POST "${AUTH[@]}")
INV_STATUS=$(echo "$SEND" | python -c "import sys,json; d=json.load(sys.stdin); r=d.get('data',d); print(r.get('status',''))")
[[ "$INV_STATUS" == "sent" ]] || fail "Send failed: $SEND"
pass "Invoice sent"

echo "=== 7. Partial invoice payment (604) ==="
PARTIAL=604
REM=$(python -c "print(round($INV_TOTAL - $PARTIAL, 2))")
IP1=$(curl -s "$API/invoices/$INV_ID/payment" -X POST "${AUTH[@]}" \
  -d "{\"amount\":$PARTIAL,\"payment_method\":\"mobile_money\",\"amount_tendered\":$PARTIAL,\"notes\":\"Good Customer\"}")
IP1_AMT=$(echo "$IP1" | python -c "import sys,json; d=json.load(sys.stdin); print(d.get('payment',{}).get('amount',''))")
IP1_BAL=$(echo "$IP1" | python -c "import sys,json; d=json.load(sys.stdin); print(d.get('payment',{}).get('balance_after',''))")
IP1_RCP=$(echo "$IP1" | python -c "import sys,json; d=json.load(sys.stdin); print(d.get('payment',{}).get('receipt_number',''))")
INV_ST1=$(echo "$IP1" | python -c "import sys,json; d=json.load(sys.stdin); print(d.get('invoice',{}).get('status',''))")
check_money "Partial payment" "$PARTIAL" "$IP1_AMT"
check_money "Balance after partial" "$REM" "$IP1_BAL"
[[ "$INV_ST1" == "partially_paid" ]] || fail "Expected partially_paid got $INV_ST1"
pass "Partial payment receipt $IP1_RCP"

echo "=== 8. Final invoice payment ($REM) ==="
IP2=$(curl -s "$API/invoices/$INV_ID/payment" -X POST "${AUTH[@]}" \
  -d "{\"amount\":$REM,\"payment_method\":\"bank\",\"amount_tendered\":$REM}")
IP2_BAL=$(echo "$IP2" | python -c "import sys,json; d=json.load(sys.stdin); print(d.get('payment',{}).get('balance_after',''))")
INV_ST2=$(echo "$IP2" | python -c "import sys,json; d=json.load(sys.stdin); print(d.get('invoice',{}).get('status',''))")
check_money "Final balance" "0" "$IP2_BAL"
[[ "$INV_ST2" == "paid" ]] || fail "Expected paid got $INV_ST2"
pass "Invoice paid in full"

echo "=== 9. Second invoice - pay in full at once ==="
INV2=$(curl -s "$API/invoices" -X POST "${AUTH[@]}" \
  -d "{\"issue_date\":\"2026-07-05\",\"due_date\":\"2026-07-12\",\"items\":[{\"description\":\"Full pay test\",\"quantity\":1,\"unit_price\":5000,\"subtotal\":5000}],\"tax_total\":0}")
INV2_ID=$(echo "$INV2" | python -c "import sys,json; d=json.load(sys.stdin); r=d.get('data',d); print(r.get('id',''))")
INV2_NUM=$(echo "$INV2" | python -c "import sys,json; d=json.load(sys.stdin); r=d.get('data',d); print(r.get('invoice_number',''))")
curl -s "$API/invoices/$INV2_ID/send" -X POST "${AUTH[@]}" > /dev/null
FULL_PAY=$(curl -s "$API/invoices/$INV2_ID/payment" -X POST "${AUTH[@]}" \
  -d '{"amount":5000,"payment_method":"cash","amount_tendered":5000}')
FP_STATUS=$(echo "$FULL_PAY" | python -c "import sys,json; d=json.load(sys.stdin); print(d.get('invoice',{}).get('status',''))")
FP_BAL=$(echo "$FULL_PAY" | python -c "import sys,json; d=json.load(sys.stdin); print(d.get('payment',{}).get('balance_after',''))")
[[ "$FP_STATUS" == "paid" ]] || fail "Full pay invoice status=$FP_STATUS"
check_money "Full pay balance" "0" "$FP_BAL"
pass "Invoice $INV2_NUM paid in one payment"

echo "=== 10. Verify payment receipt PDF ==="
PAY_ID=$(echo "$IP1" | python -c "import sys,json; d=json.load(sys.stdin); print(d.get('payment',{}).get('id',''))")
PDF_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API/payments/$PAY_ID/receipt" -H "Authorization: Bearer $TOKEN" -H "Accept: application/pdf")
[[ "$PDF_CODE" == "200" ]] || fail "Payment PDF returned $PDF_CODE"
pass "Payment receipt PDF OK"

echo "=== 11. Document number prefixes ==="
echo "$SALE_RECEIPT" | grep -qE '^[A-Z0-9]{4}-SAL-' && pass "Sale receipt prefixed: $SALE_RECEIPT" || echo "⚠️  Sale prefix (legacy ok): $SALE_RECEIPT"
echo "$INV_NUM" | grep -qE '^[A-Z0-9]{4}-INV-' && pass "Invoice prefixed: $INV_NUM" || echo "⚠️  Invoice prefix (legacy ok): $INV_NUM"
echo "$IP1_RCP" | grep -qE '^[A-Z0-9]{4}-RCP-' && pass "Payment receipt prefixed: $IP1_RCP" || echo "⚠️  Payment prefix (legacy ok): $IP1_RCP"

echo ""
echo "=== ALL CHECKS PASSED ==="
echo "Sale: $SALE_RECEIPT | Invoice: $INV_NUM | Payments: $PAY1, $IP1_RCP"
