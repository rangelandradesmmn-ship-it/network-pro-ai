require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data: root } = await supabase.from('profiles').select('*').eq('referral_code', 'NP918837').single();
  const { data: ledger } = await supabase.from('financial_ledger').select('*').eq('user_id', root.id);
  console.log('Root Ledger:', ledger);
}
check();
