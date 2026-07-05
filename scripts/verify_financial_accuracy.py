#!/usr/bin/env python3
"""Verify financial statement accuracy against trial balance (not just persistence)."""
import json
import subprocess
import sys
import urllib.error
import urllib.request

API = "http://localhost:8000/api/v1"
EMAIL = "info@custospark.com"
PASSWORD = "123456"
BUSINESS_ID = 2
BACKEND = r"C:\Dev\Custosell\Backend"

ASSET_PREFIXES = ("1",)
LIABILITY_PREFIXES = ("2",)
EQUITY_PREFIXES = ("3",)
REVENUE_PREFIXES = ("4",)
EXPENSE_PREFIXES = ("5", "6")


def req(method, path, token=None, body=None):
    url = f"{API}/{path.lstrip('/')}"
    headers = {"Accept": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    data = json.dumps(body).encode() if body else None
    if data:
        headers["Content-Type"] = "application/json"
    r = urllib.request.Request(url, data=data, headers=headers, method=method)
    with urllib.request.urlopen(r, timeout=30) as resp:
        return json.loads(resp.read())


def unwrap(d):
    return d.get("data", d) if isinstance(d, dict) else d


def money(a, b, tol=0.02):
    return abs(float(a) - float(b)) <= tol


def db_counts():
    php = r"""
$b = %d;
echo json_encode([
  'sales' => \App\Models\Sale::where('business_id',$b)->count(),
  'invoices' => \App\Models\Invoice::where('business_id',$b)->count(),
  'payments' => \App\Models\Payment::where('business_id',$b)->count(),
  'expenses' => \App\Models\Expense::where('business_id',$b)->count(),
  'journal_entries' => \App\Models\JournalEntry::where('business_id',$b)->count(),
  'gl_rows' => \App\Models\GeneralLedger::where('business_id',$b)->count(),
  'products' => \App\Models\Product::where('business_id',$b)->count(),
], JSON_PRETTY_PRINT);
""" % BUSINESS_ID
    out = subprocess.check_output(
        ["php", "artisan", "tinker", "--execute", php],
        cwd=BACKEND,
        text=True,
    )
    # tinker may print extra lines; grab JSON block
    start = out.find("{")
    return json.loads(out[start:])


def classify(code: str) -> str:
    if code.startswith("1"):
        return "asset"
    if code.startswith("2"):
        return "liability"
    if code.startswith("3"):
        return "equity"
    if code.startswith("4"):
        return "revenue"
    if code.startswith("5") or code.startswith("6"):
        return "expense"
    return "other"


def main():
    login = req("POST", "/auth/login", body={"email": EMAIL, "password": PASSWORD})
    token = login["token"]

    counts = db_counts()
    print("=== DATA IN DATABASE (business 2) ===")
    for k, v in counts.items():
        print(f"  {k}: {v}")

    tb = unwrap(req("GET", "/general-ledger/trial-balance", token))
    pl = unwrap(req("GET", "/general-ledger/profit-loss", token))
    bs = unwrap(req("GET", "/general-ledger/balance-sheet", token))
    eq = unwrap(req("GET", "/general-ledger/equity", token))

    accounts = tb.get("accounts", [])
    by_type = {"asset": 0.0, "liability": 0.0, "equity": 0.0, "revenue": 0.0, "expense": 0.0}
    revenue_from_tb = 0.0
    expense_from_tb = 0.0
    cogs_from_tb = 0.0
    asset_from_tb = 0.0
    liability_from_tb = 0.0
    equity_from_tb = 0.0

    for row in accounts:
        code = str(row.get("code", ""))
        debit = float(row.get("debit_balance") or 0)
        credit = float(row.get("credit_balance") or 0)
        kind = classify(code)
        if kind == "asset":
            bal = debit - credit
            asset_from_tb += bal
        elif kind == "liability":
            bal = credit - debit
            liability_from_tb += bal
        elif kind == "equity":
            bal = credit - debit
            equity_from_tb += bal
        elif kind == "revenue":
            bal = credit - debit
            revenue_from_tb += bal
        elif kind == "expense":
            bal = debit - credit
            expense_from_tb += bal
            if code in ("5100", "5200", "5300"):
                cogs_from_tb += bal

    print("\n=== TRIAL BALANCE INTEGRITY ===")
    td = float(tb.get("total_debits", 0))
    tc = float(tb.get("total_credits", 0))
    ok_tb = tb.get("is_balanced") or money(td, tc)
    print(f"  Debits {td:,.2f} | Credits {tc:,.2f} | Balanced: {ok_tb}")

    print("\n=== P&L ACCURACY (recomputed from trial balance vs API) ===")
    api_rev = float(pl.get("total_revenue", 0))
    api_cogs = float(pl.get("total_cost_of_goods_sold", 0))
    api_gross = float(pl.get("gross_profit", 0))
    api_opex = float(pl.get("total_operating_expenses", 0))
    api_net = float(pl.get("net_income", 0))

    calc_gross = revenue_from_tb - cogs_from_tb
    calc_net = revenue_from_tb - expense_from_tb  # simplified: all expenses

    print(f"  Revenue     TB={revenue_from_tb:,.2f}  API={api_rev:,.2f}  Match={money(revenue_from_tb, api_rev)}")
    print(f"  COGS        TB={cogs_from_tb:,.2f}  API={api_cogs:,.2f}  Match={money(cogs_from_tb, api_cogs)}")
    print(f"  Gross profit calc={calc_gross:,.2f}  API={api_gross:,.2f}  Match={money(calc_gross, api_gross)}")
    print(f"  Net income  simplified={calc_net:,.2f}  API={api_net:,.2f}  Match={money(calc_net, api_net)}")

    print("\n=== BALANCE SHEET ACCURACY ===")
    api_assets = float(bs.get("total_assets", 0))
    api_liab = float(bs.get("total_liabilities", 0))
    api_equity = float(bs.get("total_equity", 0))
    api_balanced = bs.get("is_balanced", False)

    # BS adds net income to equity accounts for balancing
    equity_with_ni = equity_from_tb + api_net
    liab_plus_eq = liability_from_tb + equity_with_ni

    print(f"  Assets      TB={asset_from_tb:,.2f}  API={api_assets:,.2f}  Match={money(asset_from_tb, api_assets)}")
    print(f"  Liabilities TB={liability_from_tb:,.2f}  API={api_liab:,.2f}  Match={money(liability_from_tb, api_liab)}")
    print(f"  Equity+NI   TB={equity_with_ni:,.2f}  API={api_equity:,.2f}  Match={money(equity_with_ni, api_equity)}")
    print(f"  A = L+E     {asset_from_tb:,.2f} vs {liab_plus_eq:,.2f}  Match={money(asset_from_tb, liab_plus_eq)}")
    print(f"  API is_balanced flag: {api_balanced}")

    print("\n=== EQUITY STATEMENT ===")
    print(f"  Net income on equity stmt: {eq.get('net_income')} (should match P&L net {api_net})")
    print(f"  Match: {money(eq.get('net_income', 0), api_net)}")

    # Overall
    calc_net = revenue_from_tb - expense_from_tb
    equity_with_ni = equity_from_tb + api_net

    checks = [
        ok_tb,
        money(revenue_from_tb, api_rev),
        money(cogs_from_tb, api_cogs),
        money(calc_gross, api_gross),
        money(calc_net, api_net),
        money(asset_from_tb, api_assets),
        money(liability_from_tb, api_liab),
        money(equity_with_ni, api_equity),
        money(asset_from_tb, liab_plus_eq),
        api_balanced,
        money(eq.get("net_income", 0), api_net),
    ]
    print("\n=== VERDICT ===")
    if all(checks):
        print("  ACCURACY VERIFIED: statements reconcile with trial balance.")
        return 0
    print("  MISMATCH DETECTED — see lines above.")
    return 1


if __name__ == "__main__":
    sys.exit(main())
