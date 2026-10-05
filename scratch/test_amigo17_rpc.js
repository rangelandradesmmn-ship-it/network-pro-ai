require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function test() {
  const { data, error } = await supabase.rpc('place_user_in_matrix', { 
    p_sponsor_id: '44de8042-1a9a-46dd-bfb9-4400e7884c29', 
    p_new_user_id: 'b2413eef-8045-44bb-8601-9122f170ca1d',
    p_tenant_id: '44de8042-1a9a-46dd-bfb9-4400e7884c29'
  });
  console.log("RPC Error:", error);
}
test();
