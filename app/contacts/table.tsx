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
        const f = r.flags; // <-- FIX: flags ist Objekt, nicht Array
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
      const f = r.flags; // <-- FIX
      if (!f) continue;
      for (const a of ACTIONS) if (f[a.key] === true) perAction[a.key] += 1;
    }

    return { totalContacts, totalCustomers, perAction };
  }, [filtered]);

  async function toggleFlag(contactId: string, key: string, next: boolean) {
    if (!writable) return;

    const { error } = await supabase
      .from("action_flags")
      .upsert({ contact_id: contactId, [key]: next }, { onConflict: "contact_id" });

    if (error) {
      alert(error.message);
      return;
    }

    // Einfachste Lösung: reload (für Starter ok)
    window.location.reload();
  }

  return (
    <>
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
            <div style={{ fontSize: 12, color: "#666" }}>Aktion-Zähler (gefiltert)</div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 6 }}>
              {ACTIONS.slice(0, 7).map((a) => (
                <span key={a.key} className="badge">
                  {a.label}: {kpis.perAction[a.key] ?? 0}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="row" style={{ gap: 10 }}>
          <Link className="badge" href="/">Home</Link>
          <Link className="badge" href="/logout">Logout</Link>
        </div>
      </div>

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
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          style={{ padding: 8, borderRadius: 12, border: "1px solid #ddd" }}
        >
          <option value="">Aktion-Filter (alle)</option>
          {ACTIONS.map((a) => (
            <option key={a.key} value={a.key}>
              {a.label}
            </option>
          ))}
        </select>
      </div>

      <p style={{ color: "#666", marginTop: 6 }}>
        {writable ? "Du kannst Aktionen per Checkbox setzen." : "Read-only (Azubi): keine Änderungen möglich."}
      </p>

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
            const f = r.flags ?? {}; // <-- FIX: flags ist Objekt
            return (
              <tr key={r.id}>
                <td>
                  <strong>{r.customer?.name ?? "-"}</strong>
                </td>

                <td>{r.name ?? "-"}</td>

                <td>
                  {r.email && <div>{r.email}</div>}
                  {r.phone && <div>{r.phone}</div>}
                  {r.title && <div style={{ color: "#666" }}>{r.title}</div>}
                </td>

                <td>
                  <div>
                    {r.customer?.zip ?? ""} {r.customer?.city ?? ""}
                  </div>
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
    </>
  );
}
