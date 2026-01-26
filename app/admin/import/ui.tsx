"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/client";

function truthy(v: any): boolean {
  if (v === true) return true;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    return s === "x" || s === "1" || s === "ja" || s === "yes" || s === "true";
  }
  return false;
}

// Mapping Excel -> DB keys
const ACTION_MAP: Record<string, string> = {
  "Your Logistics": "your_logistics",
  "Newsletter": "newsletter",
  "Pegelstand": "pegelstand",
  "Osteraktion": "osteraktion",
  "Spargelaktion": "spargelaktion",
  "Herbstaktion": "herbstaktion",
  "Adventskalender": "adventskalender",
  "Wandkalender 4 Monate": "wandkalender_4m",
  "Wandkalender 6 Monate": "wandkalender_6m",
  "Wandkalender Spezial": "wandkalender_spezial",
  "Tischkalender hoch": "tischkalender_hoch",
  "Tischkalender quer": "tischkalender_quer",
  "Personalisierte Kalender": "personalisierte_kalender",
  "Weihnachtsaktion": "weihnachtsaktion",
  // Fallback aus alter Spalte:
  "XMAS": "weihnachtsaktion",
};

export default function ImportClient() {
  const supabase = createClient();
  const [msg, setMsg] = useState<string>("");

  async function onFile(file: File) {
    setMsg("Lese Datei…");
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: "" });

    setMsg(`Zeilen: ${rows.length}. Importiere…`);

    // Heuristik für Spaltennamen
    const colCustomer = ["Firma", "Kunde", "Customer", "Company"].find((c) => c in (rows[0] ?? {})) ?? "Firma";
    const colName = ["Ansprechpartner", "Kontakt", "Name", "Contact"].find((c) => c in (rows[0] ?? {})) ?? "Ansprechpartner";
    const colEmail = ["E-Mail", "Email", "Mail"].find((c) => c in (rows[0] ?? {}));
    const colPhone = ["Telefon", "Phone", "Tel"].find((c) => c in (rows[0] ?? {}));
    const colStreet = ["Straße", "Street"].find((c) => c in (rows[0] ?? {}));
    const colZip = ["PLZ", "Zip"].find((c) => c in (rows[0] ?? {}));
    const colCity = ["Ort", "Stadt", "City"].find((c) => c in (rows[0] ?? {}));
    const colCountry = ["Land", "Country"].find((c) => c in (rows[0] ?? {}));
    const colNotes = ["Notiz", "Notes", "Bemerkung"].find((c) => c in (rows[0] ?? {}));

    // Upsert Kunden + Kontakte
    let ok = 0, fail = 0;

    for (const r of rows) {
      const customerName = String(r[colCustomer] ?? "").trim();
      const contactName = String(r[colName] ?? "").trim();
      if (!customerName || !contactName) continue;

      const customerPayload: any = {
        name: customerName,
        street: colStreet ? String(r[colStreet] ?? "").trim() : null,
        zip: colZip ? String(r[colZip] ?? "").trim() : null,
        city: colCity ? String(r[colCity] ?? "").trim() : null,
        country: colCountry ? String(r[colCountry] ?? "").trim() : null,
      };

      const { data: cust, error: custErr } = await supabase
        .from("customers")
        .upsert(customerPayload, { onConflict: "name" })
        .select("id")
        .single();

      if (custErr) { fail++; continue; }

      const contactPayload: any = {
        customer_id: cust.id,
        name: contactName,
        email: colEmail ? String(r[colEmail] ?? "").trim() : null,
        phone: colPhone ? String(r[colPhone] ?? "").trim() : null,
        notes: colNotes ? String(r[colNotes] ?? "").trim() : null,
      };

      const { data: contact, error: cErr } = await supabase
        .from("contacts")
        .upsert(contactPayload, { onConflict: "customer_id,name" })
        .select("id")
        .single();

      if (cErr) { fail++; continue; }

      // Flags
      const flags: any = { contact_id: contact.id };
      for (const [excelCol, dbKey] of Object.entries(ACTION_MAP)) {
        if (excelCol in r) flags[dbKey] = truthy(r[excelCol]);
      }
      const { error: fErr } = await supabase
        .from("action_flags")
        .upsert(flags, { onConflict: "contact_id" });

      if (fErr) { fail++; continue; }
      ok++;
    }

    setMsg(`Fertig. OK: ${ok}, Fehler: ${fail}`);
  }

  return (
    <div style={{ display: "grid", gap: 10, maxWidth: 520 }}>
      <input type="file" accept=".xlsx,.xls" onChange={(e) => {
        const f = e.target.files?.[0];
        if (f) onFile(f);
      }} />
      <div className="badge">{msg || "—"}</div>
      <p style={{ color: "#666" }}>
        Tipp: Wenn ihr viele Änderungen macht, importiert ihr einfach erneut (Upsert).
      </p>
    </div>
  );
}
