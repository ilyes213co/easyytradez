import axios from "axios";
import { createBrowserClient } from "@supabase/ssr";

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

// Injecteur de token commun
const tokenInjector = async (config: any) => {
  try {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      config.headers["Authorization"] = `Bearer ${session.access_token}`;
    }
  } catch (e) {
    console.warn("api.ts: impossible de récupérer le token", e);
  }
  return config;
};

api.interceptors.request.use(tokenInjector);
apiLong.interceptors.request.use(tokenInjector);

// Log d'erreurs centralisé
const errorLogger = (error: any) => {
  const status = error.response?.status;
  const url = error.config?.url || "unknown URL";
  const data = error.response?.data;
  if (status === 422 && url.includes("/stores/")) {
    console.warn(`API Validation ${status} on ${url}:`, data ?? error.message);
    return Promise.reject(error);
  }
  
  if (!error.response) {
    // Erreur réseau ou timeout
    console.error(`API Error on ${url}: Network error or timeout (${error.message || "No message"})`);
  } else {
    console.error(`API Error ${status} on ${url}:`, data);
  }
  return Promise.reject(error);
};

api.interceptors.response.use(res => res, errorLogger);
apiLong.interceptors.response.use(res => res, errorLogger);

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

export const storesApi = {
  create: (data: Record<string, unknown>) => apiLong.post("/stores/", data).then(r => r.data),
  getAll: (type?: "boutique" | "funnel") => api.get("/stores/", { params: type ? { type } : undefined }).then(r => r.data),
  getOne: (id: string) => api.get(`/stores/${id}`).then(r => r.data),
  update: (id: string, data: Record<string, unknown>) => api.patch(`/stores/${id}`, data).then(r => r.data),
  updateTheme: (id: string, theme: string) => api.patch(`/api/stores/${id}/theme`, { theme }).then(r => r.data),
  getShippingRates: (id: string) => api.get(`/api/stores/${id}/shipping-rates`).then(r => r.data),
  updateShippingRatesBulk: (id: string, data: { price_home?: number; price_desk?: number }) =>
    api.patch(`/api/stores/${id}/shipping-rates/bulk`, data).then(r => r.data),
  updateShippingRate: (id: string, wilayaId: number, data: { price_home?: number; price_desk?: number }) =>
    api.patch(`/api/stores/${id}/shipping-rates/${wilayaId}`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/stores/${id}`).then(r => r.data),
};

export const productsApi = {
  create: (data: Record<string, unknown>) => api.post("/products/", data).then(r => r.data),
  getByStore: (storeId: string) => api.get(`/products/?store_id=${storeId}`).then(r => r.data),
  update: (id: string, data: Record<string, unknown>) => api.patch(`/products/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/products/${id}`).then(r => r.data),
};

export const uploadApi = {
  image: (payload: File | FormData, storeId?: string) =>
    api.post("/upload/image", toUploadFormData(payload, storeId), {
      headers: { "Content-Type": "multipart/form-data" },
    }).then(r => r.data),
  logo: (payload: File | FormData, storeId?: string) =>
    api.post("/upload/logo", toUploadFormData(payload, storeId), {
      headers: { "Content-Type": "multipart/form-data" },
    }).then(r => r.data),
  delete: (publicId: string) =>
    api.delete("/upload/image", { params: { public_id: publicId } }).then(r => r.data),
};

export const analyticsApi = {
  get: (storeId: string, period: "today" | "7d" | "30d" | "3m") =>
    api.get(`/analytics/${storeId}`, { params: { period } }).then(r => r.data),
};

export const deployApi = {
  start: (storeId: string) => apiLong.post(`/deploy/${storeId}`).then(r => r.data),
  deploy: (storeId: string) => apiLong.post(`/deploy/${storeId}`).then(r => r.data),
  redeploy: (storeId: string) => apiLong.post(`/deploy/${storeId}/redeploy`).then(r => r.data),
  status: (jobId: string) => api.get(`/deploy/status/${jobId}`).then(r => r.data),
};

export const seoApi = {
  update: (storeId: string, data: Record<string, unknown>) =>
    api.patch(`/stores/${storeId}`, { seo_metadata: data }).then(r => r.data),
  getSitemapUrl: (storeId: string) => `${API_URL}/seo/${storeId}/sitemap.xml`,
  getRobotsUrl: (storeId: string) => `${API_URL}/seo/${storeId}/robots.txt`,
};

export default api;
