import "./globals.css";
import Link from "next/link";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <body>
        <div className="container">
          <header className="header">
            <div className="brand">
              <img src="/logo.jpg" alt="Logwin Logo" height={34} />
              <div>
                <div className="title">SALES KAE</div>
                <div className="small">
                  Kundenliste • Aktionen • Newsletter
                </div>
              </div>
            </div>

            <nav className="nav">
              <Link className="badge" href="/">Home</Link>
              <Link className="badge" href="/contacts">Ansprechpartner</Link>
              <Link className="badge" href="/admin/import">Admin Import</Link>
              <Link className="badge" href="/logout">Logout</Link>
            </nav>
          </header>

          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}
