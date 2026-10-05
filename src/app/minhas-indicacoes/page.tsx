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

        // Fetch user's direct referrals from matrix_positions (more reliable)
        const { data: positions } = await supabase
          .from('matrix_positions')
          .select('user_id, matrix_id, level, position_index')
          .eq('sponsor_id', user.id);

        if (!positions || positions.length === 0) {
          setReferrals([]);
          return;
        }

        const userIds = positions.map(p => p.user_id);
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, name, created_at, status, referral_code')
          .in('id', userIds);

        const profileMap: Record<string, any> = {};
        if (profilesData) {
          profilesData.forEach(p => {
            profileMap[p.id] = p;
          });
        }

        const formatted = positions.map((pos: any) => {
          const ref = profileMap[pos.user_id];
          return {
            id: ref?.referral_code || pos.user_id.substring(0, 8),
            name: ref?.name || 'Usuário',
            created_at: ref ? new Date(ref.created_at).toLocaleDateString('pt-BR') : 'N/A',
            matrix: `#001`, // Simplified for MVP
            level: pos.level,
            position: pos.position_index,
            status: ref?.status || 'ACTIVE'
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
    <div className="min-h-screen bg-[var(--bg-color)] text-[#F4F7FA] p-8">
      <h1 className="text-2xl font-bold mb-6 text-[var(--primary-color)]">Minhas Indicações</h1>
      
      <div className="bg-[var(--panel-color)] rounded-2xl border border-[#91A4B7]/20 shadow-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-[var(--primary-color)]">Carregando suas indicações...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[var(--primary-color)]/10 border-b border-[#91A4B7]/20">
                  <th className="p-4 font-semibold text-[var(--secondary-color)]">ID</th>
                  <th className="p-4 font-semibold text-[var(--secondary-color)]">Nome</th>
                  <th className="p-4 font-semibold text-[var(--secondary-color)]">Data Cadastro</th>
                  <th className="p-4 font-semibold text-[var(--secondary-color)]">Matriz</th>
                  <th className="p-4 font-semibold text-[var(--secondary-color)]">Nível</th>
                  <th className="p-4 font-semibold text-[var(--secondary-color)]">Posição</th>
                  <th className="p-4 font-semibold text-[var(--secondary-color)]">Status</th>
                </tr>
              </thead>
              <tbody>
                {referrals.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-[#91A4B7]">Você ainda não fez nenhuma indicação direta.</td>
                  </tr>
                )}
                {referrals.map((ref, idx) => (
                  <tr key={idx} className="border-b border-[#91A4B7]/10 hover:bg-[var(--bg-color)]/50 transition-colors">
                    <td className="p-4 font-mono text-sm text-[#91A4B7]">{ref.id}</td>
                    <td className="p-4 font-medium">{ref.name}</td>
                    <td className="p-4 text-[#91A4B7]">{ref.created_at}</td>
                    <td className="p-4 text-[var(--primary-color)]">{ref.matrix}</td>
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
