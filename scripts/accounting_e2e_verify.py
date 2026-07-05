#!/usr/bin/env python3
"""
Custosell accounting + operations E2E verification.

Usage:
  python scripts/accounting_e2e_verify.py [--purge] [--business-id 2]
  python scripts/accounting_e2e_verify.py --email info@custospark.com --password 123456

Requires API at http://localhost:8000 and optional artisan purge via --purge.
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import urllib.error
import urllib.request
from dataclasses import dataclass
from datetime import date
from typing import Any

DEFAULT_API = "http://localhost:8000/api/v1"
DEFAULT_EMAIL = "info@custospark.com"
DEFAULT_PASSWORD = "123456"
DEFAULT_BUSINESS_ID = 2
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_ROOT = os.environ.get(
    "CUSTOSELL_BACKEND",
    os.path.abspath(os.path.join(SCRIPT_DIR, "..", "..", "Backend")),
)


@dataclass
class Client:
    api: str
    token: str = ""

    def request(
        self,
        method: str,
        path: str,
        body: dict | None = None,
        accept: str = "application/json",
    ) -> tuple[int, Any]:
        url = f"{self.api.rstrip('/')}/{path.lstrip('/')}"
        data = None
        headers = {"Accept": accept}
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"
        if body is not None:
            data = json.dumps(body).encode()
            headers["Content-Type"] = "application/json"
        req = urllib.request.Request(url, data=data, headers=headers, method=method)
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                raw = resp.read()
                if accept != "application/json":
                    return resp.status, raw
                return resp.status, json.loads(raw) if raw else {}
        except urllib.error.HTTPError as exc:
            raw = exc.read()
            try:
                payload = json.loads(raw) if raw else {}
            except json.JSONDecodeError:
                payload = raw.decode(errors="replace")
            return exc.code, payload
        except (urllib.error.URLError, TimeoutError) as exc:
            return 0, {"message": str(exc)}

    def get(self, path: str) -> Any:
        code, data = self.request("GET", path)
        if code >= 400:
            fail(f"GET {path} -> {code}: {data}")
        return data

    def post(self, path: str, body: dict | None = None) -> Any:
        code, data = self.request("POST", path, body)
        if code == 0:
            fail(f"POST {path} connection error: {data}")
        if code >= 400:
            fail(f"POST {path} -> {code}: {data}")
        return data


def pass_msg(label: str) -> None:
    print(f"[PASS] {label}")


def fail(label: str) -> None:
    print(f"[FAIL] {label}")
    sys.exit(1)


def unwrap(data: Any) -> Any:
    if isinstance(data, dict) and "data" in data:
        return data["data"]
    return data


def money_close(a: float, b: float, tol: float = 0.02) -> bool:
    return abs(float(a) - float(b)) <= tol


def check_money(label: str, expected: float, actual: float) -> None:
    if money_close(expected, actual):
        pass_msg(f"{label}: {actual}")
    else:
        fail(f"{label} expected {expected} got {actual}")


def run_purge(business_id: int) -> None:
    print(f"=== 0. Purge business {business_id} transactional data ===")
    cmd = [
        "php",
        "artisan",
        "business:purge-transactions",
        str(business_id),
        "--force",
    ]
    result = subprocess.run(
        cmd,
        cwd=BACKEND_ROOT,
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        print(result.stdout)
        print(result.stderr, file=sys.stderr)
        fail(f"Purge command failed (exit {result.returncode})")
    print(result.stdout.strip())
    pass_msg("Business data purged (products + COA kept)")


def login(client: Client, email: str, password: str) -> None:
    print("=== 1. Login ===")
    resp = client.post("/auth/login", {"email": email, "password": password})
    token = resp.get("token") if isinstance(resp, dict) else None
    if not token:
        fail(f"Login failed: {resp}")
    client.token = token
    pass_msg(f"Logged in as {email}")


def fetch_accounts(client: Client) -> dict[str, int]:
    tree = unwrap(client.get("/chart-of-accounts/tree"))
    accounts: dict[str, int] = {}
    stack = list(tree) if isinstance(tree, list) else [tree]
    while stack:
        node = stack.pop()
        if not isinstance(node, dict):
            continue
        code = node.get("code")
        acc_id = node.get("id")
        if code and acc_id:
            accounts[str(code)] = int(acc_id)
        for child in node.get("children") or []:
            stack.append(child)
    if not accounts:
        flat = unwrap(client.get("/chart-of-accounts?per_page=200"))
        items = flat if isinstance(flat, list) else flat.get("data", flat)
        if isinstance(items, list):
            for row in items:
                if row.get("code") and row.get("id"):
                    accounts[str(row["code"])] = int(row["id"])
    if len(accounts) < 10:
        fail(f"Expected chart of accounts, got {len(accounts)} accounts")
    pass_msg(f"Loaded {len(accounts)} chart-of-account codes")
    return accounts


def post_journal(client: Client, date_str: str, description: str, lines: list[dict]) -> int:
    draft = unwrap(
        client.post(
            "/journal-entries",
            {"date": date_str, "description": description, "lines": lines},
        )
    )
    entry_id = int(draft["id"])
    posted = unwrap(client.post(f"/journal-entries/{entry_id}/post"))
    if not posted.get("posted_at"):
        fail(f"Journal entry {entry_id} not posted")
    return entry_id


def seed_manual_journals(client: Client, accounts: dict[str, int]) -> None:
    print("=== 2. Manual journal entries (broad COA coverage) ===")
    today = date.today().isoformat()

    def ac(code: str) -> int:
        if code not in accounts:
            fail(f"Missing COA account code {code}")
        return accounts[code]

    def line(account_id: int, debit: float = 0, credit: float = 0, desc: str = "") -> dict:
        return {
            "account_id": account_id,
            "debit_amount": debit,
            "credit_amount": credit,
            "description": desc or None,
        }

    scenarios = [
        ("Opening equity injection", [
            line(ac("1101"), 100_000, 0, "Cash"),
            line(ac("3100"), 0, 100_000, "Share capital"),
        ]),
        ("Bank deposit", [
            line(ac("1102"), 20_000, 0),
            line(ac("1101"), 0, 20_000),
        ]),
        ("Inventory on credit", [
            line(ac("1104"), 15_000, 0),
            line(ac("2101"), 0, 15_000),
        ]),
        ("Prepaid insurance", [
            line(ac("1105"), 3_000, 0),
            line(ac("1101"), 0, 3_000),
        ]),
        ("Computer equipment purchase", [
            line(ac("1203"), 12_000, 0),
            line(ac("1102"), 0, 12_000),
        ]),
        ("Pay supplier", [
            line(ac("2101"), 5_000, 0),
            line(ac("1101"), 0, 5_000),
        ]),
        ("Credit sale accrual", [
            line(ac("1103"), 8_000, 0),
            line(ac("4100"), 0, 8_000),
        ]),
        ("Collect receivable", [
            line(ac("1101"), 8_000, 0),
            line(ac("1103"), 0, 8_000),
        ]),
        ("COGS adjustment", [
            line(ac("5100"), 4_500, 0),
            line(ac("1104"), 0, 4_500),
        ]),
        ("Rent expense", [
            line(ac("6102"), 2_500, 0),
            line(ac("1101"), 0, 2_500),
        ]),
        ("Utilities", [
            line(ac("6103"), 800, 0),
            line(ac("1102"), 0, 800),
        ]),
        ("Salaries accrual", [
            line(ac("6101"), 6_000, 0),
            line(ac("2103"), 0, 6_000),
        ]),
        ("Short-term loan draw", [
            line(ac("1101"), 10_000, 0),
            line(ac("2104"), 0, 10_000),
        ]),
        ("VAT remittance", [
            line(ac("2102"), 1_200, 0),
            line(ac("1102"), 0, 1_200),
        ]),
        ("Depreciation", [
            line(ac("6300"), 500, 0),
            line(ac("1205"), 0, 500),
        ]),
        ("Interest income", [
            line(ac("1102"), 350, 0),
            line(ac("4600"), 0, 350),
        ]),
        ("Owner drawings", [
            line(ac("3300"), 1_000, 0),
            line(ac("1101"), 0, 1_000),
        ]),
        ("Service revenue", [
            line(ac("1101"), 2_200, 0),
            line(ac("4200"), 0, 2_200),
        ]),
        ("Professional fees", [
            line(ac("6202"), 1_500, 0),
            line(ac("2101"), 0, 1_500),
        ]),
        ("Deferred revenue recognition", [
            line(ac("2106"), 900, 0),
            line(ac("4500"), 0, 900),
        ]),
    ]

    posted_ids: list[int] = []
    for desc, lines in scenarios:
        entry_id = post_journal(client, today, f"E2E: {desc}", lines)
        posted_ids.append(entry_id)

    pass_msg(f"Posted {len(posted_ids)} manual journal entries across COA")


def assert_trial_balance(client: Client, label: str) -> None:
    tb = unwrap(client.get("/general-ledger/trial-balance"))
    debits = float(tb.get("total_debits", 0))
    credits = float(tb.get("total_credits", 0))
    balanced = tb.get("is_balanced", False)
    if not balanced and not money_close(debits, credits):
        fail(f"{label}: trial balance not balanced ({debits} vs {credits})")
    pass_msg(f"{label}: trial balance balanced ({debits:.2f} = {credits:.2f})")


def open_shift(client: Client) -> int:
    print("=== 3. Open shift ===")
    resp = unwrap(
        client.post(
            "/shifts",
            {"clock_in": f"{date.today().isoformat()}T08:00:00", "status": "active"},
        )
    )
    shift_id = int(resp["id"])
    pass_msg(f"Shift id={shift_id}")
    return shift_id


def fetch_product(client: Client) -> tuple[int, float, int]:
    products = unwrap(client.get("/products"))
    items = products if isinstance(products, list) else products.get("data", products)
    if not items:
        fail("No products available after purge")
    p = items[0]
    return int(p["id"]), float(p["unit_price"]), int(p.get("stock_quantity") or 0)


def run_sales_flow(client: Client, shift_id: int, product_id: int, unit_price: float) -> tuple[int, int, int | None]:
    print("=== 4. Sales: installment, completion, refund ===")
    qty = 2
    total = round(qty * unit_price, 2)
    pay_now = min(1500.0, total - 0.01) if total > 1500 else round(total / 2, 2)
    balance = round(total - pay_now, 2)

    sale = unwrap(
        client.post(
            "/sales",
            {
                "items": [{"product_id": product_id, "quantity": qty, "unit_price": unit_price}],
                "subtotal": total,
                "tax_total": 0,
                "discount_amount": 0,
                "total_amount": total,
                "payment_method": "cash",
                "amount_paid": pay_now,
                "amount_tendered": pay_now,
                "shift_id": shift_id,
            },
        )
    )
    sale_id = int(sale["id"])
    check_money("Installment amount_paid", pay_now, float(sale.get("amount_paid", 0)))
    if sale.get("payment_status") != "partially_paid":
        fail(f"Expected partially_paid got {sale.get('payment_status')}")
    pass_msg(f"Partial sale {sale.get('receipt_number')} id={sale_id}")

    payment_id: int | None = None
    if balance > 0:
        pay_resp = client.post(
            f"/sales/{sale_id}/payment",
            {
                "amount": balance,
                "payment_method": "mobile_money",
                "amount_tendered": balance,
            },
        )
        pay_data = pay_resp if isinstance(pay_resp, dict) else {}
        payment_id = pay_data.get("payment", {}).get("id")
        sale_after = pay_data.get("sale", {})
        if sale_after.get("payment_status") != "paid":
            fail(f"Sale not fully paid: {sale_after}")
        check_money("Sale balance after payment", 0, float(pay_data.get("payment", {}).get("balance_after", -1)))
        pass_msg("Sale fully paid via follow-up payment")

    # Full-pay sale for refund test
    full_sale = unwrap(
        client.post(
            "/sales",
            {
                "items": [{"product_id": product_id, "quantity": 1, "unit_price": unit_price}],
                "subtotal": unit_price,
                "tax_total": 0,
                "discount_amount": 0,
                "total_amount": unit_price,
                "payment_method": "cash",
                "amount_paid": unit_price,
                "amount_tendered": unit_price,
                "shift_id": shift_id,
            },
        )
    )
    full_sale_id = int(full_sale["id"])
    item_id = int(full_sale["sale_items"][0]["id"])
    refund_qty = 1
    refunded = unwrap(
        client.post(
            f"/sales/{full_sale_id}/refund",
            {"items": [{"id": item_id, "quantity": refund_qty, "amount": unit_price}]},
        )
    )
    refunded_amt = float(refunded.get("sale_items", [{}])[0].get("refunded_amount") or 0)
    if refunded_amt <= 0:
        fail(f"Refund did not record amount: {refunded}")
    pass_msg(f"Refund recorded on sale {full_sale.get('receipt_number')} amount={refunded_amt}")
    if payment_id is None:
        payments = sale.get("payments") or []
        if payments:
            payment_id = int(payments[0]["id"])
    return sale_id, full_sale_id, int(payment_id) if payment_id else None


def run_invoices(client: Client, unit_price: float) -> int | None:
    print("=== 5. Invoices: partial + full payment ===")
    total = round(unit_price, 2)
    inv = unwrap(
        client.post(
            "/invoices",
            {
                "issue_date": date.today().isoformat(),
                "due_date": date.today().isoformat(),
                "items": [
                    {
                        "description": "E2E invoice line",
                        "quantity": 1,
                        "unit_price": unit_price,
                        "subtotal": total,
                    }
                ],
                "tax_total": 0,
            },
        )
    )
    inv_id = int(inv["id"])
    inv_num = inv.get("invoice_number", "")
    unwrap(client.post(f"/invoices/{inv_id}/send"))
    partial = min(604.0, total - 1) if total > 604 else round(total / 3, 2)
    rem = round(total - partial, 2)
    p1 = client.post(
        f"/invoices/{inv_id}/payment",
        {
            "amount": partial,
            "payment_method": "mobile_money",
            "amount_tendered": partial,
            "notes": "E2E partial",
        },
    )
    check_money("Invoice partial payment", partial, float(p1.get("payment", {}).get("amount", 0)))
    if p1.get("invoice", {}).get("status") not in ("partially_paid", "paid"):
        fail(f"Unexpected invoice status after partial: {p1}")
    if rem > 0:
        p2 = client.post(
            f"/invoices/{inv_id}/payment",
            {"amount": rem, "payment_method": "bank", "amount_tendered": rem},
        )
        check_money("Invoice final balance", 0, float(p2.get("payment", {}).get("balance_after", -1)))
        if p2.get("invoice", {}).get("status") != "paid":
            fail(f"Invoice not paid: {p2}")
    pass_msg(f"Invoice {inv_num} paid")

    inv2 = unwrap(
        client.post(
            "/invoices",
            {
                "issue_date": date.today().isoformat(),
                "due_date": date.today().isoformat(),
                "items": [
                    {
                        "description": "Full pay invoice",
                        "quantity": 1,
                        "unit_price": 5000,
                        "subtotal": 5000,
                    }
                ],
                "tax_total": 0,
            },
        )
    )
    inv2_id = int(inv2["id"])
    unwrap(client.post(f"/invoices/{inv2_id}/send"))
    fp = client.post(
        f"/invoices/{inv2_id}/payment",
        {"amount": 5000, "payment_method": "cash", "amount_tendered": 5000},
    )
    if fp.get("invoice", {}).get("status") != "paid":
        fail(f"Full-pay invoice failed: {fp}")
    pass_msg("Second invoice paid in one payment")
    return int(p1.get("payment", {}).get("id")) if isinstance(p1, dict) else None


def run_expense(client: Client, shift_id: int) -> None:
    print("=== 6. Expense ===")
    code, exp = client.request(
        "POST",
        "/expenses",
        {
            "amount": 750,
            "description": "E2E office supplies",
            "expense_date": date.today().isoformat(),
            "shift_id": shift_id,
            "reference": "E2E-EXP-001",
        },
    )
    if code >= 400:
        fail(f"Expense create failed: {exp}")
    data = exp if isinstance(exp, dict) else {}
    exp_id = data.get("id") or unwrap(data).get("id")
    if not exp_id:
        fail(f"Expense response missing id: {exp}")
    pass_msg(f"Expense recorded id={exp_id}")


def verify_receipt_pdf(client: Client, payment_id: int | None) -> None:
    print("=== 7. Payment receipt PDF ===")
    if not payment_id:
        fail("No payment id available for receipt test")
    code, _ = client.request("GET", f"/payments/{payment_id}/receipt", accept="application/pdf")
    if code != 200:
        fail(f"Payment receipt PDF returned {code}")
    pass_msg(f"Payment receipt PDF OK (payment id={payment_id})")


def verify_financial_statements(client: Client) -> None:
    print("=== 8. Financial statements ===")
    for path, name in [
        ("/general-ledger/profit-loss", "Profit & Loss"),
        ("/general-ledger/balance-sheet", "Balance Sheet"),
        ("/general-ledger/cash-flow", "Cash Flow"),
        ("/general-ledger/equity", "Equity"),
    ]:
        data = unwrap(client.get(path))
        if not isinstance(data, dict) or not data:
            fail(f"{name} returned empty payload")
        pass_msg(f"{name} OK")

    assert_trial_balance(client, "After operations")


def verify_ratios(client: Client) -> None:
    print("=== 9. Financial ratios ===")
    ratios = unwrap(client.get("/ratios"))
    groups = ["liquidity", "profitability", "solvency", "efficiency"]
    found = [g for g in groups if g in ratios and ratios[g]]
    if len(found) < 2:
        fail(f"Ratios incomplete: {ratios}")
    pass_msg(f"Ratios computed: {', '.join(found)}")
    trends = unwrap(client.get("/ratios/trends?count=3"))
    if not trends:
        fail("Ratio trends empty")
    pass_msg("Ratio trends OK")


def verify_doc_prefixes(client: Client) -> None:
    print("=== 10. Document number prefixes ===")
    sales = unwrap(client.get("/sales?per_page=3"))
    sale_items = sales if isinstance(sales, list) else sales.get("data", [])
    for s in sale_items[:2]:
        rcpt = s.get("receipt_number", "")
        if rcpt and "-SAL-" in rcpt:
            pass_msg(f"Sale prefix: {rcpt}")
            break
    invs = unwrap(client.get("/invoices?per_page=3"))
    inv_list = invs if isinstance(invs, list) else invs.get("data", [])
    for inv in inv_list[:2]:
        num = inv.get("invoice_number", "")
        if num and "-INV-" in num:
            pass_msg(f"Invoice prefix: {num}")
            break
    pays = unwrap(client.get("/sales?per_page=5"))
    pay_list = pays if isinstance(pays, list) else pays.get("data", [])
    for s in pay_list:
        for p in s.get("payments") or []:
            rcpt = p.get("receipt_number", "")
            if rcpt and "-RCP-" in rcpt:
                pass_msg(f"Payment prefix: {rcpt}")
                return


def verify_journal_automation(client: Client) -> None:
    print("=== 11. Automated journal entries from operations ===")
    entries = unwrap(client.get("/journal-entries?per_page=50"))
    items = entries if isinstance(entries, list) else entries.get("data", [])
    ref_types = {e.get("reference_type") for e in items if e.get("reference_type")}
    expected_any = {"sale", "sale_payment", "invoice_payment", "expense"}
    if not ref_types.intersection(expected_any):
        fail(f"Expected automated journal refs, got: {ref_types}")
    pass_msg(f"Automated journal refs present: {', '.join(sorted(ref_types.intersection(expected_any)))}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Custosell accounting E2E verification")
    parser.add_argument("--api", default=DEFAULT_API)
    parser.add_argument("--email", default=DEFAULT_EMAIL)
    parser.add_argument("--password", default=DEFAULT_PASSWORD)
    parser.add_argument("--business-id", type=int, default=DEFAULT_BUSINESS_ID)
    parser.add_argument("--purge", action="store_true", help="Purge business data before tests")
    args = parser.parse_args()

    if args.purge:
        run_purge(args.business_id)

    client = Client(api=args.api)
    login(client, args.email, args.password)

    accounts = fetch_accounts(client)
    seed_manual_journals(client, accounts)
    assert_trial_balance(client, "After manual journals")

    shift_id = open_shift(client)
    product_id, unit_price, _stock = fetch_product(client)
    pass_msg(f"Using product id={product_id} price={unit_price}")

    _, _, payment_id = run_sales_flow(client, shift_id, product_id, unit_price)
    inv_payment_id = run_invoices(client, unit_price)
    run_expense(client, shift_id)
    verify_receipt_pdf(client, inv_payment_id or payment_id)
    verify_financial_statements(client)
    verify_ratios(client)
    verify_doc_prefixes(client)
    verify_journal_automation(client)

    print("")
    print("=== ALL ACCOUNTING E2E CHECKS PASSED ===")


if __name__ == "__main__":
    main()
