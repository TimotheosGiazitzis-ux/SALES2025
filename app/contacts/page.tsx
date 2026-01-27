import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import ContactsTable from "./table";

export const dynamic = "force-dynamic";

export default async function ContactsPage() {
  const supabase = createClient();

  // --- Auth ---
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="card">
        <p>
          Bitte <Link href="/login">einloggen</Link>.
        </p>
      </main>
    );
  }

  // --- Rolle laden ---
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const role = (profile?.role ?? "azubi") as "admin" | "sales" | "azubi";

  // --- Kontakte + Kunden + Aktionen ---
  // WICHTIG: FK wird explizit erzwungen (!action_flags_contact_id_fkey)
  const { data, error } = await supabase
    .from("contacts")
    .select(`
      id,
      name,
      email,
      phone,
      title,
      notes,
      customer:customers (
        id,
        name,
        street,
        zip,
        city,
        country
      ),
      flags:action_flags!action_flags_contact_id_fkey ( * )
    `)
    .order("name", { ascending: true });

  if (error) {
    return (
      <main className="card">
        <h1 style={{ marginTop: 0 }}>Ansprechpartner</h1>
        <p style={{ color: "crimson" }}>{error.message}</p>
      </main>
    );
  }

  // --- flags normalisieren (ARRAY -> OBJEKT) ---
  const rows =
    (data ?? []).map((r: any) => ({
      ...r,
      flags: Array.isArray(r.flags) ? r.flags[0] : r.flags,
    })) ?? [];

  return (
    <main className="card">
      <div
        className="row"
        style={{ justifyContent: "space-between", alignItems: "center" }}
      >
        <h1 style={{ margin: 0 }}>Ansprechpartner</h1>
        <div className="row">
          <span className="badge">Role: {role}</span>
          <Link className="badge" href="/">
            Home
          </Link>
          <Link className="badge" href="/logout">
            Logout
          </Link>
        </div>
      </div>

      <p style={{ marginTop: 6, color: "#555" }}>
        Filtere nach Aktion/Ort/Name und sieh die Live-Zähler oben. Azubi ist
        read-only.
      </p>

      <ContactsTable role={role} rows={rows} />
    </main>
  );
}
