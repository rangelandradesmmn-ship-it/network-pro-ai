import { createClient } from '@supabase/supabase-js';

// Essas variáveis de ambiente devem ser configuradas no seu arquivo .env.local
// e também cadastradas no painel do Firebase/Supabase de produção.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://seu-projeto.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sua-chave-anon-aqui';

// Criamos um cliente único para ser reaproveitado no front-end
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
