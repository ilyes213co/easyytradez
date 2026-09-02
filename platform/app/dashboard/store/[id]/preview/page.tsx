import { redirect } from "next/navigation";

interface PageProps {
  params: { id: string };
  searchParams: { [key: string]: string | string[] | undefined };
}

export const dynamic = "force-dynamic";

export default async function StorePreviewPage({
  params,
  searchParams,
}: PageProps) {
  // The actual preview renderer lives at /preview/[store_id].
  // Redirect there so the URL /dashboard/store/[id]/preview still
  // resolves and forwards any live-edit query params (color, theme,
  // animation, effects) used by the wizard.
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === "string") qs.set(key, value);
  }

  const tail = qs.toString();
  redirect(`/preview/${params.id}${tail ? `?${tail}` : ""}`);
}
