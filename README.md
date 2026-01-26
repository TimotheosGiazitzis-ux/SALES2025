# Kundenaktionen Web-App (Team + Azubi Read-Only) – Starter

Dieses Repo ist ein **lauffähiger Starter** für eure Kunden-/Ansprechpartner-Liste als Web-App:
- Login (E-Mail/Passwort) über **Supabase Auth**
- Rollen: **admin**, **sales**, **azubi** (Azubi = *read-only*, serverseitig + DB-seitig erzwungen)
- Tabelle mit Suche/Filtern + Live-Zähler pro Aktion
- Excel Import/Export (Import nur admin)

> Hinweis: Das ist ein Starter/Blueprint. Er ist bewusst schlank gehalten, damit ihr schnell live gehen könnt.
> Für Produktivbetrieb: Domain, Backup, Monitoring, Audit-Log optional.

---

## 1) Voraussetzungen
- Node.js 20+
- Ein Supabase Projekt (DB + Auth)

---

## 2) Supabase einrichten
1. Neues Supabase Projekt erstellen
2. In Supabase: **SQL Editor** → Script `supabase/schema.sql` ausführen
3. Danach: `supabase/seed.sql` ausführen (erstellt einen Admin-User-Eintrag in `profiles` – *ohne* Passwort; Passwort setzt ihr im Auth UI)

### Nutzer anlegen + Rollen setzen
- Legt User in **Authentication → Users** an (E-Mail + Passwort)
- Dann in der Tabelle `public.profiles` die Rolle setzen:
  - `admin`
  - `sales`
  - `azubi`

Azubi kann **nur lesen** (RLS Policies verhindern INSERT/UPDATE/DELETE).

---

## 3) Env Variablen
Kopiert `.env.example` → `.env.local` und füllt aus:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## 4) Lokal starten
```bash
npm install
npm run dev
```
Öffne http://localhost:3000

---

## 5) Deployment (Vercel)
- Repo zu GitHub pushen
- In Vercel importieren
- Env Variablen in Vercel setzen (wie oben)
- Deploy

---

## 6) Excel Import
Als Admin: `/admin/import`
- XLSX hochladen
- Mapping erfolgt über die Spaltennamen (siehe unten)

### Erwartete Spalten (Excel)
Mindestens:
- `Firma` (oder `Kunde`)
- `Ansprechpartner` (Name)
Optional:
- Adresse/PLZ/Ort/Land/E-Mail/Telefon/Notiz …
Und die Aktionsspalten als 0/1 oder leer/"x":
- Your Logistics
- Newsletter
- Pegelstand
- Osteraktion
- Spargelaktion
- Herbstaktion
- Adventskalender
- Wandkalender 4 Monate
- Wandkalender 6 Monate
- Wandkalender Spezial
- Tischkalender hoch
- Tischkalender quer
- Personalisierte Kalender
- Weihnachtsaktion

---

## 7) Sicherheit / Read-Only für Azubis
- UI: Azubi sieht keine Edit-Buttons
- Server: jede Mutations-Route prüft Role
- DB: RLS Policies blockieren Mutationen für Azubi

---

## Struktur
- `app/` Next.js App Router
- `lib/supabase/` Supabase Client Helfer
- `supabase/schema.sql` Tabellen + RLS
- `app/admin/import/` Excel Import (Admin only)
