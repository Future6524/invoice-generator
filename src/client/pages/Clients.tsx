import { useState, type FormEvent } from "react";
import type { Client, NewClient } from "../../shared/types";
import { api, useApi } from "../api";

const blank: NewClient = { name: "", email: "", address: "" };

export function Clients() {
  const { data: clients, error: loadError, reload } = useApi<Client[]>("/clients");
  const [form, setForm] = useState(blank);
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!form.name.trim()) {
      setError("Client name is required.");
      return;
    }
    setSaving(true);
    try {
      await api.post<Client>("/clients", form);
      setForm(blank);
      setError(undefined);
      reload();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const set = (field: keyof NewClient) => (e: { target: { value: string } }) =>
    setForm((current) => ({ ...current, [field]: e.target.value }));

  return (
    <>
      <div className="page-header">
        <h1>Clients</h1>
      </div>

      <div className="clients-layout">
        <div className="card flush">
          {loadError && <div className="alert">{loadError}</div>}
          {clients?.length === 0 && <p className="empty">No clients yet. Add your first one using the form.</p>}
          {clients && clients.length > 0 && (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((client) => (
                    <tr key={client.id}>
                      <td>
                        <div className="client-name">{client.name}</div>
                        {client.address && <div className="client-address">{client.address}</div>}
                      </td>
                      <td>{client.email || <span className="muted">—</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <form className="card stack" onSubmit={handleSubmit} noValidate>
          <h2>Add a client</h2>
          {error && (
            <div className="alert" role="alert">
              {error}
            </div>
          )}
          <div>
            <label htmlFor="client-name">Name</label>
            <input id="client-name" value={form.name} onChange={set("name")} />
          </div>
          <div>
            <label htmlFor="client-email">Email</label>
            <input id="client-email" type="email" value={form.email} onChange={set("email")} />
          </div>
          <div>
            <label htmlFor="client-address">Address</label>
            <textarea id="client-address" rows={3} value={form.address} onChange={set("address")} />
          </div>
          <button type="submit" className="button primary" disabled={saving}>
            {saving ? "Adding…" : "Add client"}
          </button>
        </form>
      </div>
    </>
  );
}
