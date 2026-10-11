import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";

export const metadata = {
  title: "Conditions d'Utilisation — EasyTradez",
  description: "Conditions générales d'utilisation des services de la plateforme EasyTradez.",
};

export default function TermsPage() {
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
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              Conditions Générales d&apos;Utilisation
            </h1>
            <p className="text-sm text-slate-400">Dernière mise à jour : 12 octobre 2026</p>
          </div>
        </div>

        <div className="space-y-6 text-sm text-slate-300 leading-relaxed bg-white/[0.03] border border-white/10 rounded-2xl p-6 sm:p-8">
          <section className="space-y-2">
            <h2 className="text-lg font-bold text-white">1. Objet du service</h2>
            <p>
              EasyTradez fournit une suite d&apos;outils SaaS permettant aux marchands et créateurs en Algérie
              de créer, héberger et gérer des boutiques et tunnels de vente en ligne avec prise en charge du
              paiement à la livraison (COD) et passerelles de paiement électronique.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-white">2. Inscription et compte</h2>
            <p>
              L&apos;accès aux fonctionnalités nécessite la création d&apos;un compte. Vous êtes responsable
              de la confidentialité de vos identifiants d&apos;accès et de toute activité effectuée depuis
              votre compte.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-white">3. Responsabilité du marchand</h2>
            <p>
              Chaque marchand est seul responsable des produits commercialisés, de la conformité légale
              de son activité commerciale avec les lois algériennes en vigueur, ainsi que du traitement
              des commandes passées par ses clients finaux.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-white">4. Abonnements et facturation</h2>
            <p>
              Les forfaits payants (Pro, Business) sont facturés selon les modalités souscrites (mensuel ou annuel).
              Les paiements par carte CIB et Edahabia sont traités via la passerelle de paiement agréée BaridiMob / SATIM.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-white">5. Contact</h2>
            <p>
              Pour toute question relative aux présentes conditions, contactez notre équipe support :
              support@easytradez.site.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
