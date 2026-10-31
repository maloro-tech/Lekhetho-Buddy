import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { Download, Printer } from "lucide-react";
import { useAuth, useI18n } from "@/lib/auth";
import { repository } from "@/lib/data";
import { lastNDays, monthBounds, monthKey, monthLabel, periodBounds, todayISO, weekdayInitial, type Period } from "@/lib/dates";
import { formatMaloti, toCsv } from "@/lib/format";
import { expenseLabel } from "@/lib/labels";
import { netMaloti, sumInBounds, sumMaloti } from "@/lib/totals";
import type { ExpenseCategory, ExpenseEntry, ExpenseInput, SaleInput, SalesEntry } from "@/lib/types";
import { useBusiness, useOnboarding } from "@/components/shell";
import { EntryDialog } from "@/components/entry-dialog";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export function RecordsPage() {
  const { revision, refresh } = useAuth();
  const { language, tr } = useI18n();
  const business = useBusiness();
  const { openOnboarding } = useOnboarding();
  const [params, setParams] = useSearchParams();
  const [period, setPeriod] = useState<Period>("month");
  const [month, setMonth] = useState(monthKey());
  const [dialog, setDialog] = useState<"sale" | "expense" | null>(null);
  const [editingSale, setEditingSale] = useState<SalesEntry | null>(null);
  const [editingExpense, setEditingExpense] = useState<ExpenseEntry | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ kind: "sale" | "expense"; id: string; label: string } | null>(null);

  const sales = useMemo(() => (business ? repository.listSales() : []), [business, revision]);
  const expenses = useMemo(() => (business ? repository.listExpenses() : []), [business, revision]);
  const today = todayISO();
  const todayBounds = periodBounds("today", today);
  const selected = periodBounds(period, today);
  const summaryBounds = monthBounds(month);
  const salesToday = sumInBounds(sales, todayBounds);
  const expensesToday = sumInBounds(expenses, todayBounds);
  const periodSales = sumInBounds(sales, selected);
  const periodExpenses = sumInBounds(expenses, selected);
  const summarySales = sales.filter((entry) => entry.entry_date.startsWith(month));
  const summaryExpenses = expenses.filter((entry) => entry.entry_date.startsWith(month));
  const summarySalesTotal = sumMaloti(summarySales.map((entry) => entry.amount));
  const summaryExpensesTotal = sumMaloti(summaryExpenses.map((entry) => entry.amount));
  const days = lastNDays(today, 7);
  const maxBar = Math.max(1, ...days.map((date) => sumInBounds(sales, { start: date, end: date })));

  useEffect(() => {
    if (params.get("new") === "sale" && business) {
      setEditingSale(null);
      setDialog("sale");
      setParams({}, { replace: true });
    }
  }, [params, business, setParams]);

  if (!business) {
    return (
      <div className="max-w-md pt-6">
        <h1 className="text-[32px] font-semibold tracking-[-0.03em]">{tr("Records", "Lirekoto")}</h1>
        <p className="mt-3 text-quiet">{tr("Tell Buddy about the business before adding records.", "Bolella Buddy ka khoebo pele u kenya lirekoto.")}</p>
        <Button className="mt-6" onClick={openOnboarding}>
          {tr("Tell Buddy about your business", "Bolella Buddy ka khoebo ea hau")}
        </Button>
      </div>
    );
  }

  function saveSale(input: SaleInput) {
    if (editingSale) repository.updateSale(editingSale.id, input);
    else repository.addSale(input);
    setEditingSale(null);
    refresh();
  }

  function saveExpense(input: ExpenseInput) {
    if (editingExpense) repository.updateExpense(editingExpense.id, input);
    else repository.addExpense(input);
    setEditingExpense(null);
    refresh();
  }

  function confirmDelete() {
    if (!pendingDelete) return;
    if (pendingDelete.kind === "sale") repository.deleteSale(pendingDelete.id);
    else repository.deleteExpense(pendingDelete.id);
    setPendingDelete(null);
    refresh();
  }

  function downloadCsv() {
    if (!business) return;
    const rows = [
      ["Date", "Type", "Category", "Note", "Amount (LSL)"],
      ...summarySales.map((entry) => [entry.entry_date, "Sale", entry.category ?? "", entry.note ?? "", entry.amount.toFixed(2)]),
      ...summaryExpenses.map((entry) => [entry.entry_date, "Expense", entry.category, entry.note ?? "", entry.amount.toFixed(2)]),
    ].sort((a, b) => (a[0] === "Date" ? -1 : b[0] === "Date" ? 1 : a[0].localeCompare(b[0])));
    rows.push([]);
    rows.push(["Sales total", "", "", "", summarySalesTotal.toFixed(2)]);
    rows.push(["Expenses total", "", "", "", summaryExpensesTotal.toFixed(2)]);
    rows.push(["Record summary (not taxable profit)", "", "", "", netMaloti(summarySalesTotal, summaryExpensesTotal).toFixed(2)]);
    const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${business.name.replace(/\s+/g, "-").toLowerCase()}-${month}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const recent = [
    ...sales.map((entry) => ({ kind: "sale" as const, entry })),
    ...expenses.map((entry) => ({ kind: "expense" as const, entry })),
  ]
    .filter((item) => item.entry.entry_date >= selected.start && item.entry.entry_date <= selected.end)
    .sort((a, b) => b.entry.entry_date.localeCompare(a.entry.entry_date) || b.entry.created_at.localeCompare(a.entry.created_at));

  return (
    <div>
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:gap-x-16">
        <div className="min-w-0">
          <h1 className="text-[32px] font-semibold tracking-[-0.03em] lg:text-[36px]">{tr("Records", "Lirekoto")}</h1>
          <p className="mt-2 max-w-md text-quiet">{business.name}</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <figure>
              <figcaption className="text-[13px] text-quiet">{tr("Today's sales", "Thekiso ea kajeno")}</figcaption>
              <p data-testid="today-sales" className="mt-1 text-[28px] font-semibold tracking-[-0.03em]">
                {formatMaloti(salesToday)}
              </p>
            </figure>
            <figure>
              <figcaption className="text-[13px] text-quiet">{tr("Today's expenses", "Litšenyehelo tsa kajeno")}</figcaption>
              <p data-testid="today-expenses" className="mt-1 text-[28px] font-semibold tracking-[-0.03em]">
                {formatMaloti(expensesToday)}
              </p>
            </figure>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <Button
              data-testid="add-sale"
              onClick={() => {
                setEditingSale(null);
                setDialog("sale");
              }}
            >
              {tr("Add sales", "Kenya thekiso")}
            </Button>
            <Button
              variant="quiet"
              data-testid="add-expense"
              onClick={() => {
                setEditingExpense(null);
                setDialog("expense");
              }}
            >
              {tr("Add expense", "Kenya tšenyehelo")}
            </Button>
          </div>

          <div className="mt-10">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h2 className="text-[20px] font-semibold tracking-[-0.02em]">{tr("Recent entries", "Lirekoto tsa morao-rao")}</h2>
              <div className="grid grid-cols-3 gap-1" role="group" aria-label={tr("Period", "Nako")}>
                {(
                  [
                    ["today", tr("Today", "Kajeno")],
                    ["week", tr("This week", "Beke ena")],
                    ["month", tr("This month", "Kgwedi ena")],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setPeriod(value)}
                    className={cn(
                      "h-11 rounded-[14px] px-2 text-[13px] font-semibold",
                      period === value ? "bg-lemon text-ink" : "bg-white text-quiet",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {recent.length === 0 ? (
              <p className="mt-6 max-w-sm text-quiet">
                {tr("No records in this period yet. Add a sale when money comes in.", "Ha ho lirekoto nakong ena. Kenya thekiso ha chelete e kena.")}
              </p>
            ) : (
              <ul className="mt-2 divide-y divide-line">
                {recent.map((item) => {
                  const isSale = item.kind === "sale";
                  const entry = item.entry;
                  return (
                    <li key={entry.id} className="py-4">
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="min-w-0 text-[15px]">
                          {isSale ? tr("Sale", "Thekiso") : tr("Expense", "Tšenyehelo")} · {entry.entry_date}
                        </p>
                        <p className="shrink-0 font-semibold">{formatMaloti(entry.amount)}</p>
                      </div>
                      <p className="mt-1 text-[13px] text-quiet [overflow-wrap:anywhere]">
                        {isSale
                          ? entry.category || tr("No category", "Ha ho sehlopha")
                          : expenseLabel(entry.category as ExpenseCategory, language)}
                        {entry.note ? ` · ${entry.note}` : ""}
                      </p>
                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          className="h-11 rounded-[14px] border border-line bg-white px-3 text-[14px] font-semibold"
                          data-testid={isSale ? "edit-sale" : "edit-expense"}
                          onClick={() => {
                            if (isSale) {
                              setEditingSale(entry as SalesEntry);
                              setDialog("sale");
                            } else {
                              setEditingExpense(entry as ExpenseEntry);
                              setDialog("expense");
                            }
                          }}
                        >
                          {tr("Edit", "Fetola")}
                        </button>
                        <button
                          type="button"
                          className="h-11 rounded-[14px] border border-line bg-white px-3 text-[14px] font-semibold"
                          data-testid={isSale ? "delete-sale" : "delete-expense"}
                          onClick={() =>
                            setPendingDelete({
                              kind: item.kind,
                              id: entry.id,
                              label: formatMaloti(entry.amount),
                            })
                          }
                        >
                          {tr("Delete", "Hlakola")}
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        <aside className="mt-12 min-w-0 lg:mt-0" id="monthly-summary">
          <p className="text-[13px] font-semibold text-quiet">{tr("Record summary", "Kakaretso ea lirekoto")}</p>
          <p data-testid="period-net" className="mt-2 text-[28px] font-semibold tracking-[-0.03em]">
            {formatMaloti(netMaloti(periodSales, periodExpenses))}
          </p>
          <p className="mt-2 text-[13px] leading-5 text-quiet">
            {tr("Sales minus expenses for the selected period. Not taxable profit.", "Thekiso e fokotsoe litšenyehelo nakong e khethiloeng. Ha se phaello e lekhethoang.")}
          </p>
          <div className="mt-8 grid grid-cols-7 gap-1.5" aria-hidden="true">
            {days.map((date) => {
              const value = sumInBounds(sales, { start: date, end: date });
              const height = value > 0 ? Math.max(12, (value / maxBar) * 100) : 0;
              return (
                <div key={date} className="min-w-0 text-center">
                  <div className="flex h-16 items-end">
                    <div className={cn("w-full rounded-full", date === today ? "bg-lemon" : "bg-ink/15")} style={{ height: `${height}%` }} />
                  </div>
                  <p className={cn("mt-2 text-[11px]", date === today ? "font-semibold text-ink" : "text-quiet")}>{weekdayInitial(date)}</p>
                </div>
              );
            })}
          </div>

          <div className="mt-10 border-t border-line pt-8">
            <h2 className="text-[20px] font-semibold tracking-[-0.02em]">{tr("Monthly summary", "Kakaretso ea kgwedi")}</h2>
            <label className="mt-4 block text-[13px] font-semibold">
              {tr("Month", "Kgwedi")}
              <input
                data-testid="summary-month"
                type="month"
                value={month}
                onChange={(event) => setMonth(event.target.value || monthKey())}
                className="mt-2 h-12 w-full rounded-[14px] border border-line bg-white px-3"
              />
            </label>
            <p className="mt-4 text-[14px] text-quiet">{monthLabel(month)} · LSL</p>
            <dl className="mt-4 grid gap-3">
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-quiet">{tr("Sales", "Thekiso")}</dt>
                <dd data-testid="summary-sales" className="font-semibold">{formatMaloti(summarySalesTotal)}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-quiet">{tr("Expenses", "Litšenyehelo")}</dt>
                <dd data-testid="summary-expenses" className="font-semibold">{formatMaloti(summaryExpensesTotal)}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-quiet">{tr("Record summary", "Kakaretso")}</dt>
                <dd data-testid="summary-net" className="font-semibold">{formatMaloti(netMaloti(summarySalesTotal, summaryExpensesTotal))}</dd>
              </div>
            </dl>
            <p className="mt-3 text-[13px] leading-5 text-quiet">
              {tr("This is not a tax calculation.", "Sena ha se palo ea lekhetho.")}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="quiet" size="sm" data-testid="download-csv" onClick={downloadCsv}>
                <Download size={16} />
                CSV
              </Button>
              <Button variant="quiet" size="sm" onClick={() => window.print()}>
                <Printer size={16} />
                {tr("Print", "Hatisa")}
              </Button>
            </div>
            <ul className="mt-4 divide-y divide-line">
              {[...summarySales.map((entry) => ({ type: "Sale", ...entry, categoryLabel: entry.category ?? "" })), ...summaryExpenses.map((entry) => ({ type: "Expense", ...entry, categoryLabel: expenseLabel(entry.category, language) }))]
                .sort((a, b) => a.entry_date.localeCompare(b.entry_date))
                .map((entry) => (
                  <li key={entry.id} className="flex items-start justify-between gap-3 py-3 text-[14px]">
                    <div className="min-w-0">
                      <p>
                        {entry.entry_date} · {entry.type === "Sale" ? tr("Sale", "Thekiso") : tr("Expense", "Tšenyehelo")}
                      </p>
                      {entry.note ? <p data-testid="summary-note" className="text-quiet [overflow-wrap:anywhere]">{entry.note}</p> : null}
                    </div>
                    <p className="shrink-0">{formatMaloti(entry.amount)}</p>
                  </li>
                ))}
            </ul>
            <p className="sr-only">
              {summaryBounds.start} {summaryBounds.end}
            </p>
          </div>
        </aside>
      </div>

      <EntryDialog
        open={dialog !== null}
        mode={dialog ?? "sale"}
        sale={editingSale}
        expense={editingExpense}
        onOpenChange={(next) => {
          if (!next) {
            setDialog(null);
            setEditingSale(null);
            setEditingExpense(null);
          }
        }}
        onSaveSale={saveSale}
        onSaveExpense={saveExpense}
      />
      <Modal
        open={pendingDelete !== null}
        onOpenChange={(next) => {
          if (!next) setPendingDelete(null);
        }}
        label={tr("Delete this entry?", "Hlakola rekoto ee?")}
        className="left-1/2 top-1/2 w-[min(400px,calc(100%-1.5rem))] -translate-x-1/2 -translate-y-1/2 rounded-[24px] border border-line p-6"
      >
        <h2 className="text-[22px] font-semibold tracking-[-0.03em]">{tr("Delete this entry?", "Hlakola rekoto ee?")}</h2>
        <p className="mt-3 text-[15px] leading-6 text-quiet">
          {tr(
            `This removes ${pendingDelete?.label ?? ""} from your records in Lekhetho Buddy only.`,
            `Sena se tlosa ${pendingDelete?.label ?? ""} lirekotong tsa hau ho Lekhetho Buddy feela.`,
          )}
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Button variant="quiet" onClick={() => setPendingDelete(null)}>
            {tr("Cancel", "Khansela")}
          </Button>
          <Button data-testid="confirm-delete" variant="dark" onClick={confirmDelete}>
            {tr("Delete entry", "Hlakola rekoto")}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
