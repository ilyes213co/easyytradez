"use client";

import { useEffect, useState } from "react";

declare global {
  interface Window {
    THREE: any;
    __threeLoadingPromise?: Promise<void>;
  }
}

export function useThree(): boolean {
  const [loaded, setLoaded] = useState<boolean>(() => {
    if (typeof window !== "undefined" && window.THREE) {
      return true;
    }
    return false;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (window.THREE) {
      setLoaded(true);
      return;
    }

    if (!window.__threeLoadingPromise) {
      window.__threeLoadingPromise = new Promise<void>((resolve, reject) => {
        const existingScript = document.getElementById("three-cdn-script") as HTMLScriptElement | null;
        if (existingScript) {
          if (window.THREE) {
            resolve();
          } else {
            existingScript.addEventListener("load", () => resolve(), { once: true });
            existingScript.addEventListener("error", (e) => reject(e), { once: true });
          }
          return;
        }

        const script = document.createElement("script");
        script.id = "three-cdn-script";
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";
        script.async = true;
        script.onload = () => resolve();
        script.onerror = (e) => reject(e);
        document.head.appendChild(script);
      });
    }

    let isMounted = true;
    window.__threeLoadingPromise
      .then(() => {
        if (isMounted) setLoaded(true);
      })
      .catch((err) => {
        console.error("Erreur chargement Three.js:", err);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return loaded;
}
