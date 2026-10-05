require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function test() {
  const { data: user2 } = await supabase.from('profiles').select('id, name').eq('name', 'amigo2').single();
  console.log("amigo2 ID:", user2.id);
  
  const { data: ledger } = await supabase.from('financial_ledger').select('*').eq('from_user_id', user2.id);
  console.log("Ledger for amigo2:", ledger);
}
test();
