import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { addDays, today } from "../../shared/dates";
import { formatMoney, formatTaxRate, parseHundredths } from "../../shared/money";
import { calculateTotals } from "../../shared/totals";
import type { Client, Invoice, NewInvoice as NewInvoiceBody } from "../../shared/types";
import { api, useApi } from "../api";

// The form keeps what the user typed as text; it is converted to cents and
// hundredths for the live totals and again when the invoice is saved.
interface LineDraft {
  key: number;
  description: string;
  quantity: string;
  unitPrice: string;
}

let nextKey = 1;
const emptyLine = (): LineDraft => ({ key: nextKey++, description: "", quantity: "1", unitPrice: "" });

function lineProblems(line: LineDraft) {
  const quantity = parseHundredths(line.quantity);
  return {
    description: line.description.trim() === "",
    quantity: quantity === null || quantity === 0,
    unitPrice: parseHundredths(line.unitPrice) === null,
  };
}

export function NewInvoice() {
  const navigate = useNavigate();
  const { data: clients } = useApi<Client[]>("/clients");

  const [clientId, setClientId] = useState("");
  const [issueDate, setIssueDate] = useState(today);
  const [dueDate, setDueDate] = useState(() => addDays(today(), 30));
  const [taxRate, setTaxRate] = useState("0");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<LineDraft[]>(() => [emptyLine()]);
  const [showErrors, setShowErrors] = useState(false);
  const [serverError, setServerError] = useState<string>();
  const [saving, setSaving] = useState(false);

  const parsedTax = parseHundredths(taxRate);
  const taxInvalid = parsedTax === null || parsedTax > 10_000;
  const totals = calculateTotals(
    lines.map((line) => ({
      quantity: parseHundredths(line.quantity) ?? 0,
      unitPrice: parseHundredths(line.unitPrice) ?? 0,
    })),
    taxInvalid ? 0 : parsedTax,
  );

  const formProblem = !clientId
    ? "Choose a client."
    : dueDate < issueDate
      ? "The due date can't be before the issue date."
      : taxInvalid
        ? "Tax rate must be a number between 0 and 100."
        : lines.some((line) => Object.values(lineProblems(line)).some(Boolean))
          ? "Check the highlighted line items: each needs a description, a quantity above zero and a price."
          : undefined;
  const shownError = (showErrors && formProblem) || serverError;

  function updateLine(key: number, field: keyof Omit<LineDraft, "key">, value: string) {
    setLines((current) => current.map((line) => (line.key === key ? { ...line, [field]: value } : line)));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setShowErrors(true);
    setServerError(undefined);
    if (formProblem) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const body: NewInvoiceBody = {
      clientId: Number(clientId),
      issueDate,
      dueDate,
      taxRate: parsedTax!,
      notes,
      lineItems: lines.map((line) => ({
        description: line.description.trim(),
        quantity: parseHundredths(line.quantity)!,
        unitPrice: parseHundredths(line.unitPrice)!,
      })),
    };

    setSaving(true);
    try {
      const invoice = await api.post<Invoice>("/invoices", body);
      navigate(`/invoices/${invoice.id}`);
    } catch (err) {
      setServerError((err as Error).message);
      setSaving(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <Link className="back-link" to="/invoices">
        ← Invoices
      </Link>
      <div className="page-header">
        <h1>New invoice</h1>
      </div>

      {shownError && (
        <div className="alert" role="alert">
          {shownError}
        </div>
      )}

      <div className="card">
        <div className="field-grid">
          <div>
            <label htmlFor="client">Client</label>
            <select
              id="client"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              aria-invalid={showErrors && !clientId}
            >
              <option value="">Select a client…</option>
              {clients?.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
            {clients?.length === 0 && (
              <p className="muted">
                You have no clients yet. <Link to="/clients">Add one first</Link>.
              </p>
            )}
          </div>
          <div>
            <label htmlFor="issue-date">Issue date</label>
            <input id="issue-date" type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
          </div>
          <div>
            <label htmlFor="due-date">Due date</label>
            <input
              id="due-date"
              type="date"
              value={dueDate}
              min={issueDate}
              onChange={(e) => setDueDate(e.target.value)}
              aria-invalid={showErrors && dueDate < issueDate}
            />
          </div>
        </div>
      </div>

      <div className="card">
        <h2>Line items</h2>
        <div className="line-items-head" aria-hidden="true">
          <span>Description</span>
          <span className="num">Qty</span>
          <span className="num">Unit price</span>
          <span className="num">Amount</span>
          <span />
        </div>

        {lines.map((line, index) => {
          const problems = showErrors ? lineProblems(line) : undefined;
          return (
            <div className="line-item" key={line.key}>
              <input
                className="description"
                placeholder="What did you do or sell?"
                aria-label={`Line ${index + 1} description`}
                value={line.description}
                onChange={(e) => updateLine(line.key, "description", e.target.value)}
                aria-invalid={problems?.description}
              />
              <div>
                <span className="mobile-label" aria-hidden="true">Qty</span>
                <input
                  className="number"
                  inputMode="decimal"
                  aria-label={`Line ${index + 1} quantity`}
                  value={line.quantity}
                  onChange={(e) => updateLine(line.key, "quantity", e.target.value)}
                  aria-invalid={problems?.quantity}
                />
              </div>
              <div>
                <span className="mobile-label" aria-hidden="true">Unit price</span>
                <input
                  className="number"
                  inputMode="decimal"
                  placeholder="0.00"
                  aria-label={`Line ${index + 1} unit price`}
                  value={line.unitPrice}
                  onChange={(e) => updateLine(line.key, "unitPrice", e.target.value)}
                  aria-invalid={problems?.unitPrice}
                />
              </div>
              <span className="amount">{formatMoney(totals.lineAmounts[index])}</span>
              <button
                type="button"
                className="icon-button"
                aria-label={`Remove line ${index + 1}`}
                title="Remove line"
                disabled={lines.length === 1}
                onClick={() => setLines((current) => current.filter((l) => l.key !== line.key))}
              >
                ×
              </button>
            </div>
          );
        })}

        <button type="button" className="button add-line" onClick={() => setLines((current) => [...current, emptyLine()])}>
          Add line
        </button>

        <div className="invoice-footer">
          <div>
            <label htmlFor="notes">Notes</label>
            <textarea
              id="notes"
              placeholder="Payment terms, bank details, a thank-you note…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <div className="totals">
            <div className="totals-row">
              <span className="muted">Subtotal</span>
              <span>{formatMoney(totals.subtotal)}</span>
            </div>
            <div className="totals-row">
              <span className="tax-input">
                <label htmlFor="tax-rate" className="inline-label">
                  Tax
                </label>
                <input
                  id="tax-rate"
                  inputMode="decimal"
                  value={taxRate}
                  onChange={(e) => setTaxRate(e.target.value)}
                  aria-invalid={taxInvalid}
                />
                <span className="muted">%</span>
              </span>
              <span>{formatMoney(totals.tax)}</span>
            </div>
            <div className="totals-row grand">
              <span>Total</span>
              <span>{formatMoney(totals.total)}</span>
            </div>
            {!taxInvalid && parsedTax! > 0 && (
              <p className="hint">
                Tax at {formatTaxRate(parsedTax!)} is applied to the subtotal.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="form-actions">
        <Link className="button" to="/invoices">
          Cancel
        </Link>
        <button type="submit" className="button primary" disabled={saving}>
          {saving ? "Saving…" : "Save invoice"}
        </button>
      </div>
    </form>
  );
}
