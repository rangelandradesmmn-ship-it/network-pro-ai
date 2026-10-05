require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function test() {
  const { data: user17 } = await supabase.from('profiles').select('*').eq('name', 'amigo17').single();
  console.log("amigo17 Profile:", user17);
  
  if (user17) {
    const { data: pos } = await supabase.from('matrix_positions').select('*').eq('user_id', user17.id);
    console.log("Matrix positions for amigo17:", pos);
  }
}
test();
