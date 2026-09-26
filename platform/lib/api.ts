import axios from "axios";
import { getSupabaseBrowserClient } from "@/lib/supabase";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

// Client standard — requêtes courtes (30s)
export const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 30000,
});

// Client long-running — génération IA + déploiement (10 min)
export const apiLong = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 600000,
});

// ─── In-Memory Token Cache with Single-Flight Promise ───────────────────────
let cachedToken: string | null = null;
let tokenExpiresAt = 0;
let pendingTokenPromise: Promise<string | null> | null = null;

export function setCachedAuthToken(token: string | null, expiresInSeconds = 120) {
  cachedToken = token;
  // Expire 30s before actual JWT expiration to avoid edge-case 401s
  tokenExpiresAt = Date.now() + Math.max(30, expiresInSeconds - 30) * 1000;
}

export function clearCachedAuthToken() {
  cachedToken = null;
  tokenExpiresAt = 0;
  pendingTokenPromise = null;
}

export async function getValidAuthToken(): Promise<string | null> {
  const now = Date.now();
  if (cachedToken && now < tokenExpiresAt) {
    return cachedToken;
  }

  // Single-flight: If another request is currently resolving/refreshing the session, await it!
  if (pendingTokenPromise) {
    return pendingTokenPromise;
  }

  pendingTokenPromise = (async () => {
    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.warn("[api.ts] getSession warning:", error.message);
        clearCachedAuthToken();
        return null;
      }
      const token = data?.session?.access_token;
      if (token) {
        const expiresIn = data.session?.expires_in ?? 3600;
        setCachedAuthToken(token, expiresIn);
        return token;
      }
      clearCachedAuthToken();
      return null;
    } catch (err) {
      console.warn("[api.ts] impossible de récupérer le token:", err);
      clearCachedAuthToken();
      return null;
    } finally {
      pendingTokenPromise = null;
    }
  })();

  return pendingTokenPromise;
}

// ─── Request Interceptor ────────────────────────────────────────────────────
const tokenInjector = async (config: any) => {
  try {
    const token = await getValidAuthToken();
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
  } catch (e) {
    console.warn("api.ts: tokenInjector error", e);
  }
  return config;
};

api.interceptors.request.use(tokenInjector);
apiLong.interceptors.request.use(tokenInjector);

// ─── Centralized Error Logger ───────────────────────────────────────────────
const errorLogger = (error: any) => {
  const status = error.response?.status;
  const url = error.config?.url || "unknown URL";
  const data = error.response?.data;

  if (status === 422 && url.includes("/stores/")) {
    console.warn(`API Validation ${status} on ${url}:`, data ?? error.message);
    return Promise.reject(error);
  }

  if (!error.response) {
    console.error(`API Error on ${url}: Network error or timeout (${error.message || "No message"})`);
  } else if (status !== 401) {
    console.error(`API Error ${status} on ${url}:`, data);
  }
  return Promise.reject(error);
};

// ─── 401 Auto-Retry Response Interceptor ────────────────────────────────────
// If a request fails with 401 because the token expired mid-session,
// cleanly refresh the session once and replay the request transparently!
const make401RetryInterceptor = (axiosInstance: any) => async (error: any) => {
  const originalRequest = error.config;
  if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
    originalRequest._retry = true;
    clearCachedAuthToken();

    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error: refreshErr } = await supabase.auth.refreshSession();
      if (!refreshErr && data?.session?.access_token) {
        const newToken = data.session.access_token;
        const expiresIn = data.session.expires_in ?? 3600;
        setCachedAuthToken(newToken, expiresIn);
        originalRequest.headers["Authorization"] = `Bearer ${newToken}`;
        return axiosInstance(originalRequest);
      }
    } catch (refreshErr) {
      console.warn("[api.ts] 401 auto-refresh attempt failed:", refreshErr);
    }
  }
  return errorLogger(error);
};

api.interceptors.response.use((res) => res, make401RetryInterceptor(api));
apiLong.interceptors.response.use((res) => res, make401RetryInterceptor(apiLong));

const toUploadFormData = (payload: File | FormData, storeId?: string) => {
  if (payload instanceof FormData) {
    return payload;
  }
  if (!storeId) {
    throw new Error("storeId requis pour l'upload");
  }
  const formData = new FormData();
  formData.append("file", payload);
  formData.append("store_id", storeId);
  return formData;
};

// ─── Fast In-Memory Store Cache ─────────────────────────────────────────────
let storesCache: any = null;
let storesCacheTime = 0;
const STORES_CACHE_TTL = 30000; // 30 seconds

export const invalidateStoresCache = () => {
  storesCache = null;
  storesCacheTime = 0;
};

