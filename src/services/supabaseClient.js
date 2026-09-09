import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ditrbdxayzxymjsgcpta.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRpdHJiZHhheXp4eW1qc2djcHRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc2OTY2ODksImV4cCI6MjEwMzI3MjY4OX0.b3gcmiJZbCSidxSULgrTSGMVHH6ZWQsdv-JY5-GQbOU';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});
