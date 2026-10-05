require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function test() {
  const { data: p } = await supabase.from('profiles').select('id').limit(1);
  const uid = p[0].id;
  const { data, error } = await supabase.rpc('place_user_in_matrix', { 
    p_sponsor_id: uid, 
    p_new_user_id: uid,
    p_tenant_id: uid
  });
  console.log(error);
}
test();
