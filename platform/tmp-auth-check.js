const { createClient } = require("@supabase/supabase-js");
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_KEY;
const supabase = createClient(url, key);
const start = Date.now();
supabase.auth.getUser().then((r) => {
  console.log("ms", Date.now()-start);
  console.log("error", r.error?.message || null);
  console.log("hasUser", !!r.data?.user);
}).catch((e)=>{console.log("err", e.message);});
