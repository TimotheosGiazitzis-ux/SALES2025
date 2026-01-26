export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function LogoutPage() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect("/");
}
