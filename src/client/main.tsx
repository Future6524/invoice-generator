import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, NavLink, Route, Routes } from "react-router";
import { Clients } from "./pages/Clients";
import { InvoiceList } from "./pages/InvoiceList";
import "./styles.css";

function App() {
  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <span className="brand">Invoice Generator</span>
          <nav>
            <NavLink to="/invoices">Invoices</NavLink>
            <NavLink to="/clients">Clients</NavLink>
          </nav>
        </div>
      </header>
      <main className="page">
        <Routes>
          <Route path="/" element={<Navigate to="/invoices" replace />} />
          <Route path="/invoices" element={<InvoiceList />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="*" element={<p>Page not found.</p>} />
        </Routes>
      </main>
    </>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
