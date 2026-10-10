import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { formatDate } from "../../shared/dates";
import { formatHundredths, formatMoney, formatTaxRate } from "../../shared/money";
import type { Business, Invoice } from "../../shared/types";
import { api, useApi } from "../api";

export function InvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: invoice, error } = useApi<Invoice>(`/invoices/${id}`);
  const { data: business } = useApi<Business>("/business");
  const [deleteError, setDeleteError] = useState<string>();

  async function handleDelete() {
    if (!invoice || !window.confirm(`Delete invoice ${invoice.number}? This can't be undone.`)) return;
    try {
      await api.delete(`/invoices/${invoice.id}`);
      navigate("/invoices");
    } catch (err) {
      setDeleteError((err as Error).message);
    }
  }

  if (error) {
    return (
      <>
        <div className="alert">{error}</div>
        <Link to="/invoices">Back to invoices</Link>
      </>
    );
  }
  if (!invoice || !business) return <p className="muted">Loading…</p>;

  const pdfUrl = `/api/invoices/${invoice.id}/pdf`;

  return (
    <>
      <Link className="back-link" to="/invoices">
        ← Invoices
      </Link>
      <div className="page-header">
        <h1>
          {invoice.number} <span className="title-detail">· {invoice.client.name}</span>
        </h1>
        <div className="actions">
          <button type="button" className="button danger" onClick={handleDelete}>
            Delete
          </button>
          <a className="button" href={pdfUrl} target="_blank" rel="noreferrer">
            Open PDF
          </a>
          <a className="button primary" href={`${pdfUrl}?download=1`}>
            Download PDF
          </a>
        </div>
      </div>

      {deleteError && <div className="alert">{deleteError}</div>}

      <article className="card paper">
        <div className="paper-head">
          <div>
            <strong className="business-name">{business.name}</strong>
            <div className="address">{[business.address, business.email].filter(Boolean).join("\n")}</div>
          </div>
          <div>
            <div className="paper-title">INVOICE</div>
            <dl className="details">
              <dt>Invoice no.</dt>
              <dd>{invoice.number}</dd>
              <dt>Issued</dt>
              <dd>{formatDate(invoice.issueDate)}</dd>
              <dt>Due</dt>
              <dd>{formatDate(invoice.dueDate)}</dd>
            </dl>
          </div>
        </div>

        <div className="label">BILL TO</div>
        <strong>{invoice.client.name}</strong>
        <div className="address">{[invoice.client.address, invoice.client.email].filter(Boolean).join("\n")}</div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th className="num">Qty</th>
                <th className="num hide-mobile">Unit price</th>
                <th className="num">Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice.lineItems.map((line, i) => (
                <tr key={i}>
                  <td>{line.description}</td>
                  <td className="num">{formatHundredths(line.quantity)}</td>
                  <td className="num hide-mobile">{formatMoney(line.unitPrice)}</td>
                  <td className="num">{formatMoney(line.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="totals">
          <div className="totals-row">
            <span className="muted">Subtotal</span>
            <span>{formatMoney(invoice.subtotal)}</span>
          </div>
          <div className="totals-row">
            <span className="muted">Tax ({formatTaxRate(invoice.taxRate)})</span>
            <span>{formatMoney(invoice.tax)}</span>
          </div>
          <div className="totals-row grand">
            <span>Total due</span>
            <span>{formatMoney(invoice.total)}</span>
          </div>
        </div>

        {invoice.notes && (
          <div className="notes">
            <div className="label">NOTES</div>
            {invoice.notes}
          </div>
        )}
      </article>
    </>
  );
}
