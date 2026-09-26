"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useThree } from "@/lib/useThree";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v3";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { setCachedAuthToken } from "@/lib/api";
import { setCachedUser } from "@/components/auth/AuthProvider";

// ─── Validation Schemas ───────────────────────────────────────────────────────

const loginSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(6, "Minimum 6 caractères"),
});
type LoginForm = z.infer<typeof loginSchema>;

const registerSchema = z.object({
  full_name: z.string().min(2, "Nom trop court (minimum 2 caractères)"),
  phone: z.string().min(8, "Numéro de téléphone invalide"),
  email: z.string().email("Email invalide"),
  password: z.string().min(8, "Minimum 8 caractères"),
  terms: z.literal(true, {
    errorMap: () => ({ message: "Vous devez accepter les conditions d'utilisation" }),
  }),
});
type RegisterForm = z.infer<typeof registerSchema>;

interface Props {
  initialMode: "login" | "register";
}

export default function EasyTradeAuth({ initialMode }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [mode, setMode] = useState<"login" | "register">(initialMode);
  const threeLoaded = useThree();
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Password strength state
  const [pwdStrength, setPwdStrength] = useState({ width: "0%", color: "#ef4444" });

  // ─── Forms ──────────────────────────────────────────────────────────────────
  const {
    register: registerLogin,
    handleSubmit: handleLoginSubmit,
    formState: { errors: loginErrors, isSubmitting: isLoginSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema as any),
  });

  const {
    register: registerReg,
    handleSubmit: handleRegSubmit,
    watch: watchReg,
    formState: { errors: regErrors, isSubmitting: isRegSubmitting },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema as any),
    defaultValues: { terms: true },
  });

  const regPasswordValue = watchReg("password") || "";

  // Dynamic Password Strength Meter
  useEffect(() => {
    const val = regPasswordValue;
    if (!val) {
      setPwdStrength({ width: "0%", color: "#ef4444" });
      return;
    }
    let score = 0;
    if (val.length >= 6) score++;
    if (val.length >= 9) score++;
    if (/[A-Z]/.test(val) && /[0-9]/.test(val)) score++;
    if (/[^A-Za-z0-9]/.test(val)) score++;

    const colors = ["#ef4444", "#f59e0b", "#3b82f6", "#10b981"];
    const widths = ["25%", "50%", "75%", "100%"];
    const idx = Math.min(score, 3);
    setPwdStrength({ width: widths[idx] || "25%", color: colors[idx] || "#ef4444" });
  }, [regPasswordValue]);

  // ─── Three.js Scene ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!threeLoaded || !canvasRef.current) return;
    const THREE = window.THREE;
    if (!THREE) return;

    const canvas = canvasRef.current;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 6;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const torus = new THREE.Mesh(
      new THREE.TorusKnotGeometry(2.2, 0.45, 120, 20),
      new THREE.MeshBasicMaterial({ color: 0x2540ea, wireframe: true, transparent: true, opacity: 0.28 })
    );
    scene.add(torus);

    const ico = new THREE.Mesh(
      new THREE.IcosahedronGeometry(3.6, 1),
      new THREE.MeshBasicMaterial({ color: 0x60a5fa, wireframe: true, transparent: true, opacity: 0.08 })
    );
    scene.add(ico);

    const particleCount = 1200;
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i++) {
      positions[i] = (Math.random() - 0.5) * 22;
    }
    const partGeo = new THREE.BufferGeometry();
    partGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const partMat = new THREE.PointsMaterial({ size: 0.024, color: 0xffffff, transparent: true, opacity: 0.35 });
    const particles = new THREE.Points(partGeo, partMat);
    scene.add(particles);

    let mouseX = 0, mouseY = 0;
    const onMouseMove = (e: MouseEvent) => {
      mouseX = (e.clientX / window.innerWidth - 0.5) * 0.8;
      mouseY = -(e.clientY / window.innerHeight - 0.5) * 0.8;
    };
    window.addEventListener("mousemove", onMouseMove);

    let animId = 0;
    let frame = 0;
    function animateLoop() {
      animId = requestAnimationFrame(animateLoop);
      frame += 0.005;
      torus.rotation.x = frame * 0.35;
      torus.rotation.y = frame * 0.45;
      ico.rotation.x = -frame * 0.1;
      ico.rotation.y = frame * 0.15;
      particles.rotation.y = frame * 0.03;

      camera.position.x += (mouseX - camera.position.x) * 0.03;
      camera.position.y += (mouseY - camera.position.y) * 0.03;
      camera.lookAt(scene.position);

      renderer.render(scene, camera);
    }
    animateLoop();

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
    };
  }, [threeLoaded]);

  // ─── Login Submit ───────────────────────────────────────────────────────────
  const onLogin = async (values: LoginForm) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });

      if (error) {
        const msg = error.message || "";
        if (msg.includes("Invalid login credentials")) {
          toast.error("Email ou mot de passe incorrect");
        } else if (msg.includes("Email not confirmed")) {
          toast.error("Veuillez confirmer votre email d'abord");
        } else {
          toast.error(msg || "Impossible de se connecter");
        }
        return;
      }

      if (data?.session?.access_token) {
        setCachedAuthToken(data.session.access_token, data.session.expires_in ?? 3600);
      }
      if (data?.user) {
        setCachedUser(data.user);
      }

      toast.success("Connexion réussie ! Redirection vers votre tableau de bord...");
      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      console.error("Login error:", err);
      toast.error("Impossible de joindre le serveur. Vérifiez votre connexion.");
    }
  };

  // ─── Register Submit ────────────────────────────────────────────────────────
  const onRegister = async (values: RegisterForm) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: { full_name: values.full_name },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        const msg = error.message || "";
        if (msg.includes("already registered") || msg.includes("User already registered")) {
          toast.error("Cet email est déjà utilisé. Connectez-vous directement.");
          setMode("login");
        } else {
          toast.error(msg || "Erreur lors de la création de compte");
        }
        return;
      }

      if (data.user) {
        await supabase.from("profiles").insert({
          id: data.user.id,
          full_name: values.full_name,
          phone: values.phone.replace(/\s/g, ""),
          plan: "free",
        });
      }

      if (data?.session?.access_token) {
        setCachedAuthToken(data.session.access_token, data.session.expires_in ?? 3600);
      }
      if (data?.user) {
        setCachedUser(data.user);
      }

      toast.success("Boutique créée avec succès ! Bienvenue sur EasyTrade.");
      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      console.error("Register error:", err);
      toast.error("Une erreur inattendue est survenue.");
    }
  };

  // ─── Google OAuth ───────────────────────────────────────────────────────────
  const onGoogleLogin = async () => {
    try {
      setIsGoogleLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: { access_type: "offline", prompt: "consent" },
        },
      });
      if (error) {
        toast.error("Erreur Google : " + error.message);
        setIsGoogleLoading(false);
      }
    } catch (err: any) {
      console.error("Google login error:", err);
      toast.error("Impossible d'initialiser la connexion avec Google.");
      setIsGoogleLoading(false);
    }
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        :root {
          --bg: #06060f;
          --card-bg: linear-gradient(155deg, rgba(28, 44, 148, 0.32) 0%, rgba(10, 14, 38, 0.88) 100%);
          --border: rgba(96, 165, 250, 0.28);
          --border-focus: rgba(147, 197, 253, 0.85);
          --text: #ffffff;
          --muted: rgba(226, 232, 240, 0.72);
          --g: #2540ea;
          --gd: #1a2ca3;
          --gl: #93c5fd;
          --g-glow: rgba(37, 64, 234, 0.6);
          --g-subtle: rgba(37, 64, 234, 0.18);
          --font-heading: 'Outfit', -apple-system, sans-serif;
          --font-body: 'Plus Jakarta Sans', -apple-system, sans-serif;
        }

        .auth-page-body {
          background: var(--bg);
          color: var(--text);
          font-family: var(--font-body);
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          overflow-x: hidden;
          position: relative;
          -webkit-font-smoothing: antialiased;
        }

        #bg-canvas {
          position: fixed; inset: 0; width: 100%; height: 100%; z-index: 0; pointer-events: none;
        }
        .bg-glow-overlay {
          position: fixed; inset: 0; pointer-events: none; z-index: 1;
          background: 
            radial-gradient(ellipse 65% 55% at 50% 30%, var(--g-subtle) 0%, transparent 70%),
            radial-gradient(circle at bottom, rgba(6,6,15,0.95) 0%, transparent 75%);
        }

        .auth-topbar {
          position: relative; z-index: 10;
          display: flex; align-items: center; justify-content: space-between;
          padding: 22px 36px;
        }
        .auth-logo {
          font-family: var(--font-heading); font-size: 1.35rem; font-weight: 900; letter-spacing: -0.5px;
          color: #ffffff; text-decoration: none; display: inline-flex; align-items: center; gap: 11px;
        }
        .auth-logo-icon {
          width: 32px; height: auto; filter: drop-shadow(0 4px 12px rgba(37, 64, 234, 0.45));
        }
        .auth-logo em {
          color: var(--gl); font-style: normal; text-shadow: 0 0 16px var(--g-glow);
        }
        .auth-back-link {
          display: inline-flex; align-items: center; gap: 8px;
          color: var(--muted); text-decoration: none; font-size: 0.88rem; font-weight: 600;
          padding: 8px 16px; border-radius: 10px; background: rgba(255, 255, 255, 0.04);
          border: 1px solid var(--border); transition: all 0.22s ease;
        }
        .auth-back-link:hover {
          color: #fff; border-color: var(--gl); background: rgba(37, 64, 234, 0.2); transform: translateX(-2px);
        }

        .auth-wrapper {
          position: relative; z-index: 10; flex: 1;
          display: flex; align-items: center; justify-content: center;
          padding: 24px 20px 60px;
        }
        .auth-card {
          width: 100%; max-width: 480px;
          background: var(--card-bg); border: 1px solid var(--border);
          border-radius: 28px; padding: 40px 36px;
          box-shadow: 0 24px 60px -12px rgba(0,0,0,0.8), 0 0 35px var(--g-subtle);
          backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px);
          position: relative; overflow: hidden;
          animation: cardFade 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .auth-card::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px;
          background: linear-gradient(90deg, transparent, var(--gl), var(--g), transparent);
        }
        @keyframes cardFade {
          from { opacity: 0; transform: translateY(22px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .auth-header { text-align: center; margin-bottom: 28px; }
        .auth-header h1 {
          font-family: var(--font-heading); font-size: 1.85rem; font-weight: 800;
          letter-spacing: -0.8px; color: #ffffff; margin-bottom: 8px;
        }
        .auth-header p { color: var(--muted); font-size: 0.92rem; }

        .tab-switch {
          display: flex; background: rgba(10, 14, 38, 0.7); border: 1px solid var(--border);
          padding: 4px; border-radius: 14px; margin-bottom: 28px; position: relative;
        }
        .tab-btn {
          flex: 1; padding: 10px 14px; background: transparent; border: none;
          color: var(--muted); font-family: var(--font-body); font-size: 0.9rem; font-weight: 700;
          cursor: pointer; border-radius: 10px; transition: all 0.24s cubic-bezier(0.2, 0.8, 0.2, 1);
        }
        .tab-btn.active {
          background: linear-gradient(135deg, var(--g) 0%, var(--gd) 100%);
          color: #ffffff; box-shadow: 0 4px 16px var(--g-glow);
        }
        .tab-btn:hover:not(.active) { color: #ffffff; }

        .auth-form { display: flex; flex-direction: column; gap: 18px; }

        .form-group { display: flex; flex-direction: column; gap: 7px; text-align: left; }
        .form-label {
          font-size: 0.84rem; font-weight: 700; color: #e2e8f0;
          display: flex; justify-content: space-between; align-items: center;
        }
        .forgot-pwd {
          color: var(--gl); text-decoration: none; font-size: 0.8rem; font-weight: 600; transition: color 0.2s;
        }
        .forgot-pwd:hover { text-decoration: underline; color: #fff; }
        .input-wrap { position: relative; display: flex; align-items: center; }
        .form-input {
          width: 100%; background: rgba(6, 6, 18, 0.7); border: 1px solid var(--border);
          border-radius: 12px; padding: 13px 16px; color: #ffffff; font-family: var(--font-body);
          font-size: 0.94rem; transition: all 0.25s ease; outline: none;
        }
        .form-input:focus {
          border-color: var(--border-focus); background: rgba(14, 20, 56, 0.85);
          box-shadow: 0 0 16px rgba(37, 64, 234, 0.4);
        }
        .form-input::placeholder { color: rgba(226, 232, 240, 0.38); }
        .input-toggle-pwd {
          position: absolute; right: 14px; background: none; border: none;
          color: var(--muted); cursor: pointer; display: flex; align-items: center;
          justify-content: center; padding: 4px; transition: color 0.2s;
        }
        .input-toggle-pwd:hover { color: #fff; }

        .pwd-meter {
          height: 4px; background: rgba(255, 255, 255, 0.1); border-radius: 4px;
          overflow: hidden; margin-top: 4px; display: flex;
        }
        .pwd-meter-fill { height: 100%; transition: width 0.3s ease, background-color 0.3s ease; }

        .btn-submit {
          display: flex; align-items: center; justify-content: center; gap: 9px;
          background: linear-gradient(135deg, var(--g) 0%, var(--gd) 100%);
          color: #ffffff; font-family: var(--font-body); font-size: 0.98rem; font-weight: 700;
          padding: 14px 24px; border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.2);
          cursor: pointer; box-shadow: 0 8px 24px -4px var(--g-glow), inset 0 1px 0 rgba(255, 255, 255, 0.25);
          transition: all 0.26s cubic-bezier(0.2, 0.8, 0.2, 1); margin-top: 6px;
        }
        .btn-submit:hover {
          transform: translateY(-2px); box-shadow: 0 14px 34px -4px var(--g-glow); filter: brightness(1.1);
        }
        .btn-submit:active { transform: translateY(0); }
        .btn-submit:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

        .or-divider {
          display: flex; align-items: center; gap: 14px; color: var(--muted); font-size: 0.8rem; margin: 10px 0 4px;
        }
        .or-divider::before, .or-divider::after {
          content: ''; flex: 1; height: 1px; background: var(--border);
        }

        .btn-quick {
          display: flex; align-items: center; justify-content: center; gap: 10px;
          background: rgba(255, 255, 255, 0.04); border: 1px solid var(--border);
          color: #ffffff; font-family: var(--font-body); font-size: 0.88rem; font-weight: 600;
          padding: 11px; border-radius: 12px; cursor: pointer; transition: all 0.22s ease;
        }
        .btn-quick:hover {
          background: rgba(37, 64, 234, 0.2); border-color: var(--gl);
        }

        .checkbox-wrap {
          display: flex; align-items: flex-start; gap: 10px; font-size: 0.82rem;
          color: var(--muted); cursor: pointer; user-select: none; line-height: 1.4;
        }
        .checkbox-wrap input {
          margin-top: 2px; accent-color: var(--g); width: 15px; height: 15px; cursor: pointer;
        }

        @media(max-width: 520px) {
          .auth-topbar { padding: 16px 20px; }
          .auth-card { padding: 30px 22px; border-radius: 22px; }
          .auth-header h1 { font-size: 1.6rem; }
        }
      ` }} />

      <div className="auth-page-body">
        {/* Toile 3D en arrière-plan */}
        <canvas id="bg-canvas" ref={canvasRef}></canvas>
        <div className="bg-glow-overlay"></div>

        {/* En-tête simplifié avec retour à l'accueil */}
        <header className="auth-topbar">
          <Link className="auth-logo" href="/">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icon-white.png"
              alt="EasyTrade"
              className="auth-logo-icon h-7 w-auto object-contain"
            />
            <span>Easy<em>Trade</em></span>
          </Link>

          <Link className="auth-back-link" href="/">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            <span>Accueil</span>
          </Link>
        </header>

        {/* Cœur : Carte d'authentification */}
        <main className="auth-wrapper">
          <div className="auth-card">
            <div className="auth-header">
              <h1>{mode === "login" ? "Connexion" : "Créer une boutique"}</h1>
              <p>
                {mode === "login"
                  ? "Accédez à votre espace marchand EasyTrade"
                  : "Rejoignez les marchands e-commerce en Algérie"}
              </p>
            </div>

            {/* Sélecteur d'onglet */}
            <div className="tab-switch">
              <button
                className={`tab-btn ${mode === "login" ? "active" : ""}`}
                onClick={() => setMode("login")}
                type="button"
              >
                Connexion
              </button>
              <button
                className={`tab-btn ${mode === "register" ? "active" : ""}`}
                onClick={() => setMode("register")}
                type="button"
              >
                Inscription
              </button>
            </div>

            {/* FORMULAIRE DE CONNEXION */}
            {mode === "login" && (
              <form className="auth-form" onSubmit={handleLoginSubmit(onLogin)}>
                <div className="form-group">
                  <label className="form-label" htmlFor="loginEmail">Adresse Email</label>
                  <div className="input-wrap">
                    <input
                      className="form-input"
                      type="email"
                      id="loginEmail"
                      placeholder="votre.boutique@gmail.com"
                      autoComplete="email"
                      {...registerLogin("email")}
                    />
                  </div>
                  {loginErrors.email && (
                    <p className="text-xs text-red-400 mt-1">{loginErrors.email.message}</p>
                  )}
                </div>

                <div className="form-group">
                  <div className="form-label">
                    <span>Mot de passe</span>
                    <a
                      className="forgot-pwd"
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        toast.info("Un lien de réinitialisation vous sera envoyé par email.");
                      }}
                    >
                      Oublié ?
                    </a>
                  </div>
                  <div className="input-wrap">
                    <input
                      className="form-input"
                      type={showLoginPassword ? "text" : "password"}
                      id="loginPassword"
                      placeholder="••••••••"
                      autoComplete="current-password"
                      {...registerLogin("password")}
                    />
                    <button
                      type="button"
                      className="input-toggle-pwd"
                      onClick={() => setShowLoginPassword((v) => !v)}
                      aria-label="Afficher le mot de passe"
                    >
                      {showLoginPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {loginErrors.password && (
                    <p className="text-xs text-red-400 mt-1">{loginErrors.password.message}</p>
                  )}
                </div>

                <label className="checkbox-wrap">
                  <input type="checkbox" defaultChecked />
                  <span>Garder ma session active sur cet appareil</span>
                </label>

                <button type="submit" disabled={isLoginSubmitting} className="btn-submit">
                  {isLoginSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <span>Se connecter</span>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </>
                  )}
                </button>

                <div className="or-divider">ou</div>

                <button
                  type="button"
                  className="btn-quick"
                  onClick={onGoogleLogin}
                  disabled={isGoogleLoading}
                >
                  {isGoogleLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                      <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.03h3.88c2.27-2.09 3.66-5.17 3.66-9.12z" />
                      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.03c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.13C3.27 21.36 7.34 24 12 24z" />
                      <path fill="#FBBC05" d="M5.28 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.58H1.26C.46 8.17 0 9.99 0 12s.46 3.83 1.26 5.42l4.02-3.13z" />
                      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.27 2.64 1.26 6.58l4.02 3.13c.95-2.83 3.6-4.96 6.72-4.96z" />
                    </svg>
                  )}
                  <span>Connecter avec Google</span>
                </button>
              </form>
            )}

            {/* FORMULAIRE D'INSCRIPTION */}
            {mode === "register" && (
              <form className="auth-form" onSubmit={handleRegSubmit(onRegister)}>
                <div className="form-group">
                  <label className="form-label" htmlFor="regName">Nom complet du marchand</label>
                  <div className="input-wrap">
                    <input
                      className="form-input"
                      type="text"
                      id="regName"
                      placeholder="Ex : Amina Benali"
                      autoComplete="name"
                      {...registerReg("full_name")}
                    />
                  </div>
                  {regErrors.full_name && (
                    <p className="text-xs text-red-400 mt-1">{regErrors.full_name.message}</p>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="regPhone">Numéro de téléphone</label>
                  <div className="input-wrap">
                    <input
                      className="form-input"
                      type="tel"
                      id="regPhone"
                      placeholder="05 / 06 / 07 XX XX XX"
                      autoComplete="tel"
                      {...registerReg("phone")}
                    />
                  </div>
                  {regErrors.phone && (
                    <p className="text-xs text-red-400 mt-1">{regErrors.phone.message}</p>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="regEmail">Adresse email</label>
                  <div className="input-wrap">
                    <input
                      className="form-input"
                      type="email"
                      id="regEmail"
                      placeholder="contact@maboutique.dz"
                      autoComplete="email"
                      {...registerReg("email")}
                    />
                  </div>
                  {regErrors.email && (
                    <p className="text-xs text-red-400 mt-1">{regErrors.email.message}</p>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="regPassword">Créer un mot de passe</label>
                  <div className="input-wrap">
                    <input
                      className="form-input"
                      type={showRegPassword ? "text" : "password"}
                      id="regPassword"
                      placeholder="8 caractères minimum"
                      autoComplete="new-password"
                      {...registerReg("password")}
                    />
                    <button
                      type="button"
                      className="input-toggle-pwd"
                      onClick={() => setShowRegPassword((v) => !v)}
                      aria-label="Afficher le mot de passe"
                    >
                      {showRegPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <div className="pwd-meter">
                    <div
                      className="pwd-meter-fill"
                      style={{ width: pwdStrength.width, backgroundColor: pwdStrength.color }}
                    ></div>
                  </div>
                  {regErrors.password && (
                    <p className="text-xs text-red-400 mt-1">{regErrors.password.message}</p>
                  )}
                </div>

                <label className="checkbox-wrap">
                  <input type="checkbox" {...registerReg("terms")} />
                  <span>J&apos;accepte les conditions d&apos;utilisation d&apos;EasyTrade Algérie</span>
                </label>
                {regErrors.terms && (
                  <p className="text-xs text-red-400 -mt-2">{regErrors.terms.message}</p>
                )}

                <button type="submit" disabled={isRegSubmitting} className="btn-submit">
                  {isRegSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <span>Créer ma boutique</span>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
