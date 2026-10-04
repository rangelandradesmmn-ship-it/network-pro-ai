"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase';

type Referral = {
  id: string;
  name: string;
  created_at: string;
  matrix: string;
  level: number;
  position: number;
  status: string;
};

export default function MinhasIndicacoes() {
  const [loading, setLoading] = useState(true);
  const [referrals, setReferrals] = useState<Referral[]>([]);

  useEffect(() => {
    async function loadReferrals() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch user's direct referrals
        const { data: directReferrals } = await supabase
          .from('profiles')
          .select('id, name, created_at, status, referral_code')
          .eq('sponsor_id', user.id)
          .order('created_at', { ascending: false });

        if (!directReferrals || directReferrals.length === 0) {
          setReferrals([]);
          return;
        }

        const referralIds = directReferrals.map(r => r.id);

        // Fetch their matrix positions
        const { data: positions } = await supabase
          .from('matrix_positions')
          .select('user_id, matrix_id, level, position_index')
          .in('user_id', referralIds);

        const posMap: Record<string, any> = {};
        if (positions) {
          positions.forEach(p => {
            posMap[p.user_id] = p;
          });
        }

        const formatted = directReferrals.map((ref: any) => {
          const pos = posMap[ref.id];
          return {
            id: ref.referral_code || ref.id.substring(0, 8),
            name: ref.name,
            created_at: new Date(ref.created_at).toLocaleDateString('pt-BR'),
            matrix: pos ? `#001` : '---', 
            level: pos ? pos.level : 0,
            position: pos ? pos.position_index : 0,
            status: ref.status
          };
        });

        setReferrals(formatted);
      } catch (error) {
        console.error("Erro ao carregar indicações", error);
      } finally {
        setLoading(false);
      }
    }
    loadReferrals();
  }, []);

  return (
    <div className="min-h-screen bg-[#07111F] text-[#F4F7FA] p-8">
      <h1 className="text-2xl font-bold mb-6 text-[#00AEEF]">Minhas Indicações</h1>
      
      <div className="bg-[#0E1B2B] rounded-2xl border border-[#91A4B7]/20 shadow-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-[#00AEEF]">Carregando suas indicações...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#00AEEF]/10 border-b border-[#91A4B7]/20">
                  <th className="p-4 font-semibold text-[#00E5FF]">ID</th>
                  <th className="p-4 font-semibold text-[#00E5FF]">Nome</th>
                  <th className="p-4 font-semibold text-[#00E5FF]">Data Cadastro</th>
                  <th className="p-4 font-semibold text-[#00E5FF]">Matriz</th>
                  <th className="p-4 font-semibold text-[#00E5FF]">Nível</th>
                  <th className="p-4 font-semibold text-[#00E5FF]">Posição</th>
                  <th className="p-4 font-semibold text-[#00E5FF]">Status</th>
                </tr>
              </thead>
              <tbody>
                {referrals.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-[#91A4B7]">Você ainda não fez nenhuma indicação direta.</td>
                  </tr>
                )}
                {referrals.map((ref, idx) => (
                  <tr key={idx} className="border-b border-[#91A4B7]/10 hover:bg-[#07111F]/50 transition-colors">
                    <td className="p-4 font-mono text-sm text-[#91A4B7]">{ref.id}</td>
                    <td className="p-4 font-medium">{ref.name}</td>
                    <td className="p-4 text-[#91A4B7]">{ref.created_at}</td>
                    <td className="p-4 text-[#00AEEF]">{ref.matrix}</td>
                    <td className="p-4">{ref.level}</td>
                    <td className="p-4">{ref.position}</td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${ref.status === 'ACTIVE' ? 'bg-[#00E89D]/20 text-[#00E89D]' : 'bg-yellow-500/20 text-yellow-500'}`}>
                        {ref.status === 'ACTIVE' ? 'Ativo' : 'Pendente'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
