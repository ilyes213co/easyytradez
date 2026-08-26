"use client";

import { useState, useEffect } from "react";
import { PushSetup } from "@/components/notifications/PushSetup";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { useAuth } from "@/components/auth/AuthProvider";
import { useRouter } from "next/navigation";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Spinner({ size = 16 }: { size?: number }) {
  return (
    <svg className="animate-spin" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  );
}

const inputClass =
  "w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder-white/20 outline-none transition-all focus:border-indigo-500/50 focus:bg-white/[0.06] focus:ring-2 focus:ring-indigo-500/10";

const inputErrorClass =
  "w-full rounded-xl border border-red-500/40 bg-red-500/5 px-4 py-2.5 text-sm text-white placeholder-white/20 outline-none";

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs font-medium text-white/45 mb-1.5 uppercase tracking-wider">
      {children}
    </label>
  );
}

function SectionCard({ title, description, children }: {
  title: string; description?: string; children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] overflow-hidden">
      <div className="px-6 py-4 border-b border-white/[0.06]">
        <h3 className="text-sm font-semibold text-white/85" style={{ fontFamily: "'DM Sans', sans-serif" }}>{title}</h3>
        {description && <p className="text-xs text-white/35 mt-0.5">{description}</p>}
      </div>
      <div className="px-6 py-5 space-y-4">{children}</div>
    </div>
  );
}

function SaveRow({ onSave, saving, saved, error }: {
  onSave: () => void; saving: boolean; saved: boolean; error: string | null;
}) {
  return (
    <div className="flex items-center justify-between pt-1">
      {error ? (
        <p className="text-xs text-red-400 flex items-center gap-1.5">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
          {error}
        </p>
      ) : saved ? (
        <p className="text-xs text-emerald-400 flex items-center gap-1.5">✓ Modifications enregistrées</p>
      ) : <span />}
      <button
        onClick={onSave}
        disabled={saving}
        className="flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-xs font-semibold text-white transition-all disabled:opacity-50"
      >
        {saving ? <><Spinner size={12} /> Enregistrement…</> : "Enregistrer"}
      </button>
    </div>
  );
}

// ─── Profile section ──────────────────────────────────────────────────────────

