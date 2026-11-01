const SUPABASE_URL = "https://xlxcjfoqlezsbmhxbkus.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhseGNqZm9xbGV6c2JtaHhia3VzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMzNDAzMjYsImV4cCI6MjEwODkxNjMyNn0.8CYm9DWJr3hmtLLZbgJDmC7vMA7pblDU5v9UBTjfh-g";

window.supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);

console.log("CampusShare Supabase connected!");
