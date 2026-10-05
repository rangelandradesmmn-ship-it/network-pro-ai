require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function test() {
  const { data, error } = await supabase.rpc('hello_world'); // fake call to see error or whatever
  
  // Just fetch from matrices
  const { data: m, error: me } = await supabase.from('matrices').select('*').limit(1);
  console.log("Matrices sample:", m);
}
test();
