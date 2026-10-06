import AuthCard from "@/components/auth/AuthCard";

export const metadata = {
  title: "Connexion",
  description: "Connectez-vous à votre espace marchand easytrade.",
};

export default function LoginPage() {
  return <AuthCard initialMode="login" />;
}
