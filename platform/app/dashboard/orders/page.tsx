import { redirect } from "next/navigation";

export default function DeprecatedOrdersPage() {
  redirect("/dashboard/boutique/orders");
}
