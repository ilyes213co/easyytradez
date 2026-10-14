import TemplateEditorView from "@/components/dashboard/editor/TemplateEditorView";

interface PageProps {
  params: { id: string };
}

export const dynamic = "force-dynamic";

export default function BoutiqueEditorPage({ params }: PageProps) {
  return <TemplateEditorView storeId={params.id} type="boutique" />;
}