export const storesApi = {
  create: async (data: Record<string, unknown>) => {
    invalidateStoresCache();
    return apiLong.post("/stores/", data).then((r) => r.data);
  },
  getAll: async (forceRefresh = false) => {
    const now = Date.now();
    if (!forceRefresh && storesCache && now - storesCacheTime < STORES_CACHE_TTL) {
      return storesCache;
    }
    try {
      // Timeout ultra-court (2s) pour ne pas faire attendre l'utilisateur et basculer vite sur Supabase
      const res = await api.get("/stores/", { timeout: 2000 }).then((r) => r.data);
      if (Array.isArray(res)) {
        storesCache = res;
        storesCacheTime = Date.now();
        return res;
      }
    } catch (err) {
      console.warn("[storesApi.getAll] API timeout/erreur, bascule automatique sur Supabase:", err);
      try {
        const supabase = getSupabaseBrowserClient();
        const { data: userData } = await supabase.auth.getUser();
        if (userData?.user?.id) {
          const { data } = await supabase
            .from("stores")
            .select("*")
            .eq("owner_id", userData.user.id)
            .order("created_at", { ascending: false });
          if (Array.isArray(data)) {
            storesCache = data;
            storesCacheTime = Date.now();
            return data;
          }
        }
      } catch (fallbackErr) {
        console.warn("[storesApi.getAll] Échec du fallback Supabase:", fallbackErr);
      }
    }
    return storesCache ?? [];
  },
  getOne: (id: string) => api.get(`/stores/${id}`).then((r) => r.data),
  update: async (id: string, data: Record<string, unknown>) => {
    invalidateStoresCache();
    return api.patch(`/stores/${id}`, data).then((r) => r.data);
  },
  delete: async (id: string) => {
    invalidateStoresCache();
    return api.delete(`/stores/${id}`).then((r) => r.data);
  },
};

export const productsApi = {
  create: (data: Record<string, unknown>) => api.post("/products/", data).then((r) => r.data),
  getByStore: (storeId: string) => api.get(`/products/?store_id=${storeId}`).then((r) => r.data),
  update: (id: string, data: Record<string, unknown>) => api.patch(`/products/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/products/${id}`).then((r) => r.data),
};

export const uploadApi = {
  image: (payload: File | FormData, storeId?: string) =>
    api.post("/upload/image", toUploadFormData(payload, storeId), {
      headers: { "Content-Type": "multipart/form-data" },
    }).then((r) => r.data),
  logo: (payload: File | FormData, storeId?: string) =>
    api.post("/upload/logo", toUploadFormData(payload, storeId), {
      headers: { "Content-Type": "multipart/form-data" },
    }).then((r) => r.data),
  delete: (publicId: string) =>
    api.delete("/upload/image", { params: { public_id: publicId } }).then((r) => r.data),
};

export const analyticsApi = {
  get: (storeId: string, period: "today" | "7d" | "30d" | "3m") =>
    api.get(`/analytics/${storeId}`, { params: { period } }).then((r) => r.data),
};

export const deployApi = {
  start: (storeId: string) => apiLong.post(`/deploy/${storeId}`).then((r) => r.data),
  deploy: (storeId: string) => apiLong.post(`/deploy/${storeId}`).then((r) => r.data),
  redeploy: (storeId: string) => apiLong.post(`/deploy/${storeId}/redeploy`).then((r) => r.data),
  status: (jobId: string) => api.get(`/deploy/status/${jobId}`).then((r) => r.data),
};

export const seoApi = {
  update: (storeId: string, data: Record<string, unknown>) =>
    api.patch(`/stores/${storeId}`, { seo_metadata: data }).then((r) => r.data),
  getSitemapUrl: (storeId: string) => `${API_URL}/seo/${storeId}/sitemap.xml`,
  getRobotsUrl: (storeId: string) => `${API_URL}/seo/${storeId}/robots.txt`,
};

export default api;

export const ordersApi = {
  getByStore: async (storeId: string) => {
    try {
      const res = await api.get<{ success: boolean; orders: any[] }>(`/orders?store_id=${storeId}`);
      return res.data.orders ?? [];
    } catch {
      return [];
    }
  },
  create: async (data: any) => {
    const res = await api.post<{ success: boolean; order: any }>("/orders", data);
    return res.data.order;
  },
};

export const teamApi = {
  getByStore: async (storeId: string) => {
    try {
      const res = await api.get<{ success: boolean; members: any[] }>(`/team?store_id=${storeId}`);
      return res.data.members ?? [];
    } catch {
      return [];
    }
  },
  add: async (data: { store_id: string; user_email: string; role: string }) => {
    const res = await api.post<{ success: boolean; member: any }>("/team", data);
    return res.data.member;
  },
  delete: async (id: string) => {
    await api.delete(`/team/${id}`);
    return true;
  },
};
