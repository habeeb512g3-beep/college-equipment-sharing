const SUPABASE_URL = "https://xlxcjfoqlezsbmhxbkus.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_wqL0uxVAHd_d7ah66lJV2g_iee46-7A";

window.supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);

console.log("CampusShare Supabase connected!");
