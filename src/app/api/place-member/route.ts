import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sponsorCode, newUserId, name, email, phone } = body;

    if (!sponsorCode || !newUserId) {
      return NextResponse.json({ error: 'Sponsor Code and New User ID are required.' }, { status: 400 });
    }

    // 1. Check if rules exist, if not create default
    let ruleVersionId = 1;
    const { data: rules } = await supabase.from('matrix_rule_versions').select('id').order('id', { ascending: true }).limit(1);
    
    if (!rules || rules.length === 0) {
      const { data: newRule, error: ruleErr } = await supabase.from('matrix_rule_versions')
        .insert([{ capacity: 155, level_1_points: 20, level_2_points: 10, level_3_points: 20 }])
        .select('id')
        .single();
      if (!ruleErr && newRule) {
        ruleVersionId = newRule.id;
      }
    } else {
      ruleVersionId = rules[0].id;
    }

    // 2. Create Profile
    const refCode = 'NP' + Math.floor(100000 + Math.random() * 900000);
    const { error: profileError } = await supabase.from('profiles').insert([{
      id: newUserId,
      name: name || 'Usuário',
      email: email || '',
      phone: phone || '',
      referral_code: refCode,
      role: sponsorCode.toUpperCase() === 'ROOT' ? 'ADMIN' : 'USER',
      sponsor_id: sponsorCode.toUpperCase() === 'ROOT' ? null : sponsor.id
    }]);

    if (profileError) {
      console.error('Profile Error:', profileError);
      return NextResponse.json({ error: 'Erro de Banco (Profiles): ' + profileError.message }, { status: 500 });
    }

    // 3. Process Placement
    if (sponsorCode.toUpperCase() === 'ROOT') {
       const { error: matrixError } = await supabase.from('matrices').insert([{ 
         owner_user_id: newUserId, 
         matrix_number: 1, 
         capacity: 155, 
         rule_version_id: ruleVersionId 
       }]);
       
       if (matrixError) {
         return NextResponse.json({ error: 'Erro de Banco (Matrices): ' + matrixError.message }, { status: 500 });
       }

       return NextResponse.json({
         success: true,
         message: 'Usuário ROOT criado com sucesso. Matriz 001 iniciada.',
         data: { newUserId, isRoot: true }
       }, { status: 200 });
    }

    // Get Sponsor ID
    const { data: sponsor, error: sponsorError } = await supabase.from('profiles').select('id').eq('referral_code', sponsorCode).single();
    
    if (sponsorError || !sponsor) {
      return NextResponse.json({ error: 'Código do patrocinador não encontrado.' }, { status: 404 });
    }

    // Run the RPC for Spillover placement
    const { data, error } = await supabase.rpc('place_user_in_matrix', { 
      p_sponsor_id: sponsor.id, 
      p_new_user_id: newUserId 
    });
    
    if (error) {
      console.error('RPC Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Usuário posicionado com sucesso.', data }, { status: 200 });
  } catch (err: any) {
    console.error('Unexpected API Error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
