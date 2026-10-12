import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

// Load .env.local manually
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const TARGET_USER_ID = "b50f2641-f008-4334-82af-e7b005df94f1";
const TARGET_EMAIL = "nltlttlt3@gmail.com";

async function main() {
  console.log(`Checking user: ${TARGET_USER_ID} (${TARGET_EMAIL})...`);

  // 1. Fetch user from auth.users (admin API)
  const { data: authUserData, error: authUserErr } = await supabase.auth.admin.getUserById(TARGET_USER_ID);
  if (authUserErr) {
    console.warn("Auth admin getUserById warning:", authUserErr.message);
  } else {
    console.log("Auth user found:", authUserData?.user?.email, authUserData?.user?.id);
  }

  // 2. Fetch existing profile
  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", TARGET_USER_ID)
    .maybeSingle();

  console.log("Current profile in database:", profile || "None found");

  // 3. Upsert profile with Business plan without limits
  // plan_expires_at set to null or a distant future date (2099) so it is permanent
  const updateData = {
    id: TARGET_USER_ID,
    plan: "business",
    plan_expires_at: null,
    full_name: profile?.full_name || "Seum B.",
    updated_at: new Date().toISOString(),
  };

  const { data: updatedProfile, error: updateErr } = await supabase
    .from("profiles")
    .upsert(updateData)
    .select()
    .single();

  if (updateErr) {
    console.error("Failed to update profile:", updateErr);
    process.exit(1);
  }

  console.log("SUCCESS! Updated profile to Business plan (unlimited):");
  console.log(JSON.stringify(updatedProfile, null, 2));
}

main().catch(console.error);
