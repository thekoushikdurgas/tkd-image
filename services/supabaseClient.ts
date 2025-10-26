import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://woqnlgszvkqxaqabtqfv.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvcW5sZ3N6dmtxeGFxYWJ0cWZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzMTM4ODYsImV4cCI6MjA3Njg4OTg4Nn0.DpePQML323-gdbbPxidrq-up8PXeBdXlG_8AtcIMW0o';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL and Anon Key must be provided.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
