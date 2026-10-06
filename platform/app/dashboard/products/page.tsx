import { redirect } from "next/navigation";

export default function DeprecatedProductsPage() {
  redirect("/dashboard/boutique/products");
}
