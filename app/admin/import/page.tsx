import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ImportClient from "./ui";

export const dynamic = "force-dynamic";

export default async function ImportPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return <main className="card"><p>Bitte <Link href="/login">einloggen</Link>.</p></main>;

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const role = (profile?.role ?? "azubi") as "admin" | "sales" | "azubi";
  if (role !== "admin") {
    return (
      <main className="card">
        <h1 style={{ marginTop: 0 }}>Excel Import</h1>
        <p>Nur Admin.</p>
        <Link href="/contacts">Zurück</Link>
      </main>
    );
  }

  return (
    <main className="card">
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ margin: 0 }}>Excel Import (Admin)</h1>
        <div className="row">
          <Link className="badge" href="/contacts">Ansprechpartner</Link>
          <Link className="badge" href="/">Home</Link>
        </div>
      </div>
      <p style={{ color: "#666" }}>
        XLSX hochladen → Kontakte/Kunden/Aktions-Häkchen werden in Supabase gespeichert.
      </p>
      <ImportClient />
    </main>
  );
}
