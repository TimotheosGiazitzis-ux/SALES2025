"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const supabase = createClient();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return setErr(error.message);
    router.push("/contacts");
    router.refresh();
  }

  return (
    <main className="card" style={{ maxWidth: 460, margin: "0 auto" }}>
      <h1 className="h1">Login</h1>
      <p className="small">Zugang per E-Mail & Passwort.</p>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 10, marginTop: 10 }}>
        <label className="small">E-Mail</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: "100%", padding: 10, borderRadius: 14 }} />

        <label className="small">Passwort</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ width: "100%", padding: 10, borderRadius: 14 }} />

        <button disabled={loading} style={{ padding: 12, borderRadius: 14 }}>
          {loading ? "..." : "Einloggen"}
        </button>
        {err && <div className="toast" style={{ borderColor: "rgba(255,107,107,.45)", color: "var(--danger)" }}>{err}</div>}
      </form>
    </main>
  );
}
