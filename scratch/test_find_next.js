require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function test() {
  const { data, error } = await supabase.rpc('find_next_available_position', {
    p_matrix_id: '2045f9fd-ede2-4440-a40d-f8f9d4325aca', // Super Admin's matrix
    p_sponsor_id: '44de8042-1a9a-46dd-bfb9-4400e7884c29' // amigo1
  });
  console.log("find_next_available_position returned:", data);
  console.log("error:", error);
}
test();
