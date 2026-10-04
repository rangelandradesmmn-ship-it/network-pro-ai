import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sponsorCode, newUserId } = body;

    if (!sponsorCode || !newUserId) {
      return NextResponse.json({ error: 'Sponsor Code and New User ID are required.' }, { status: 400 });
    }

    if (sponsorCode.toUpperCase() === 'ROOT') {
       // Lógica especial para o primeiro usuário do sistema (não tem patrocinador)
       // Apenas cria a primeira matriz para ele.
       // Em uma implementação real com Supabase:
       // await supabase.from('matrices').insert({ owner_user_id: newUserId, matrix_number: 1, capacity: 155, rule_version_id: 1 });
       
       return NextResponse.json({
         success: true,
         message: 'Usuário ROOT criado com sucesso. Matriz 001 iniciada.',
         data: { newUserId, isRoot: true }
       }, { status: 200 });
    }

    // In a real implementation, you would use the Supabase client here to find the sponsor's real ID based on the sponsorCode:
    // const { data: sponsor } = await supabase.from('profiles').select('id').eq('referral_code', sponsorCode).single();
    // const sponsorId = sponsor.id;
    const sponsorId = "id-do-patrocinador-simulado";

    // And call the Postgres RPC function we created earlier (placement.sql):
    // const { data, error } = await supabase.rpc('place_user_in_matrix', { 
    //   p_sponsor_id: sponsorId, 
    //   p_new_user_id: newUserId 
    // });
    
    // if (error) throw error;

    // Simulated success response for the backend structure
    return NextResponse.json({
      success: true,
      message: 'Usuário posicionado na matriz com sucesso via BFS (Transacional).',
      data: {
        sponsorId,
        newUserId,
        placedAt: new Date().toISOString()
      }
    }, { status: 200 });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
