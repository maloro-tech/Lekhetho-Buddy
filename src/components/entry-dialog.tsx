import { useEffect, useState } from "react";
import { todayISO } from "@/lib/dates";
import { parseAmount } from "@/lib/format";
import { EXPENSE_OPTIONS, expenseLabel } from "@/lib/labels";
import type { ExpenseCategory, ExpenseEntry, ExpenseInput, SalesEntry, SaleInput } from "@/lib/types";
import { useI18n } from "@/lib/auth";
import { ChoiceGroup } from "./choices";
import { Button } from "./ui/button";
import { CloseIcon, Modal } from "./ui/dialog";
import { Field, Input, Textarea } from "./ui/input";

type Mode = "sale" | "expense";

export function EntryDialog({
  open,
  mode,
  sale,
  expense,
  onOpenChange,
  onSaveSale,
  onSaveExpense,
}: {
  open: boolean;
  mode: Mode;
  sale: SalesEntry | null;
  expense: ExpenseEntry | null;
  onOpenChange: (open: boolean) => void;
  onSaveSale: (input: SaleInput) => void;
  onSaveExpense: (input: ExpenseInput) => void;
}) {
  const { language, tr } = useI18n();
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState("");
  const [category, setCategory] = useState("");
  const [expenseCategory, setExpenseCategory] = useState<ExpenseCategory | "">("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setError("");
    if (mode === "sale" && sale) {
      setAmount(String(sale.amount));
      setDate(sale.entry_date);
      setNote(sale.note ?? "");
      setCategory(sale.category ?? "");
      return;
    }
    if (mode === "expense" && expense) {
      setAmount(String(expense.amount));
      setDate(expense.entry_date);
      setNote(expense.note ?? "");
      setExpenseCategory(expense.category);
      return;
    }
    setAmount("");
    setDate(todayISO());
    setNote("");
    setCategory("");
    setExpenseCategory("");
  }, [open, mode, sale, expense]);

  function save() {
    const parsed = parseAmount(amount);
    if (parsed === null) {
      setError(tr("Enter an amount greater than zero.", "Kenya chelete e kholo ho zero."));
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setError(tr("Choose a valid date.", "Khetha letsatsi le nepahetseng."));
      return;
    }
    if (mode === "expense" && !expenseCategory) {
      setError(tr("Choose a category.", "Khetha sehlopha."));
      return;
    }
    if (mode === "sale") {
      onSaveSale({
        amount: parsed,
        entry_date: date,
        note: note.trim() || null,
        category: category.trim() || null,
      });
    } else if (expenseCategory) {
      onSaveExpense({
        amount: parsed,
        entry_date: date,
        category: expenseCategory,
        note: note.trim() || null,
      });
    }
    onOpenChange(false);
  }

  const editing = mode === "sale" ? Boolean(sale) : Boolean(expense);
  const title =
    mode === "sale"
      ? editing
        ? tr("Edit sale", "Fetola thekiso")
        : tr("Add sales", "Kenya thekiso")
      : editing
        ? tr("Edit expense", "Fetola tšenyehelo")
        : tr("Add expense", "Kenya tšenyehelo");

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      label={title}
      className="left-1/2 top-1/2 max-h-[min(720px,calc(100dvh-1.5rem))] w-[min(440px,calc(100%-1.5rem))] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[24px] border border-line"
    >
      <div className="flex max-h-[min(720px,calc(100dvh-1.5rem))] min-h-0 flex-col">
        <header className="flex items-start justify-between gap-3 px-5 pt-5">
          <div>
            <h2 className="text-[24px] font-semibold tracking-[-0.03em]">{title}</h2>
            <p className="mt-1 text-[13px] text-quiet">{tr("Amount in maloti (LSL)", "Chelete ka maloti (LSL)")}</p>
          </div>
          <CloseIcon label={tr("Close", "Koala")} />
        </header>
        <form
          className="grid min-h-0 flex-1 gap-5 overflow-y-auto px-5 py-5"
          onSubmit={(event) => {
            event.preventDefault();
            save();
          }}
        >
          <Field label={tr("Amount", "Chelete")}>
            <Input
              data-testid="entry-amount"
              inputMode="decimal"
              autoFocus
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="h-16 text-[32px] font-semibold tracking-[-0.03em]"
              placeholder="0.00"
            />
          </Field>
          <Field label={tr("Date", "Letsatsi")}>
            <Input data-testid="entry-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </Field>
          {mode === "sale" ? (
            <Field label={tr("Category, if useful", "Sehlopha, haeba se thusa")} hint={tr("Optional", "Ha se qobellehe")}>
              <Input
                data-testid="entry-category"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                placeholder={tr("Goods, services…", "Thepa, litšebeletso…")}
              />
            </Field>
          ) : (
            <ChoiceGroup
              label={tr("Category", "Sehlopha")}
              value={expenseCategory}
              testPrefix="expense"
              onChange={setExpenseCategory}
              options={EXPENSE_OPTIONS.map((value) => ({ value, label: expenseLabel(value, language) }))}
            />
          )}
          <Field label={tr("Note", "Tlhaloso")} hint={tr("Optional", "Ha e qobellehe")}>
            <Textarea data-testid="entry-note" value={note} maxLength={280} onChange={(event) => setNote(event.target.value)} />
          </Field>
          {error ? (
            <p role="alert" className="text-[14px] text-warn">
              {error}
            </p>
          ) : null}
          <Button type="submit" data-testid="entry-save">
            {tr("Save entry", "Boloka rekoto")}
          </Button>
        </form>
      </div>
    </Modal>
  );
}
