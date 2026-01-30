"use client";

import { useMemo, useState } from "react";
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

type Role = "admin" | "sales" | "azubi";
type Flags = Record<string, any>;

type Row = {
  id: string; // contact id
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  title?: string | null;
  notes?: string | null;
  customer?: {
    id?: string | null;
    name?: string | null;
    city?: string | null;
    zip?: string | null;
    country?: string | null;
  } | null;
  flags?: Flags | null; // action_flags as object
};

export default function ContactsTable({ role, rows }: { role: Role; rows: any[] }) {
  const supabase = createClient();
  const writable = canWrite(role);

  const [q, setQ] = useState("");
  const [country, setCountry] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("");

  // Accordion (Firma auf/zu)
  const [openCustomerId, setOpenCustomerId] = useState<string | null>(null);

  // Email-Popup
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Normalize rows: flags ist Objekt
  const normalized: Row[] = useMemo(() => {
    return (rows ?? []).map((r: any) => ({
      ...r,
      flags: r.flags ?? {},
    }));
  }, [rows]);

  const countries = useMemo(() => {
    const set = new Set<string>();
    for (const r of normalized) if (r.customer?.country) set.add(r.customer.country);
    return Array.from(set).sort();
  }, [normalized]);

  const filteredContacts = useMemo(() => {
    const qq = q.trim().toLowerCase();

    return normalized.filter((r) => {
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
        const f = r.flags ?? {};
        if (f[actionFilter] !== true) return false;
      }
      return true;
    });
  }, [normalized, q, country, actionFilter]);

  // KPI: pro Ansprechpartner zählen
  const kpis = useMemo(() => {
    const totalContacts = filteredContacts.length;
    const totalCustomers = new Set(filteredContacts.map((r) => r.customer?.id).filter(Boolean)).size;

    const perAction: Record<string, number> = {};
    for (const a of ACTIONS) perAction[a.key] = 0;

    for (const r of filteredContacts) {
      const f = r.flags ?? {};
      for (const a of ACTIONS) if (f[a.key] === true) perAction[a.key] += 1;
    }

    return { totalContacts, totalCustomers, perAction };
  }, [filteredContacts]);

  // Gruppieren nach Firma
  const grouped = useMemo(() => {
    const map = new Map<
      string,
      { customerId: string; customerName: string; customer: any; contacts: Row[] }
    >();

    for (const r of filteredContacts) {
      const cid = (r.customer?.id ?? "NO_CUSTOMER") as string;
      const cname = (r.customer?.name ?? "— ohne Firma —") as string;

      if (!map.has(cid)) map.set(cid, { customerId: cid, customerName: cname, customer: r.customer ?? {}, contacts: [] });
      map.get(cid)!.contacts.push(r);
    }

    const arr = Array.from(map.values()).sort((a, b) => a.customerName.localeCompare(b.customerName, "de"));
    for (const g of arr) g.contacts.sort((a, b) => (a.name ?? "").localeCompare(b.name ?? "", "de"));
    return arr;
  }, [filteredContacts]);

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

  function toggleOpen(cid: string) {
    setOpenCustomerId((prev) => (prev === cid ? null : cid));
  }

  // Emails für ausgewählte Aktion (aus aktuellem Filter!)
  const actionEmails = useMemo(() => {
    if (!selectedAction) return [];
    const list = filteredContacts
      .filter((r) => (r.flags ?? {})[selectedAction] === true)
      .map((r) => String(r.email ?? "").trim())
      .filter((e) => e && e.includes("@"));
    return Array.from(new Set(list)).sort((a, b) => a.localeCompare(b));
  }, [filteredContacts, selectedAction]);

  const selectedActionLabel = useMemo(() => {
    if (!selectedAction) return "";
    return ACTIONS.find((a) => a.key === selectedAction)?.label ?? selectedAction;
  }, [selectedAction]);

  async function copyEmails() {
    try {
      await navigator.clipboard.writeText(actionEmails.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      alert("Kopieren hat nicht geklappt. Bitte markiere die Liste manuell und kopiere sie.");
    }
  }

  return (
    <>
      {/* KPIs */}
      <div className="row" style={{ margin: "12px 0" }}>
        <div className="kpi">
          <div style={{ fontSize: 12, color: "#666" }}>Kunden (gefiltert)</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{kpis.totalCustomers}</div>
        </div>
        <div className="kpi">
          <div style={{ fontSize: 12, color: "#666" }}>Ansprechpartner (gefiltert)</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{kpis.totalContacts}</div>
        </div>
        <div className="kpi" style={{ flex: 1, minWidth: 280 }}>
          <div style={{ fontSize: 12, color: "#666" }}>Aktion-Zähler (gefiltert) – klickbar für E-Mail-Liste</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 6 }}>
            {ACTIONS.map((a) => (
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

      {/* Filter */}
      <div className="row" style={{ margin: "10px 0" }}>
        <input
          placeholder="Suche (Firma/Ort/Name/E-Mail...)"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ padding: 8, minWidth: 260, flex: 1, border: "1px solid #ddd", borderRadius: 12 }}
        />
        <select value={country} onChange={(e) => setCountry(e.target.value)} style={{ padding: 8, borderRadius: 12, border: "1px solid #ddd" }}>
          <option value="">Land (alle)</option>
          {countries.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} style={{ padding: 8, borderRadius: 12, border: "1px solid #ddd" }}>
          <option value="">Aktion-Filter (alle)</option>
          {ACTIONS.map((a) => (
            <option key={a.key} value={a.key}>{a.label}</option>
          ))}
        </select>
      </div>

      <p style={{ color: "#666", marginTop: 6 }}>
        {writable ? "Firma anklicken → Ansprechpartner klappt aus. Aktionen setzt du pro Ansprechpartner." : "Read-only (Azubi): keine Änderungen möglich."}
      </p>

      {/* Firmenliste */}
      <table className="table">
        <thead>
          <tr>
            <th>Firma</th>
            <th>Ort</th>
            <th>Land</th>
            <th>Ansprechpartner</th>
          </tr>
        </thead>
        <tbody>
          {grouped.map((g) => {
            const isOpen = openCustomerId === g.customerId;
            return (
              <>
                <tr key={g.customerId} style={{ cursor: "pointer" }} onClick={() => toggleOpen(g.customerId)}>
                  <td>
                    <strong>{g.customerName}</strong>{" "}
                    <span className="small" style={{ marginLeft: 8 }}>{isOpen ? "▲" : "▼"}</span>
                  </td>
                  <td>{g.customer?.zip ?? ""} {g.customer?.city ?? ""}</td>
                  <td>{g.customer?.country ?? ""}</td>
                  <td><span className="badge">{g.contacts.length}</span></td>
                </tr>

                {isOpen && (
                  <tr key={g.customerId + "__open"}>
                    <td colSpan={4}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "10px 6px" }}>
                        {g.contacts.map((r) => {
                          const f = r.flags ?? {};
                          return (
                            <div key={r.id} className="card" style={{ padding: 12 }}>
                              <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
                                <div>
                                  <div style={{ fontWeight: 700 }}>{r.name ?? "-"}</div>
                                  <div className="small" style={{ marginTop: 2 }}>
                                    {r.email ? <div>{r.email}</div> : null}
                                    {r.phone ? <div>{r.phone}</div> : null}
                                    {r.title ? <div>{r.title}</div> : null}
                                  </div>
                                </div>
                                <div className="small" style={{ color: "#666" }}>
                                  Aktionen: {ACTIONS.reduce((n, a) => n + (f[a.key] ? 1 : 0), 0)}
                                </div>
                              </div>

                              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
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
                            </div>
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                )}
              </>
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
                fontFamily:
                  "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
                fontSize: 13,
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}
