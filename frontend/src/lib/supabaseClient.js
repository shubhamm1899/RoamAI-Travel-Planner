import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function saveTripToSupabase(tripPayload) {
  const { data, error } = await supabase
    .from('trips')
    .insert([tripPayload])
    .select();

  if (error) throw error;
  return data[0];
}

export async function fetchUserTrips() {
  const { data, error } = await supabase
    .from('trips')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}