import Link from "next/link";
import { ArrowLeft, Shield } from "lucide-react";

export const metadata = {
  title: "Politique de Confidentialité — EasyTradez",
  description: "Politique de confidentialité et protection des données personnelles de la plateforme EasyTradez.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#070913] text-slate-200 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-sky-400 hover:text-sky-300 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Retour à l&apos;accueil</span>
        </Link>

        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              Politique de Confidentialité
            </h1>
            <p className="text-sm text-slate-400">Dernière mise à jour : 12 octobre 2026</p>
          </div>
        </div>

        <div className="space-y-6 text-sm text-slate-300 leading-relaxed bg-white/[0.03] border border-white/10 rounded-2xl p-6 sm:p-8">
          <section className="space-y-2">
            <h2 className="text-lg font-bold text-white">1. Introduction</h2>
            <p>
              EasyTradez (« nous », « notre plateforme »), accessible depuis https://easytradez.site,
              accorde une grande importance à la protection et à la confidentialité de vos données
              personnelles. Cette politique explique comment nous recueillons, utilisons et protégeons
              vos informations lorsque vous utilisez nos services d&apos;e-commerce.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-white">2. Données collectées</h2>
            <p>Dans le cadre de votre utilisation de la plateforme, nous pouvons collecter :</p>
            <ul className="list-disc pl-5 space-y-1 text-slate-400">
              <li>Informations de compte : nom, adresse e-mail, numéro de téléphone.</li>
              <li>Données d&apos;authentification : identifiant Google OAuth lors de la connexion via Google.</li>
              <li>Données de gestion de boutique : nom de la boutique, catalogue de produits, commandes clients.</li>
              <li>Informations de transaction : historique des abonnements SaaS et statut de règlement.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-white">3. Utilisation des données Google</h2>
            <p>
              Lorsque vous vous connectez à EasyTradez via Google, nous accédons uniquement à vos informations
              de profil public (nom, adresse e-mail et avatar) afin de créer et authentifier votre compte marchand.
              Ces données ne sont jamais partagées, vendues ni utilisées à d&apos;autres fins que votre connexion.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-white">4. Sécurité et hébergement</h2>
            <p>
              Vos données sont stockées de manière chiffrée avec des protocoles stricts (SSL/TLS). L&apos;authentification
              et les accès aux bases de données sont sécurisés par des politiques de sécurité au niveau des lignes (RLS).
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-white">5. Vos droits et contact</h2>
            <p>
              Vous disposez d&apos;un droit d&apos;accès, de rectification et de suppression de vos données personnelles.
              Pour toute question ou demande relative à vos données, vous pouvez nous contacter à l&apos;adresse suivante :
              support@easytradez.site.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
