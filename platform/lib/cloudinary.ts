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

  // 2. Fallback: Supabase Storage
  try {
    const admin = getAdminClient();
    const ext = (file as any).name?.split(".").pop() || "png";
    const fileName = `${storeId || "misc"}/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
    
    // Ensure bucket exists or upload to 'products' or 'public'
    const bucket = "products";
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { data, error } = await admin.storage
      .from(bucket)
      .upload(fileName, buffer, {
        contentType: (file as any).type || "image/png",
        upsert: true,
      });

    if (error) {
      console.warn("Supabase storage upload error:", error);
      throw error;
    }

    const { data: publicUrlData } = admin.storage.from(bucket).getPublicUrl(fileName);
    return {
      url: publicUrlData.publicUrl,
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
