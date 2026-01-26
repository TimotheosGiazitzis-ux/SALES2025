export const dynamic = "force-dynamic";

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function Page() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <main className="card">
      <h1 className="h1">Start</h1>
      <div className="hr" />
      {!user ? (
        <>
          <p className="small">Bitte einloggen, um die Kundenaktionen zu sehen.</p>
          <Link className="badge" href="/login">➡️ Login</Link>
        </>
      ) : (
        <>
          <p className="small">Angemeldet als <span className="badge">{user.email}</span></p>
          <div className="row">
            <Link className="badge" href="/contacts">Ansprechpartner</Link>
            <Link className="badge" href="/admin/import">Admin: Excel Import</Link>
          </div>
        </>
      )}
    </main>
  );
}
