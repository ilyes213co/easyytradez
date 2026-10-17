import crypto from "crypto";
import { getAdminClient } from "./api-auth";

export async function uploadImageFile(file: File | Blob, folder: string, storeId?: string) {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  // 1. Try Cloudinary if credentials exist
  if (cloudName && apiKey && apiSecret) {
    try {
      const timestamp = Math.floor(Date.now() / 1000);
      const toSign = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
      const signature = crypto.createHash("sha1").update(toSign).digest("hex");

      const formData = new FormData();
      formData.append("file", file);
      formData.append("api_key", apiKey);
      formData.append("timestamp", String(timestamp));
      formData.append("folder", folder);
      formData.append("signature", signature);

      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        return {
          url: data.secure_url || data.url,
          public_id: data.public_id,
          width: data.width,
          height: data.height,
          format: data.format,
        };
      } else {
        const errText = await res.text();
        console.warn("Cloudinary upload failed, attempting fallback:", errText);
      }
    } catch (err) {
      console.warn("Cloudinary upload exception, attempting fallback:", err);
    }
  }

  // 2. Fallback: Supabase Storage (store-assets, products, public)
  try {
    const admin = getAdminClient();
    const ext = (file as any).name?.split(".").pop() || "png";
    const fileName = `${storeId || "misc"}/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
    
    const candidateBuckets = ["store-assets", "products", "public"];
    let uploadSuccess = false;
    let finalUrl = "";
    let lastError: any = null;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    for (const b of candidateBuckets) {
      try {
        const { error: upErr } = await admin.storage
          .from(b)
          .upload(fileName, buffer, {
            contentType: (file as any).type || "image/png",
            upsert: true,
          });

        if (!upErr) {
          const { data: pubData } = admin.storage.from(b).getPublicUrl(fileName);
          if (pubData?.publicUrl) {
            finalUrl = pubData.publicUrl;
            uploadSuccess = true;
            break;
          }
        }

        // Si le bucket n'existe pas, tente de le créer automatiquement
        if (
          upErr?.message?.toLowerCase().includes("not found") ||
          (upErr as any)?.statusCode === "404" ||
          (upErr as any)?.error === "Bucket not found"
        ) {
          await admin.storage.createBucket(b, { public: true }).catch(() => {});
          const { error: retryErr } = await admin.storage
            .from(b)
            .upload(fileName, buffer, {
              contentType: (file as any).type || "image/png",
              upsert: true,
            });

          if (!retryErr) {
            const { data: pubData } = admin.storage.from(b).getPublicUrl(fileName);
            if (pubData?.publicUrl) {
              finalUrl = pubData.publicUrl;
              uploadSuccess = true;
              break;
            }
          }
          lastError = retryErr;
        } else {
          lastError = upErr;
        }
      } catch (bucketErr) {
        lastError = bucketErr;
      }
    }

    if (!uploadSuccess || !finalUrl) {
      throw lastError || new Error("Impossible de téléverser l'image dans le stockage Supabase");
    }

    return {
      url: finalUrl,
      public_id: fileName,
      width: 800,
      height: 800,
      format: ext,
    };
  } catch (supabaseErr: any) {
    throw new Error(`Échec du téléversement de l'image: ${supabaseErr.message || "Erreur inconnue"}`);
  }
}

export async function deleteFromCloudinary(publicId: string) {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    return { success: false, message: "Cloudinary credentials not set" };
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const toSign = `public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
  const signature = crypto.createHash("sha1").update(toSign).digest("hex");

  const formData = new FormData();
  formData.append("public_id", publicId);
  formData.append("api_key", apiKey);
  formData.append("timestamp", String(timestamp));
  formData.append("signature", signature);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, {
    method: "POST",
    body: formData,
  });

  const data = await res.json();
  return { success: res.ok && data.result === "ok", data };
}
