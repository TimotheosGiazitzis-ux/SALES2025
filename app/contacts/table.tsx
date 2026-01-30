"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { canWrite } from "@/lib/auth";
import { createClient } from "@/lib/supabase/client";

const ACTIONS: { key: string; label: string }[] = [
  { key: "your_logistics", label: "Your Logistics" },
  { key: "newsletter", label: "Newsletter" },
  { key: "pegelstand", label: "Pegelstand" },
  { key: "osteraktion", label: "Osteraktion" },
  { key: "spargelaktion", label: "Spargelaktion" },
  { key: "herbstaktion", label: "Herbstaktion" },
  { key: "adventskalender", label: "Adventskalender" },
  { key: "wandkalender_4m", label: "Wandkalender 4 Monate" },
  { key: "wandkalender_6m", label: "Wandkalender 6 Monate" },
  { key: "wandkalender_spezial", label: "Wandkalender Spezial" },
  { key: "tischkalender_hoch", label: "Tischkalender hoch" },
  { key: "tischkalender_quer", label: "Tischkalender quer" },
  { key: "personalisierte_kalender", label: "Personalisierte Kalender" },
  { key: "weihnachtsaktion", label: "Weihnachtsaktion" },
];

export default function ContactsTable({
  role,
  rows,
}: {
  role: "admin" | "sales" | "azubi";
  rows: any[];
}) {
  const supabase = createClient();
  const writable = canWrite(role);

  const [q, setQ] = useState("");
  const [country, setCountry] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("");

  // NEW: Popup für Email-Liste
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const countries = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) if (r.customer?.country) set.add(r.customer.country);
    return Array.from(set).sort();
  }, [rows]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return rows.filter((r) => {
      const hay = [
        r.name,
        r.email,
        r.phone,
        r.customer?.name,
        r.customer?.city,
        r.customer?.zip,
        r.customer?.country,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      if (qq && !hay.includes(qq)) return false;
      if (country && (r.customer?.country ?? "") !== country) return false;

      if (actionFilter) {
        const f = r.flags; // flags ist Objekt
        if (!f || f[actionFilter] !== true) return false;
      }
      return true;
    });
  }, [rows, q, country, actionFilter]);

  const kpis = useMemo(() => {
    const totalContacts = filtered.length;
    const totalCustomers = new Set(filtered.map((r) => r.customer?.id).filter(Boolean)).size;

    const perAction: Record<string, number> = {};
    for (const a of ACTIONS) perAction[a.key] = 0;

    for (const r of filtered) {
      const f = r.flags;
      if (!f) continue;
      for (const a of ACTIONS) if (f[a.key] === true) perAction[a.key] += 1;
    }

    return { totalContacts, totalCustomers, perAction };
  }, [filtered]);

  // NEW: Emails für ausgewählte Aktion (aus aktuellem Filter!)
  const actionEmails = useMemo(() => {
    if (!selectedAction) return [];
    const list = filtered
      .filter((r) => r?.flags?.[selectedAction] === true)
      .map((r) => String(r.email ?? "").trim())
      .filter((e) => e && e.includes("@"));

    // Unique + sort
    return Array.from(new Set(list)).sort((a, b) => a.localeCompare(b));
  }, [filtered, selectedAction]);

  const selectedActionLabel = useMemo(() => {
    if (!selectedAction) return "";
    return ACTIONS.find((a) => a.key === selectedAction)?.label ?? selectedAction;
  }, [selectedAction]);

  async function copyEmails() {
    try {
      const text = actionEmails.join("\n");
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch (e) {
      alert("Kopieren hat nicht geklappt. Bitte markiere die Liste manuell und kopiere sie.");
    }
  }

  async function toggleFlag(contactId: string, key: string, next: boolean) {
    if (!writable) return;

    const { error } = await supabase
      .from("action_flags")
      .upsert({ contact_id: contactId, [key]: next }, { onConflict: "contact_id" });

    if (error) {
      alert(error.message);
      return;
    }

    window.location.reload();
  }

  return (
    <>
      {/* TOP BAR */}
      <div className="row" style={{ margin: "12px 0", justifyContent: "space-between", alignItems: "center" }}>
        <div className="row" style={{ gap: 12, flexWrap: "wrap" }}>
          <div className="kpi">
            <div style={{ fontSize: 12, color: "#666" }}>Kunden (gefiltert)</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{kpis.totalCustomers}</div>
          </div>
          <div className="kpi">
            <div style={{ fontSize: 12, color: "#666" }}>Ansprechpartner (gefiltert)</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{kpis.totalContacts}</div>
          </div>

          <div className="kpi" style={{ flex: 1, minWidth: 320 }}>
            <div style={{ fontSize: 12, color: "#666" }}>Aktion-Zähler (gefiltert) – klickbar für E-Mail-Liste</div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 6 }}>
              {ACTIONS.slice(0, 7).map((a) => (
                <button
                  key={a.key}
                  type="button"
                  className="badge"
                  onClick={() => setSelectedAction(a.key)}
                  style={{
                    border: "1px solid #ddd",
                    background: "transparent",
                    cursor: "pointer",
                  }}
                  title="Klicken für E-Mail-Liste"
                >
                  {a.label}: {kpis.perAction[a.key] ?? 0}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="row" style={{ gap: 10 }}>
          <Link className="badge" href="/">Home</Link>
          <Link className="badge" href="/logout">Logout</Link>
        </div>
      </div>

      {/* FILTERS */}
      <div className="row" style={{ margin: "10px 0", gap: 10, flexWrap: "wrap" }}>
        <input
          placeholder="Suche (Name/Firma/Ort/E-Mail...)"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ padding: 8, minWidth: 260, flex: 1, border: "1px solid #ddd", borderRadius: 12 }}
        />

        <select
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          style={{ padding: 8, borderRadius: 12, border: "1px solid #ddd" }}
        >
          <option value="">Land (alle)</option>
          {countries.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          style={{ padding: 8, borderRadius: 12, border: "1px solid #ddd" }}
        >
          <option value="">Aktion-Filter (alle)</option>
          {ACTIONS.map((a) => (
            <option key={a.key} value={a.key}>{a.label}</option>
          ))}
        </select>
      </div>

      <p style={{ color: "#666", marginTop: 6 }}>
        {writable ? "Du kannst Aktionen per Checkbox setzen." : "Read-only (Azubi): keine Änderungen möglich."}
      </p>

      {/* TABLE */}
      <table className="table">
        <thead>
          <tr>
            <th>Firma</th>
            <th>Ansprechpartner</th>
            <th>Kontakt</th>
            <th>Ort</th>
            <th>Aktionen</th>
          </tr>
        </thead>

        <tbody>
          {filtered.map((r) => {
            const f = r.flags ?? {};
            return (
              <tr key={r.id}>
                <td><strong>{r.customer?.name ?? "-"}</strong></td>
                <td>{r.name ?? "-"}</td>
                <td>
                  {r.email && <div>{r.email}</div>}
                  {r.phone && <div>{r.phone}</div>}
                  {r.title && <div style={{ color: "#666" }}>{r.title}</div>}
                </td>
                <td>
                  <div>{r.customer?.zip ?? ""} {r.customer?.city ?? ""}</div>
                  <div style={{ color: "#666" }}>{r.customer?.country ?? ""}</div>
                </td>
                <td style={{ minWidth: 420 }}>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {ACTIONS.map((a) => (
                      <label
                        key={a.key}
                        className="badge"
                        style={{ cursor: writable ? "pointer" : "not-allowed", opacity: writable ? 1 : 0.6 }}
                      >
                        <input
                          type="checkbox"
                          checked={!!f[a.key]}
                          disabled={!writable}
                          onChange={(e) => toggleFlag(r.id, a.key, e.target.checked)}
                          style={{ marginRight: 6 }}
                        />
                        {a.label}
                      </label>
                    ))}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* POPUP: EMAIL LIST */}
      {selectedAction && (
        <div
          onClick={() => setSelectedAction(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            zIndex: 9999,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(720px, 95vw)",
              background: "white",
              borderRadius: 16,
              border: "1px solid #e5e5e5",
              padding: 16,
              boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800 }}>
                  E-Mails für Aktion: {selectedActionLabel}
                </div>
                <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
                  (basierend auf deinem aktuellen Filter) • {actionEmails.length} E-Mail(s)
                </div>
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  onClick={copyEmails}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 10,
                    border: "1px solid #ddd",
                    cursor: "pointer",
                    background: "white",
                    fontWeight: 700,
                  }}
                >
                  {copied ? "✓ Kopiert" : "Kopieren"}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedAction(null)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 10,
                    border: "1px solid #ddd",
                    cursor: "pointer",
                    background: "white",
                    fontWeight: 700,
                  }}
                >
                  Schließen
                </button>
              </div>
            </div>

            <textarea
              readOnly
              value={actionEmails.join("\n")}
              style={{
                width: "100%",
                height: 280,
                marginTop: 12,
                borderRadius: 12,
                border: "1px solid #ddd",
                padding: 12,
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
                fontSize: 13,
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}
