"use client";

import { useState, useRef, useCallback, DragEvent, ChangeEvent } from "react";
import { createClient } from "@/lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UploadedImage {
  url:       string;
  public_id: string;
  width:     number;
  height:    number;
}

interface UploadingFile {
  id:       string;
  name:     string;
  preview:  string;
  progress: number;
  error:    string | null;
  done:     boolean;
}

interface Props {
  maxFiles?:       number;
  existingImages?: UploadedImage[];
  onUpload:        (images: UploadedImage[]) => void;
  onRemove?:       (publicId: string) => void;
  storeId:         string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

/** Compress + resize image client-side before uploading (quality 80, max 1200px) */
async function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const MAX = 1200;
      let { width, height } = img;
      if (width > MAX || height > MAX) {
        if (width > height) { height = Math.round((height * MAX) / width); width = MAX; }
        else                { width  = Math.round((width  * MAX) / height); height = MAX; }
      }
      const canvas = document.createElement("canvas");
      canvas.width  = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("Compression failed")), "image/webp", 0.80);
    };
    img.onerror = reject;
    img.src = objectUrl;
  });
}

/** Upload one file to our FastAPI endpoint (which proxies to Cloudinary) */
async function uploadToCloudinary(
  file: File,
  storeId: string,
  onProgress: (pct: number) => void,
): Promise<UploadedImage> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error("Session expirée, reconnectez-vous");
  }

  const compressed = await compressImage(file);
  const formData = new FormData();
  formData.append("file",     new File([compressed], file.name, { type: "image/webp" }));
  formData.append("store_id", storeId);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000"}/upload/image`);
    xhr.setRequestHeader("Authorization", `Bearer ${session.access_token}`);

    xhr.upload.addEventListener("progress", e => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    });

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try { resolve(JSON.parse(xhr.responseText)); }
        catch { reject(new Error("Invalid JSON response")); }
      } else {
        reject(new Error(`Upload failed: ${xhr.status}`));
      }
    };
    xhr.onerror = () => reject(new Error("Network error"));
    xhr.send(formData);
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ImageUploader({
  maxFiles       = 5,
  existingImages = [],
  onUpload,
  onRemove,
  storeId,
}: Props) {
  const [uploading, setUploading] = useState<UploadingFile[]>([]);
  const [dragging,  setDragging]  = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const totalSlots  = existingImages.length + uploading.filter(u => !u.error).length;
  const canAddMore  = totalSlots < maxFiles;
  const remaining   = maxFiles - totalSlots;

  const processFiles = useCallback(async (files: FileList | File[]) => {
    const arr = Array.from(files).slice(0, remaining);
    if (!arr.length) return;

    // Validate type & size (max 10 MB raw)
    const valid = arr.filter(f => {
      if (!f.type.startsWith("image/")) return false;
      if (f.size > 10 * 1024 * 1024) return false;
      return true;
    });

    // Create placeholder entries immediately
    const entries: UploadingFile[] = valid.map(f => ({
      id:       uid(),
      name:     f.name,
      preview:  URL.createObjectURL(f),
      progress: 0,
      error:    null,
      done:     false,
    }));
    setUploading(prev => [...prev, ...entries]);

    // Upload each in parallel
    const results: UploadedImage[] = [];
    await Promise.all(
      valid.map(async (file, i) => {
        const entry = entries[i];
        if (!entry) return;
        try {
          const result = await uploadToCloudinary(file, storeId, pct => {
            setUploading(prev =>
              prev.map(u => u.id === entry.id ? { ...u, progress: pct } : u)
            );
          });
          setUploading(prev =>
            prev.map(u => u.id === entry.id ? { ...u, progress: 100, done: true } : u)
          );
          results.push(result);
        } catch (err) {
          setUploading(prev =>
            prev.map(u => u.id === entry.id
              ? { ...u, error: err instanceof Error ? err.message : "Erreur d'upload" }
              : u
            )
          );
        }
      })
    );

    if (results.length > 0) onUpload(results);

    // Clean up done entries after a short delay
    setTimeout(() => {
      setUploading(prev => prev.filter(u => !u.done));
    }, 1500);
  }, [remaining, onUpload, storeId]);

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    processFiles(e.dataTransfer.files);
  };

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) processFiles(e.target.files);
    e.target.value = "";
  };

  const removeUploading = (id: string) => {
    setUploading(prev => prev.filter(u => u.id !== id));
  };

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      {canAddMore && (
        <div
          className={`relative border-2 border-dashed rounded-2xl transition-all cursor-pointer select-none ${
            dragging
              ? "border-indigo-400 bg-indigo-500/10 scale-[1.01]"
              : "border-white/15 hover:border-white/30 hover:bg-white/[0.02]"
          }`}
          onDragOver={e  => { e.preventDefault(); setDragging(true); }}
          onDragEnter={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={onChange}
          />
          <div className="flex flex-col items-center gap-2 py-7 px-4 text-center">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl transition-all ${dragging ? "bg-indigo-500/20 scale-110" : "bg-white/5"}`}>
              {dragging ? "📂" : "🖼"}
            </div>
            <div>
              <p className="text-sm text-white/60">
                Glissez vos photos ou{" "}
                <span className="text-indigo-400 font-medium">parcourez</span>
              </p>
              <p className="text-xs text-white/30 mt-0.5">
                PNG, JPG, WEBP · max 10 Mo · {remaining} emplacement{remaining > 1 ? "s" : ""} restant{remaining > 1 ? "s" : ""}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Grid of existing + uploading images */}
      {(existingImages.length > 0 || uploading.length > 0) && (
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">

          {/* Existing uploaded images */}
          {existingImages.map((img, idx) => (
            <div key={img.public_id} className="relative group aspect-square">
              <img
                src={img.url}
                alt={`Product ${idx + 1}`}
                className="w-full h-full object-cover rounded-xl bg-white/5"
              />
              {/* Principale badge */}
              {idx === 0 && (
                <div className="absolute top-1 left-1 bg-indigo-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md leading-none">
                  Principale
                </div>
              )}
              {/* Remove button */}
              {onRemove && (
                <button
                  type="button"
                  onClick={() => onRemove(img.public_id)}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                >
                  ✕
                </button>
              )}
            </div>
          ))}

          {/* In-progress / error uploads */}
          {uploading.map(u => (
            <div key={u.id} className="relative aspect-square">
              <img
                src={u.preview}
                alt={u.name}
                className={`w-full h-full object-cover rounded-xl transition-opacity ${u.error ? "opacity-30" : u.done ? "opacity-100" : "opacity-50"}`}
              />

              {/* Progress overlay */}
              {!u.done && !u.error && (
                <div className="absolute inset-0 flex flex-col items-center justify-center rounded-xl bg-black/40">
                  <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-indigo-400 animate-spin" />
                  <span className="text-white text-xs mt-1 font-medium">{u.progress}%</span>
                </div>
              )}

              {/* Success flash */}
              {u.done && (
                <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-green-500/30">
                  <span className="text-2xl">✓</span>
                </div>
              )}

              {/* Error overlay */}
              {u.error && (
                <div className="absolute inset-0 flex flex-col items-center justify-center rounded-xl bg-red-900/70 p-1">
                  <span className="text-red-300 text-xs text-center leading-tight">{u.error}</span>
                  <button
                    type="button"
                    onClick={() => removeUploading(u.id)}
                    className="mt-1 text-red-300 text-xs underline"
                  >
                    Retirer
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Limit reached notice */}
      {!canAddMore && (
        <p className="text-center text-white/30 text-xs py-1">
          Maximum {maxFiles} photos atteint
        </p>
      )}
    </div>
  );
}

