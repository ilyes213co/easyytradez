import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

interface PageProps {
  params: { id: string };
}

export const dynamic = "force-dynamic";

export default async function StoreDesignPage({ params }: PageProps) {
  const { id } = params;

  // Fetch the store so we can hand its current theme to the editor.
  // If the store doesn't exist or the request fails, just redirect to
  // the store overview rather than crash.
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
    const { data } = await supabase
      .from("stores")
      .select("id, theme, primary_color, animation_style")
      .eq("id", id)
      .single();

    if (!data) {
      redirect("/dashboard");
    }

    // The interactive theme editor lives at /dashboard/store/[id] (the
    // overview page). We redirect there with a query string so the page
    // can scroll to the design section. This keeps the URL contract
    // /dashboard/store/[id]/design working while avoiding duplicate UI.
    const qs = new URLSearchParams({
      tab: "design",
      theme: data.theme ?? "modern",
      color: data.primary_color ?? "#534AB7",
      animation: data.animation_style ?? "soft",
    }).toString();

    redirect(`/dashboard/store/${id}?${qs}`);
  } catch {
    redirect("/dashboard");
  }
}
