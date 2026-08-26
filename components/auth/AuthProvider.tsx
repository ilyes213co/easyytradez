"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { User, Session } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import type { Profile } from "@/lib/supabase";
import { useRouter } from "next/navigation";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = getSupabaseBrowserClient();
  const router = useRouter();

  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    profile: null,
    loading: true,
  });

  // ── Fetch profile from DB ──────────────────────────────────────────────────
  const fetchProfile = useCallback(
    async (userId: string): Promise<Profile | null> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        console.error("[AuthProvider] fetchProfile error:", error.message);
        return null;
      }
      return data;
    },
    [supabase]
  );

  const refreshProfile = useCallback(async () => {
    if (!state.user) return;
    const profile = await fetchProfile(state.user.id);
    setState((prev) => ({ ...prev, profile }));
  }, [state.user, fetchProfile]);

  // ── Initialize auth state ─────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) return;

      if (session?.user) {
        const profile = await fetchProfile(session.user.id);
        setState({ user: session.user, session, profile, loading: false });
      } else {
        setState({ user: null, session: null, profile: null, loading: false });
      }
    };

    init();

    // ── Listen for auth changes ───────────────────────────────────────────
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (event === "SIGNED_IN" && session?.user) {
        const profile = await fetchProfile(session.user.id);
        setState({ user: session.user, session, profile, loading: false });
        router.refresh();
      } else if (event === "SIGNED_OUT") {
        setState({ user: null, session: null, profile: null, loading: false });
        router.push("/login");
      } else if (event === "TOKEN_REFRESHED" && session?.user) {
        setState((prev) => ({ ...prev, session, user: session.user }));
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, fetchProfile, router]);

  // ── Sign out ──────────────────────────────────────────────────────────────
  const signOut = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true }));
    await supabase.auth.signOut();
    // onAuthStateChange SIGNED_OUT handler cleans up state
  }, [supabase]);

  return (
    <AuthContext.Provider value={{ ...state, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside <AuthProvider>");
  }
  return ctx;
}
