"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  ChevronLeft, Save, Globe, ShieldAlert, 
  ExternalLink, Search, CheckCircle2, AlertCircle,
  Settings, Layout, Type
} from "lucide-react";
import { toast } from "sonner";
import { seoApi, storesApi } from "@/lib/api";
import type { Store } from "@/types/database";

type SeoStore = Store & {
  seo_title?: string | null;
  seo_description?: string | null;
  seo_metadata?: Record<string, any>;
};

export default function SeoSettingsPage() {
  const params = useParams();
  const storeId = params.id as string;
  const router = useRouter();

  const [store, setStore] = useState<SeoStore | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Form states
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [disallowPaths, setDisallowPaths] = useState<string[]>([]);
  const [newPath, setNewPath] = useState("");

  useEffect(() => {
    async function loadStore() {
      try {
        const data = await storesApi.getOne(storeId);
        setStore(data);
        setSeoTitle(data.seo_title || "");
        setSeoDescription(data.seo_description || "");
        
        const metadata = data.seo_metadata || {};
        setDisallowPaths(metadata.disallow_paths || ["/admin", "/cart", "/checkout"]);
      } catch (err) {
        console.error(err);
        toast.error("Impossible de charger les paramètres SEO");
      } finally {
        setIsLoading(false);
      }
    }
    loadStore();
  }, [storeId]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // 1. Update basic SEO fields in store
      await storesApi.update(storeId, {
        seo_title: seoTitle,
        seo_description: seoDescription,
        seo_metadata: {
          ...store?.seo_metadata,
          disallow_paths: disallowPaths
        }
      });

      toast.success("Paramètres SEO enregistrés !");
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setIsSaving(false);
    }
  };

  const addPath = () => {
    if (!newPath) return;
    if (!newPath.startsWith("/")) {
      toast.error("Le chemin doit commencer par /");
      return;
    }
    if (disallowPaths.includes(newPath)) return;
    setDisallowPaths([...disallowPaths, newPath]);
    setNewPath("");
  };

  const removePath = (path: string) => {
    setDisallowPaths(disallowPaths.filter(p => p !== path));
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  const sitemapUrl = seoApi.getSitemapUrl(storeId);
  const robotsUrl = seoApi.getRobotsUrl(storeId);

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Optimisation SEO</h1>
            <p className="text-sm text-gray-500">Gérez la visibilité de votre boutique sur Google et les moteurs de recherche</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="btn-primary flex items-center gap-2"
        >
          {isSaving ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Enregistrer
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Main Settings */}
        <div className="md:col-span-2 space-y-6">
          {/* Preview Card */}
          <div className="card p-6 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Search className="h-4 w-4" /> Aperçu Google
            </h2>
            <div className="p-4 bg-white border rounded-lg shadow-sm space-y-1">
              <div className="text-blue-700 text-lg font-medium hover:underline cursor-pointer truncate">
                {seoTitle || store?.name || "Ma Boutique"}
              </div>
              <div className="text-green-700 text-sm truncate">
                {store?.published_url || (store?.slug ? `https://store-${store.slug}.vercel.app` : "https://mon-site.vercel.app")}
              </div>
              <div className="text-gray-600 text-sm line-clamp-2">
                {seoDescription || "Découvrez nos produits exceptionnels et profitez de nos offres exclusives. Livraison rapide partout en Algérie."}
              </div>
            </div>
          </div>

          {/* Meta Tags */}
          <div className="card p-6 space-y-6">
            <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Type className="h-4 w-4" /> Balises Meta
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Titre SEO (Title Tag)</label>
                <input 
                  type="text"
                  value={seoTitle}
                  onChange={(e) => setSeoTitle(e.target.value)}
                  placeholder={store?.name}
                  className="input w-full"
                />
                <p className="mt-1 text-xs text-gray-400">Recommandé : 50-60 caractères. Actuel : {seoTitle.length}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Méta-description</label>
                <textarea 
                  rows={3}
                  value={seoDescription}
                  onChange={(e) => setSeoDescription(e.target.value)}
                  placeholder="Une brève description de votre boutique pour les résultats de recherche..."
                  className="input w-full"
                />
                <p className="mt-1 text-xs text-gray-400">Recommandé : 150-160 caractères. Actuel : {seoDescription.length}</p>
              </div>
            </div>
          </div>

          {/* Robots configuration */}
          <div className="card p-6 space-y-6">
            <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <ShieldAlert className="h-4 w-4" /> Indexation (Robots.txt)
            </h2>
            
            <div className="space-y-4">
              <p className="text-sm text-gray-500">Définissez les chemins que les moteurs de recherche ne doivent pas explorer.</p>
              
              <div className="flex gap-2">
                <input 
                  type="text"
                  value={newPath}
                  onChange={(e) => setNewPath(e.target.value)}
                  placeholder="/secret-page"
                  className="input flex-1"
                />
                <button onClick={addPath} className="btn-secondary">Ajouter</button>
              </div>

              <div className="flex flex-wrap gap-2">
                {disallowPaths.map(path => (
                  <span key={path} className="inline-flex items-center gap-1 px-3 py-1 bg-red-50 text-red-700 rounded-full text-xs font-medium border border-red-100">
                    {path}
                    <button onClick={() => removePath(path)} className="hover:text-red-900">×</button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar info */}
        <div className="space-y-6">
          <div className="card p-6 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Globe className="h-4 w-4" /> Fichiers SEO
            </h2>
            <div className="space-y-3">
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 space-y-1">
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Sitemap XML</div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600 truncate mr-2">sitemap.xml</span>
                  <a href={sitemapUrl} target="_blank" rel="noreferrer" className="text-primary-600 hover:text-primary-700">
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
              
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 space-y-1">
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Robots TXT</div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600 truncate mr-2">robots.txt</span>
                  <a href={robotsUrl} target="_blank" rel="noreferrer" className="text-primary-600 hover:text-primary-700">
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            </div>
            <div className="pt-2">
              <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 p-3 rounded-lg border border-amber-100">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <p>Ces fichiers sont générés automatiquement et mis à jour en temps réel selon votre catalogue.</p>
              </div>
            </div>
          </div>

          <div className="card p-6 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" /> Checklist SEO
            </h2>
            <ul className="space-y-2">
              {[
                { label: "Titre de boutique", status: !!seoTitle || !!store?.name },
                { label: "Description", status: !!seoDescription },
                { label: "Sitemap généré", status: true },
                { label: "Robots configuré", status: true },
                { label: "SSL (HTTPS)", status: true },
              ].map((item, idx) => (
                <li key={idx} className="flex items-center gap-2 text-sm text-gray-600">
                  {item.status ? (
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                  ) : (
                    <div className="h-3 w-3 rounded-full border border-gray-300" />
                  )}
                  {item.label}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
