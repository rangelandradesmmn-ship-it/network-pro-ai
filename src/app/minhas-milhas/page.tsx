"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase';

export default function ExtratoMilhas() {
  const [loading, setLoading] = useState(true);
  const [extrato, setExtrato] = useState<any[]>([]);
  const [totalAprovado, setTotalAprovado] = useState(0);
  const [totalPendente, setTotalPendente] = useState(0);

  useEffect(() => {
    async function loadMilhas() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
          .from('financial_ledger')
          .select(`
            id, created_at, description, amount_miles, level_earned, status,
            profiles!financial_ledger_from_user_id_fkey (name, referral_code)
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (data) {
          const formatado = data.map(item => ({
            id: item.id,
            date: new Date(item.created_at).toLocaleDateString('pt-BR'),
            origem: (item.profiles as any)?.name || 'Sistema',
            tipo: item.description,
            pontos: item.amount_miles,
            nivel: item.level_earned,
            status: item.status || 'APPROVED'
          }));
          setExtrato(formatado);

          const aprovado = data.filter(i => !i.status || i.status === 'APPROVED').reduce((acc, cur) => acc + cur.amount_miles, 0);
          const pendente = data.filter(i => i.status === 'PENDING').reduce((acc, cur) => acc + cur.amount_miles, 0);
          
          setTotalAprovado(aprovado);
          setTotalPendente(pendente);
        }
      } catch (error) {
        console.error("Erro ao carregar milhas", error);
      } finally {
        setLoading(false);
      }
    }
    loadMilhas();
  }, []);

  return (
    <div className="min-h-screen bg-[#07111F] text-[#F4F7FA] p-8">
      <h1 className="text-2xl font-bold mb-8 text-[#00AEEF]">Minhas Milhas</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="bg-[#0E1B2B] p-6 rounded-2xl border border-[#00E89D]/30 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#00E89D]/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
          <p className="text-[#91A4B7] mb-2 font-medium">Milhas Aprovadas (Disponíveis)</p>
          <p className="text-5xl font-black text-[#00E89D]">{totalAprovado}</p>
        </div>
        <div className="bg-[#0E1B2B] p-6 rounded-2xl border border-yellow-500/30 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
          <p className="text-[#91A4B7] mb-2 font-medium">Milhas Pendentes (Aguardando Pgto)</p>
          <p className="text-5xl font-black text-yellow-500">{totalPendente}</p>
        </div>
      </div>

      <div className="bg-[#0E1B2B] rounded-2xl border border-[#91A4B7]/20 shadow-lg overflow-hidden">
        <div className="p-6 border-b border-[#91A4B7]/20 flex justify-between items-center">
          <h2 className="text-lg font-bold">Extrato Detalhado</h2>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-[#00AEEF]">Carregando extrato...</div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#07111F]/50 border-b border-[#91A4B7]/20 text-sm">
                  <th className="p-4 font-bold text-[#91A4B7]">Data</th>
                  <th className="p-4 font-bold text-[#91A4B7]">Origem</th>
                  <th className="p-4 font-bold text-[#91A4B7]">Tipo</th>
                  <th className="p-4 font-bold text-[#91A4B7]">Nível</th>
                  <th className="p-4 font-bold text-[#91A4B7]">Status</th>
                  <th className="p-4 font-bold text-[#91A4B7] text-right">Pontos</th>
                </tr>
              </thead>
              <tbody>
                {extrato.length === 0 ? (
                  <tr><td colSpan={6} className="p-8 text-center text-[#91A4B7]">Nenhuma milha recebida ainda.</td></tr>
                ) : extrato.map((item) => (
                  <tr key={item.id} className="border-b border-[#91A4B7]/10 hover:bg-[#07111F]/50 transition-colors">
                    <td className="p-4 text-sm text-[#91A4B7]">{item.date}</td>
                    <td className="p-4 font-medium">{item.origem}</td>
                    <td className="p-4 text-sm">{item.tipo}</td>
                    <td className="p-4 text-sm text-[#91A4B7]">{item.nivel}</td>
                    <td className="p-4 text-sm font-bold">
                      {item.status === 'APPROVED' ? (
                        <span className="text-[#00E89D] bg-[#00E89D]/10 px-2 py-1 rounded">Aprovado</span>
                      ) : (
                        <span className="text-yellow-500 bg-yellow-500/10 px-2 py-1 rounded">Pendente</span>
                      )}
                    </td>
                    <td className={`p-4 font-bold text-right ${item.status === 'APPROVED' ? 'text-[#00E89D]' : 'text-yellow-500'}`}>
                      +{item.pontos}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
