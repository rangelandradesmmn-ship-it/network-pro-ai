"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/utils/supabase';

export default function MinhasMatrizes() {
  const [loading, setLoading] = useState(true);
  const [matrizes, setMatrizes] = useState<any[]>([]);

  useEffect(() => {
    async function loadMatrices() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Verifica se é admin
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();

        if (profile?.role === 'SUPER_ADMIN' || profile?.role === 'ADMIN') {
          // Admins veem a matriz real da empresa
          const { data } = await supabase
            .from('matrices')
            .select('*')
            .eq('owner_user_id', user.id)
            .order('matrix_number', { ascending: false });
          if (data) setMatrizes(data);
        } else {
          // Usuários comuns veem o próprio progresso na downline calculada pelo RPC
          const { data, error } = await supabase.rpc('get_user_matrices_progress', { p_user_id: user.id });
          if (data) setMatrizes(data);
        }
      } catch (error) {
        console.error("Erro ao carregar matrizes:", error);
      } finally {
        setLoading(false);
      }
    }
    loadMatrices();
  }, []);

  return (
    <div className="min-h-screen bg-[#07111F] text-[#F4F7FA] p-8">
      <h1 className="text-2xl font-bold mb-6 text-[#00AEEF]">Histórico de Matrizes</h1>
      
      <p className="text-[#91A4B7] mb-8 max-w-2xl">
        Aqui você encontra o registro imutável de todos os seus ciclos. Cada nova matriz começa vazia (0/155). As matrizes fechadas continuam disponíveis para auditoria da rede.
      </p>

      {loading ? (
        <div className="text-[#00AEEF]">Carregando histórico...</div>
      ) : matrizes.length === 0 ? (
        <div className="text-[#91A4B7]">Nenhuma matriz encontrada.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {matrizes.map((matriz, index) => {
            const isCurrent = index === 0; // O primeiro do array é a mais recente devido ao order by desc
            const percent = Math.round((matriz.total_members / matriz.capacity) * 100);
            
            return (
              <div key={matriz.id} className={`bg-[#0E1B2B] p-6 rounded-2xl border shadow-lg relative ${isCurrent ? 'border-[#00AEEF]' : 'border-[#91A4B7]/20'}`}>
                {isCurrent && (
                  <span className="absolute top-4 right-4 bg-[#00AEEF]/20 text-[#00AEEF] text-xs font-bold px-2 py-1 rounded">ATUAL</span>
                )}
                <h3 className="text-xl font-bold mb-2">Matriz #{String(matriz.matrix_number).padStart(3, '0')}</h3>
                
                <p className={`font-semibold mb-4 ${matriz.status === 'COMPLETED' ? 'text-[#00E89D]' : 'text-[#91A4B7]'}`}>
                  {matriz.status === 'COMPLETED' ? 'Completa' : 'Em andamento'}
                </p>

                <div className="flex justify-between items-end mb-2">
                  <p className="text-2xl font-bold text-white">{matriz.total_members} <span className="text-sm text-[#91A4B7]">/ {matriz.capacity}</span></p>
                  <p className="text-sm font-bold">{percent}%</p>
                </div>
                
                <div className="w-full bg-[#07111F] rounded-full h-2 mb-4 overflow-hidden">
                  <div 
                    className={`h-2 rounded-full ${matriz.status === 'COMPLETED' ? 'bg-[#00E89D]' : 'bg-gradient-to-r from-[#00AEEF] to-[#00E5FF]'}`}
                    style={{ width: `${percent}%` }}
                  ></div>
                </div>

                <p className="text-xs text-[#91A4B7] mb-4">Criada em: {new Date(matriz.created_at).toLocaleDateString('pt-BR')}</p>

                <Link href="/minha-rede">
                  <button className="w-full py-2 bg-[#07111F] border border-[#91A4B7]/30 hover:bg-[#00AEEF]/10 hover:border-[#00AEEF]/50 transition-colors rounded-lg text-sm font-semibold">
                    Visualizar Estrutura
                  </button>
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
