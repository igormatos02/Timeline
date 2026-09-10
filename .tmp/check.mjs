import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../server/.env') });
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const res = await fetch(`${url}/rest/v1/`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
const spec = await res.json();
for (const [tbl, def] of Object.entries(spec.definitions || {})) {
  console.log(`\n== ${tbl} ==`);
  console.log('columns:', Object.keys(def.properties || {}));
  console.log('required:', def.required);
}
