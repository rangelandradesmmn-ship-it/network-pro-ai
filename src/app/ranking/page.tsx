"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase';

export default function RankingView() {
  const [loading, setLoading] = useState(true);
  const [ranking, setRanking] = useState<any[]>([]);

  useEffect(() => {
    async function loadRanking() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        let myTenantId = null;
        let isSuper = false;

        if (user) {
          const { data: profile } = await supabase.from('profiles').select('tenant_id, role').eq('id', user.id).single();
          if (profile) {
            myTenantId = profile.tenant_id;
            isSuper = profile.role === 'SUPER_ADMIN';
          }
        }

        let query = supabase.from('global_ranking').select('*').limit(50);
        
        // Se não for SUPER_ADMIN, filtra pela rede
        if (!isSuper && myTenantId) {
          query = query.eq('tenant_id', myTenantId);
        }

        const { data } = await query;

        if (data) {
          setRanking(data);
        }
      } catch (error) {
        console.error("Erro ao carregar ranking", error);
      } finally {
        setLoading(false);
      }
    }
    loadRanking();
  }, []);

  return (
    <div className="min-h-screen bg-[var(--bg-color)] text-[#F4F7FA] p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-[var(--primary-color)]">Ranking Global</h1>
        <select className="bg-[var(--panel-color)] border border-[#91A4B7]/30 text-white rounded p-2 text-sm">
          <option>Mês Atual</option>
          <option>Todos os Tempos</option>
        </select>
      </div>
      
      <div className="bg-[var(--panel-color)] rounded-2xl border border-[#91A4B7]/20 shadow-lg p-6">
        {loading ? (
          <div className="text-center text-[var(--primary-color)] py-8">Carregando melhores líderes...</div>
        ) : ranking.length === 0 ? (
          <div className="text-center text-[#91A4B7] py-8">O ranking ainda não possui pontuações.</div>
        ) : (
          <div className="flex flex-col gap-4">
            {ranking.map((user, idx) => (
              <div 
                key={user.user_id} 
                className={`flex items-center justify-between p-4 rounded-xl border ${idx === 0 ? 'bg-[var(--primary-color)]/10 border-[var(--primary-color)]/30' : idx === 1 ? 'bg-[#00E89D]/10 border-[#00E89D]/30' : 'bg-[var(--bg-color)] border-[#91A4B7]/10'} hover:scale-[1.01] transition-transform`}
              >
                <div className="flex items-center gap-6">
                  <span className={`text-2xl font-black w-8 text-center ${idx === 0 ? 'text-yellow-400' : idx === 1 ? 'text-gray-300' : idx === 2 ? 'text-amber-600' : 'text-[#91A4B7]'}`}>
                    #{idx + 1}
                  </span>
                  
                  <div className="flex items-center gap-4">
                    <img 
                      src={user.avatar_url || `https://i.pravatar.cc/150?u=${idx}`} 
                      alt="avatar" 
                      className="w-12 h-12 rounded-full border-2 border-[var(--panel-color)] object-cover" 
                    />
                    <div>
                      <h3 className="font-bold text-lg">{user.name}</h3>
                      <p className="text-xs text-[#91A4B7]">
                        {user.completed_matrices} Matrizes Completas | {user.direct_referrals} Diretos
                      </p>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-2xl font-black text-[#00E89D]">{Number(user.total_miles).toLocaleString('pt-BR')}</p>
                  <p className="text-xs text-[#91A4B7]">Milhas Totais</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
