"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase";
import { setCachedAuthToken, clearCachedAuthToken } from "@/lib/api";
import { useRouter } from "next/navigation";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: async () => {},
});

// ─── SessionStorage User Cache ───────────────────────────────────────────────
// This allows instant rendering without waiting for Supabase network round-trip
// on every page navigation. The session is still validated/refreshed in the background.
const AUTH_CACHE_KEY = "et_auth_user";

function getCachedUser(): User | null {
  try {
    const raw = typeof window !== "undefined" ? sessionStorage.getItem(AUTH_CACHE_KEY) : null;
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

export function setCachedUser(user: User | null) {
  try {
    if (user) {
      sessionStorage.setItem(AUTH_CACHE_KEY, JSON.stringify(user));
    } else {
      sessionStorage.removeItem(AUTH_CACHE_KEY);
    }
  } catch {}
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let isMounted = true;

    // Immédiatement après hydratation côté client, restaurer le cache
    const cachedUser = getCachedUser();
    if (cachedUser && isMounted) {
      setUser(cachedUser);
      setLoading(false);
    }

    // Shorter failsafe: 2s instead of 4s since we already have cached state
    const failSafe = window.setTimeout(() => {
      if (isMounted) setLoading(false);
    }, 2000);

    // Validate/refresh the session in the background
    const getSession = async () => {
      try {
        const timeoutPromise = new Promise<{ data: { session: null }; error: Error }>((_, reject) =>
          setTimeout(() => reject(new Error("Supabase auth session check timeout")), 3000)
        );

        const { data, error } = await Promise.race([
          supabase.auth.getSession(),
          timeoutPromise,
        ]);

        if (error) {
          console.warn("[Auth] Erreur lors de la récupération de la session:", error.message);
          if (
            error.message?.includes("Failed to fetch") ||
            error.message?.includes("NetworkError") ||
            error.name === "AuthRetryableFetchError"
          ) {
            await supabase.auth.signOut({ scope: "local" }).catch(() => {});
          }
          if (isMounted) {
            clearCachedAuthToken();
            // Only clear user if there was no cached session to rely on
            if (!cachedUser) {
              setUser(null);
              setCachedUser(null);
            }
          }
        } else if (isMounted) {
          const freshUser = data?.session?.user ?? null;
          if (data?.session?.access_token) {
            setCachedAuthToken(data.session.access_token, data.session.expires_in ?? 3600);
          }
          setUser(freshUser);
          setCachedUser(freshUser);
        }
      } catch (err: any) {
        console.warn("[Auth] Échec de connexion au serveur d'authentification:", err?.message || err);
        try { await supabase.auth.signOut({ scope: "local" }); } catch {}
        if (isMounted && !cachedUser) {
          setUser(null);
          setCachedUser(null);
        }
      } finally {
        if (isMounted) setLoading(false);
        window.clearTimeout(failSafe);
      }
    };

    getSession();

    // Subscribe to live auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!isMounted) return;
        const freshUser = session?.user ?? null;
        if (session?.access_token) {
          setCachedAuthToken(session.access_token, session.expires_in ?? 3600);
        } else {
          clearCachedAuthToken();
        }
        setUser((prev) => {
          const next = freshUser;
          if (prev?.id === next?.id) return prev;
          setCachedUser(next);
          return next;
        });
        setLoading(false);
      }
    );

    return () => {
      isMounted = false;
      window.clearTimeout(failSafe);
      subscription.unsubscribe();
    };
  }, [supabase]);

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut({ scope: "local" });
    } catch (error) {
      console.warn("Auth signOut error (clearing local session anyway):", error);
    } finally {
      setUser(null);
      setCachedUser(null);
      clearCachedAuthToken();
      router.push("/login");
      router.refresh();
    }
  }, [router, supabase]);

  const value = useMemo<AuthContextType>(
    () => ({ user, loading, signOut }),
    [user, loading, signOut]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);