import { Link, useNavigate } from "react-router";
import { formatDate } from "../../shared/dates";
import { formatMoney } from "../../shared/money";
import type { InvoiceSummary } from "../../shared/types";
import { useApi } from "../api";

export function InvoiceList() {
  const { data: invoices, error, loading } = useApi<InvoiceSummary[]>("/invoices");
  const navigate = useNavigate();

  return (
    <>
      <div className="page-header">
        <h1>Invoices</h1>
        <Link className="button primary" to="/invoices/new">
          New invoice
        </Link>
      </div>

      {error && <div className="alert">{error}</div>}

      <div className="card flush">
        {loading && <p className="empty">Loading…</p>}
        {invoices?.length === 0 && (
          <p className="empty">
            No invoices yet. <Link to="/invoices/new">Create your first invoice</Link>.
          </p>
        )}
        {invoices && invoices.length > 0 && (
          <div className="table-wrap">
            <table className="clickable-rows">
              <thead>
                <tr>
                  <th>Number</th>
                  <th>Client</th>
                  <th>Issued</th>
                  <th>Due</th>
                  <th className="num">Total</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id} onClick={() => navigate(`/invoices/${invoice.id}`)}>
                    <td>
                      <Link to={`/invoices/${invoice.id}`}>{invoice.number}</Link>
                    </td>
                    <td>{invoice.clientName}</td>
                    <td>{formatDate(invoice.issueDate)}</td>
                    <td>{formatDate(invoice.dueDate)}</td>
                    <td className="num">{formatMoney(invoice.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
