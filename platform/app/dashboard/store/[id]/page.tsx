import { redirect } from "next/navigation";

export default function DeprecatedStoreDetailPage({ params }: { params: { id: string } }) {
  redirect(`/dashboard/boutique/${params.id}`);
}
