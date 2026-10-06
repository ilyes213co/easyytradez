import AuthCard from "@/components/auth/AuthCard";

export const metadata = {
  title: "Authentification",
  description: "Accédez à votre espace marchand easytrade.",
};

export default function AuthPage() {
  return <AuthCard initialMode="login" />;
}
