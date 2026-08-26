import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#09090b] text-white selection:bg-indigo-500 selection:text-white">
      {/* Background glow effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-b from-indigo-500/20 via-purple-500/10 to-transparent blur-3xl opacity-60" />
        <div className="absolute top-[30%] right-[10%] w-[500px] h-[400px] bg-emerald-500/10 blur-3xl rounded-full" />
      </div>

      {/* ── Navbar ───────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#09090b]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/25">
              M
            </div>
            <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-white to-white/70 bg-clip-text text-transparent" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Marchand<span className="text-indigo-400">.ai</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-white/60">
            <a href="#features" className="hover:text-white transition-colors">Fonctionnalités</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">Comment ça marche</a>
            <a href="#pricing" className="hover:text-white transition-colors">Tarifs</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium text-white/70 hover:text-white px-3.5 py-2 rounded-xl transition-colors"
            >
              Connexion
            </Link>
            <Link
              href="/register"
              className="relative group overflow-hidden rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-white/90 transition-all shadow-md shadow-white/10"
            >
              <span className="relative z-10">Essai 7 jours gratuit</span>
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero Section ─────────────────────────────────────────────────────── */}
      <section className="relative pt-20 pb-24 md:pt-32 md:pb-36 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-xs font-medium text-indigo-300 backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
            Nouveau : Génération IA de vitrines 100% compatibles Algérie 🇩🇿
          </div>

          {/* Heading */}
          <h1
            className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.1]"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Lancez votre boutique e-commerce en{" "}
            <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-emerald-400 bg-clip-text text-transparent">
              60 secondes
            </span>{" "}
            grâce à l&apos;IA
          </h1>

          {/* Subtitle */}
          <p className="text-lg sm:text-xl text-white/60 max-w-2xl mx-auto leading-relaxed">
            Créez une vitrine ultra-rapide avec encaissement à la livraison (COD),
            gestion des 58 wilayas, commandes instantanées via WhatsApp et notifications push en temps réel.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              href="/register"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 px-8 py-4 text-base font-bold text-white shadow-xl shadow-indigo-500/25 transition-all transform hover:-translate-y-0.5"
            >
              Créer ma boutique (Essai 7 jours)
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </Link>
            <a
              href="#features"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] px-6 py-4 text-base font-semibold text-white/80 hover:text-white transition-all"
            >
              Découvrir les fonctionnalités
            </a>
          </div>

          {/* Social Proof */}
          <div className="pt-8 flex items-center justify-center gap-6 text-xs text-white/40">
            <div className="flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-400">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              <span>Aucune carte bancaire requise</span>
            </div>
            <div className="flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-400">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              <span>Prêt pour Yalidine & ZR Express</span>
            </div>
            <div className="flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-400">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              <span>Livraison 58 Wilayas</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Feature Grid ─────────────────────────────────────────────────────── */}
      <section id="features" className="py-20 border-t border-white/[0.06] bg-white/[0.01]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <p className="text-xs uppercase tracking-widest text-indigo-400 font-semibold">Puissance & Simplicité</p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Tout ce dont vous avez besoin pour vendre
            </h2>
            <p className="text-sm text-white/50">
              Fini les plugins compliqués ou les commissions excessives. Une solution taillée pour le marché local.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: "⚡",
                title: "Génération IA en 1 clic",
                desc: "Renseignez votre activité, l'IA rédige vos descriptions, structure votre catalogue et personnalise le design.",
              },
              {
                icon: "💬",
                title: "Commandes directes WhatsApp",
                desc: "Vos clients commandent via un formulaire ergonomique qui envoie instantanément le récapitulatif sur votre WhatsApp.",
              },
              {
                icon: "🚚",
                title: "Gestion des 58 Wilayas",
                desc: "Définissez des frais de livraison personnalisés par wilaya ou offrez la livraison gratuite à partir d'un montant cible.",
              },
              {
                icon: "🔔",
                title: "Notifications Push Web",
                desc: "Recevez une alerte sonore et visuelle directement sur votre téléphone ou PC dès qu'une commande est passée.",
              },
              {
                icon: "📊",
                title: "Tableau de bord temps réel",
                desc: "Gérez vos commandes, validez les expéditions, suivez vos stocks et analysez vos revenus en direct.",
              },
              {
                icon: "🚀",
                title: "Vitesse fulgurante",
                desc: "Des pages qui se chargent en moins d'une seconde, même en 3G/4G, garantissant un taux de conversion maximal.",
              },
            ].map((f, i) => (
              <div key={i} className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-6 space-y-3 hover:border-indigo-500/30 transition-all">
                <div className="text-3xl mb-2">{f.icon}</div>
                <h3 className="text-lg font-semibold text-white">{f.title}</h3>
                <p className="text-sm text-white/50 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing Section ──────────────────────────────────────────────────── */}
      <section id="pricing" className="py-24 border-t border-white/[0.06] relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <p className="text-xs uppercase tracking-widest text-emerald-400 font-semibold">Tarification transparente</p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Commencez gratuitement dès aujourd&apos;hui
            </h2>
            <p className="text-sm text-white/50">
              Profitez d&apos;un essai complet de 7 jours sans engagement.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto items-stretch">
            {/* Free Trial */}
            <div className="rounded-3xl border border-indigo-500/40 bg-gradient-to-b from-indigo-500/10 to-transparent p-8 flex flex-col justify-between relative shadow-xl shadow-indigo-500/10">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-indigo-500 px-3 py-0.5 text-xs font-bold text-white uppercase tracking-wider">
                Populaire
              </div>
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-white">Essai Gratuit</h3>
                <p className="text-xs text-white/50">Testez toutes les fonctionnalités sans limite.</p>
                <div className="flex items-baseline gap-1 pt-2">
                  <span className="text-4xl font-extrabold text-white">0</span>
                  <span className="text-sm text-white/50">DZD / 7 jours</span>
                </div>
                <ul className="space-y-2.5 pt-4 text-sm text-white/70">
                  <li className="flex items-center gap-2">✓ Boutique complète en ligne</li>
                  <li className="flex items-center gap-2">✓ Produits illimités</li>
                  <li className="flex items-center gap-2">✓ Formulaire de commande WhatsApp</li>
                  <li className="flex items-center gap-2">✓ Frais de livraison 58 wilayas</li>
                  <li className="flex items-center gap-2">✓ Notifications push instantanées</li>
                </ul>
              </div>
              <Link
                href="/register"
                className="mt-8 block text-center w-full rounded-xl bg-indigo-600 hover:bg-indigo-500 py-3 text-sm font-bold text-white transition-colors"
              >
                Démarrer l&apos;essai 7 jours
              </Link>
            </div>

            {/* Pro Plan */}
            <div className="rounded-3xl border border-white/[0.08] bg-white/[0.02] p-8 flex flex-col justify-between">
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-white">Plan Pro</h3>
                <p className="text-xs text-white/50">Pour les marchands et marques en croissance.</p>
                <div className="flex items-baseline gap-1 pt-2">
                  <span className="text-4xl font-extrabold text-white">2 900</span>
                  <span className="text-sm text-white/50">DZD / mois</span>
                </div>
                <ul className="space-y-2.5 pt-4 text-sm text-white/70">
                  <li className="flex items-center gap-2">✓ Tout ce qui est inclus dans l&apos;essai</li>
                  <li className="flex items-center gap-2">✓ Nom de domaine personnalisé</li>
                  <li className="flex items-center gap-2">✓ Analytics avancés des ventes</li>
                  <li className="flex items-center gap-2">✓ Support prioritaire 7j/7</li>
                </ul>
              </div>
              <Link
                href="/register"
                className="mt-8 block text-center w-full rounded-xl border border-white/20 bg-white/[0.04] hover:bg-white/[0.08] py-3 text-sm font-semibold text-white transition-colors"
              >
                Choisir Pro
              </Link>
            </div>

            {/* Business Plan */}
            <div className="rounded-3xl border border-white/[0.08] bg-white/[0.02] p-8 flex flex-col justify-between">
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-white">Plan Business</h3>
                <p className="text-xs text-white/50">Pour les grossistes et multi-boutiques.</p>
                <div className="flex items-baseline gap-1 pt-2">
                  <span className="text-4xl font-extrabold text-white">6 900</span>
                  <span className="text-sm text-white/50">DZD / mois</span>
                </div>
                <ul className="space-y-2.5 pt-4 text-sm text-white/70">
                  <li className="flex items-center gap-2">✓ Boutiques multiples</li>
                  <li className="flex items-center gap-2">✓ Intégration API & Webhooks</li>
                  <li className="flex items-center gap-2">✓ Accompagnement dédié</li>
                  <li className="flex items-center gap-2">✓ Taux de conversion optimisé</li>
                </ul>
              </div>
              <Link
                href="/register"
                className="mt-8 block text-center w-full rounded-xl border border-white/20 bg-white/[0.04] hover:bg-white/[0.08] py-3 text-sm font-semibold text-white transition-colors"
              >
                Contacter l&apos;équipe
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ Section ──────────────────────────────────────────────────────── */}
      <section id="faq" className="py-20 border-t border-white/[0.06] bg-white/[0.01]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12 space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold text-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Questions fréquentes
            </h2>
            <p className="text-sm text-white/50">Tout ce que vous devez savoir pour démarrer</p>
          </div>

          <div className="space-y-4">
            {[
              {
                q: "Ai-je besoin d'une carte bancaire ou d'un compte CIB/Edahabia pour démarrer ?",
                a: "Non ! Vous pouvez créer votre boutique et tester l'ensemble de la plateforme gratuitement pendant 7 jours sans entrer aucune coordonnée bancaire.",
              },
              {
                q: "Comment mes clients paient-ils leurs commandes ?",
                a: "La majorité des commandes en Algérie se font en paiement à la livraison (Cash on Delivery). Le client remplit le formulaire et confirme sur WhatsApp, puis paie le livreur à la réception.",
              },
              {
                q: "Puis-je personnaliser les tarifs de livraison par wilaya ?",
                a: "Oui, un onglet dédié vous permet de configurer le prix de livraison pour chacune des 58 wilayas, ou d'offrir la livraison gratuite à partir d'un certain montant d'achat.",
              },
              {
                q: "Comment suis-je informé lorsqu'une nouvelle commande arrive ?",
                a: "Vous recevez une notification push instantanée sur votre téléphone ou ordinateur, ainsi qu'un message pré-rempli sur votre numéro WhatsApp.",
              },
            ].map((faq, i) => (
              <div key={i} className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 space-y-2">
                <p className="text-sm font-semibold text-white">{faq.q}</p>
                <p className="text-xs text-white/50 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.06] py-12 text-center text-xs text-white/40 space-y-4">
        <div className="flex items-center justify-center gap-6">
          <Link href="/login" className="hover:text-white transition-colors">Connexion</Link>
          <Link href="/register" className="hover:text-white transition-colors">Créer une boutique</Link>
          <a href="#pricing" className="hover:text-white transition-colors">Tarifs</a>
        </div>
        <p>© {new Date().getFullYear()} Marchand.ai — Conçu spécialement pour les commerçants algériens 🇩🇿</p>
      </footer>
    </div>
  );
}
