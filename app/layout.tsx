import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Ettlingen Kundenliste",
  description: "Firmen und Ansprechpartner",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>
        <div className="container">
          <header className="header">
            <div className="brand">
              {/* Lege euer Logwin-Logo als /public/logo.svg oder /public/logo.png ab */}
              <img src="/logo.jpg" alt="Logwin Logo" />
              <div>
                <div className="title">Kundenaktionen</div>
                <div className="small">Sales-Team • Aktionen • Filter • Export</div>
              </div>
            </div>
            <nav className="nav">
              <Link className="badge" href="/">Home</Link>
              <Link className="badge" href="/contacts">Ansprechpartner</Link>
              <Link className="badge" href="/admin/import">Admin Import</Link>
              <Link className="badge" href="/logout">Logout</Link>
            </nav>
          </header>

          {children}

          <footer className="small" style={{ marginTop: 16, opacity: 0.8 }}>
            © {new Date().getFullYear()} • interner Sales-Tracker
          </footer>
        </div>
      </body>
    </html>
  );
}
