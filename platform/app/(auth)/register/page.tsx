import AuthCard from "@/components/auth/AuthCard";

export const metadata = {
  title: "Créer une boutique",
  description: "Créez votre boutique en ligne easytrade en 5 minutes en Algérie.",
};

export default function RegisterPage() {
  return <AuthCard initialMode="register" />;
}