function ProfileSection() {
  const { user, profile, refreshProfile } = useAuth();
  const supabase = getSupabaseBrowserClient();

  const [firstName, setFirstName] = useState(profile?.first_name ?? "");
  const [lastName, setLastName]   = useState(profile?.last_name  ?? "");
  const [whatsapp, setWhatsapp]   = useState(profile?.whatsapp   ?? "");
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const initials = `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase() || user?.email?.[0]?.toUpperCase() || "M";

  const handleSave = async () => {
    if (!user) return;
    setError(null);
    if (!firstName.trim() || !lastName.trim()) {
      setError("Prénom et nom sont requis.");
      return;
    }
    setSaving(true);

    const { error: err } = await supabase
      .from("profiles")
      .update({
        first_name: firstName.trim(),
        last_name:  lastName.trim(),
        whatsapp:   whatsapp.trim() || null,
      })
      .eq("id", user.id);

    setSaving(false);
    if (err) { setError(err.message); return; }

    await refreshProfile();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <SectionCard title="Profil" description="Vos informations personnelles.">
      {/* Avatar */}
      <div className="flex items-center gap-4 pb-2">
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-lg font-bold text-white shrink-0">
          {profile?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
          ) : initials}
        </div>
        <div>
          <p className="text-sm font-medium text-white/80">{firstName} {lastName}</p>
          <p className="text-xs text-white/35">{user?.email}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Prénom</Label>
          <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)}
            placeholder="Amine" className={inputClass} />
        </div>
        <div>
          <Label>Nom</Label>
          <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)}
            placeholder="Benali" className={inputClass} />
        </div>
      </div>

      <div>
        <Label>E-mail</Label>
        <input type="email" value={user?.email ?? ""} disabled
          className={inputClass + " opacity-40 cursor-not-allowed"} />
        <p className="mt-1.5 text-xs text-white/20">L&apos;adresse e-mail ne peut pas être modifiée ici.</p>
      </div>

      <div>
        <Label>WhatsApp personnel</Label>
        <input type="tel" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)}
          placeholder="+213 6 00 00 00 00" className={inputClass} />
      </div>

      <SaveRow onSave={handleSave} saving={saving} saved={saved} error={error} />
    </SectionCard>
  );
}

// ─── Password section ─────────────────────────────────────────────────────────

function PasswordSection() {
  const supabase = getSupabaseBrowserClient();

  const [current,  setCurrent]  = useState("");
  const [next,     setNext]     = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [errors,   setErrors]   = useState<{ next?: string; confirm?: string }>({});
  const [show,     setShow]     = useState(false);

  const handleSave = async () => {
    setError(null);
    const errs: typeof errors = {};
    if (next.length < 8) errs.next = "Minimum 8 caractères";
    if (!/[A-Z]/.test(next)) errs.next = "Doit contenir une majuscule";
    if (next !== confirm)   errs.confirm = "Les mots de passe ne correspondent pas";
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setSaving(true);

    // Re-authenticate then update
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email) {
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: user.email, password: current,
      });
      if (signInErr) {
        setSaving(false);
        setError("Mot de passe actuel incorrect.");
        return;
      }
    }

    const { error: updateErr } = await supabase.auth.updateUser({ password: next });
    setSaving(false);

    if (updateErr) { setError(updateErr.message); return; }

    setSaved(true);
    setCurrent(""); setNext(""); setConfirm("");
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <SectionCard title="Mot de passe" description="Choisissez un mot de passe fort d'au moins 8 caractères.">
      <div>
        <Label>Mot de passe actuel</Label>
        <div className="relative">
          <input type={show ? "text" : "password"} value={current}
            onChange={(e) => setCurrent(e.target.value)}
            placeholder="••••••••" className={inputClass + " pr-10"} />
          <button type="button" onClick={() => setShow((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/50 transition-colors text-xs">
            {show ? "🙈" : "👁"}
          </button>
        </div>
      </div>

      <div>
        <Label>Nouveau mot de passe</Label>
        <input type={show ? "text" : "password"} value={next}
          onChange={(e) => setNext(e.target.value)}
          placeholder="••••••••"
          className={errors.next ? inputErrorClass : inputClass} />
        {errors.next && <p className="mt-1 text-xs text-red-400">⚠ {errors.next}</p>}
      </div>

      <div>
        <Label>Confirmer le nouveau mot de passe</Label>
        <input type={show ? "text" : "password"} value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="••••••••"
          className={errors.confirm ? inputErrorClass : inputClass} />
        {errors.confirm && <p className="mt-1 text-xs text-red-400">⚠ {errors.confirm}</p>}
      </div>

      <SaveRow onSave={handleSave} saving={saving} saved={saved} error={error} />
    </SectionCard>
  );
}

// ─── Danger zone ──────────────────────────────────────────────────────────────

function DangerZone() {
  const { user, signOut } = useAuth();
  const supabase = getSupabaseBrowserClient();
  const router   = useRouter();

  const [confirm, setConfirm]   = useState("");
  const [deleting, setDeleting] = useState(false);
  const [open, setOpen]         = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const CONFIRM_PHRASE = "SUPPRIMER MON COMPTE";

  const handleDelete = async () => {
    if (!user || confirm !== CONFIRM_PHRASE) return;
    setDeleting(true);

    // Delete profile (cascade deletes store, products, orders via FK)
    await supabase.from("profiles").delete().eq("id", user.id);
    await signOut();
    router.push("/register");
  };

  return (
    <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.04] overflow-hidden">
      <div className="px-6 py-4 border-b border-red-500/10">
        <h3 className="text-sm font-semibold text-red-400">Zone de danger</h3>
        <p className="text-xs text-white/30 mt-0.5">Ces actions sont irréversibles.</p>
      </div>
      <div className="px-6 py-5">
        {!open ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white/70">Supprimer mon compte</p>
              <p className="text-xs text-white/30 mt-0.5">
                Supprime définitivement votre compte, boutique, produits et commandes.
              </p>
            </div>
            <button
              onClick={() => setOpen(true)}
              className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/20 transition-all shrink-0 ml-4"
            >
              Supprimer
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3">
              <span className="text-red-400 mt-0.5 shrink-0">⚠</span>
              <p className="text-xs text-red-300 leading-relaxed">
                Cette action supprimera <strong>définitivement</strong> votre compte, votre boutique, tous vos produits et toutes vos commandes. Cette action est <strong>irréversible</strong>.
              </p>
            </div>

            <div>
              <Label>Tapez <span className="text-red-400 font-mono font-bold">{CONFIRM_PHRASE}</span> pour confirmer</Label>
              <input
                type="text" value={confirm} onChange={(e) => setConfirm(e.target.value)}
                placeholder={CONFIRM_PHRASE}
                className={inputClass}
              />
            </div>

            {error && <p className="text-xs text-red-400">⚠ {error}</p>}

            <div className="flex gap-3">
              <button onClick={() => { setOpen(false); setConfirm(""); setError(null); }}
                className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm text-white/50 hover:text-white/80 hover:bg-white/[0.04] transition-all"
              >
                Annuler
              </button>
              <button
                onClick={handleDelete}
                disabled={confirm !== CONFIRM_PHRASE || deleting}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-red-600 hover:bg-red-500 py-2.5 text-sm font-semibold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {deleting ? <><Spinner /> Suppression…</> : "Supprimer définitivement"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Push Notifications section ──────────────────────────────────────────────

function PushNotificationsSection() {
  const { user } = useAuth();
  const supabase  = getSupabaseBrowserClient();
  const [storeId, setStoreId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("stores").select("id").eq("owner_id", user.id).single()
      .then(({ data }) => setStoreId(data?.id ?? null));
  }, [user, supabase]);

  return (
    <SectionCard title="Notifications push" description="Recevez des alertes en temps réel sur ce navigateur.">
      {storeId ? (
        <PushSetup storeId={storeId} />
      ) : (
        <p className="text-xs text-white/30">Boutique introuvable.</p>
      )}
      <div className="space-y-1.5 pt-1">
        <p className="text-xs text-white/25 font-medium">Vous serez notifié quand :</p>
        <div className="flex items-center gap-2 text-xs text-white/35">
          <span className="w-4 h-4 rounded-md bg-indigo-500/15 flex items-center justify-center text-[10px]">🛒</span>
          Une nouvelle commande est reçue
        </div>
        <div className="flex items-center gap-2 text-xs text-white/35">
          <span className="w-4 h-4 rounded-md bg-amber-500/15 flex items-center justify-center text-[10px]">⚠️</span>
          Un produit tombe en rupture de stock
        </div>
      </div>
    </SectionCard>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  return (
    <div className="max-w-2xl space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-lg font-semibold text-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          Paramètres du compte
        </h1>
        <p className="text-sm text-white/35 mt-0.5">Gérez votre profil et vos préférences</p>
      </div>

      <ProfileSection />
      <PasswordSection />
      <PushNotificationsSection />
      <DangerZone />

      <div className="pb-8" />
    </div>
  );
}
