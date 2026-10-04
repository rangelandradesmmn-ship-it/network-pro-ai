"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase';

export default function MinhasMilhas() {
  const [loading, setLoading] = useState(true);
  const [ledger, setLedger] = useState<any[]>([]);
  const [totals, setTotals] = useState({
    saldo: 0,
    nivel1: 0,
    nivel2: 0,
    nivel3: 0
  });

  useEffect(() => {
    async function loadLedger() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
          .from('financial_ledger')
          .select(`
            id,
            created_at,
            amount_miles,
            description,
            level_earned,
            profiles!financial_ledger_from_user_id_fkey (name),
            matrices (matrix_number)
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (data) {
          let saldo = 0;
          let n1 = 0;
          let n2 = 0;
          let n3 = 0;

          const formatted = data.map((item: any) => {
            saldo += item.amount_miles;
            if (item.level_earned === 1) n1 += item.amount_miles;
            if (item.level_earned === 2) n2 += item.amount_miles;
            if (item.level_earned === 3) n3 += item.amount_miles;

            return {
              id: item.id.substring(0, 8),
              date: new Date(item.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }),
              desc: item.description,
              origin: item.profiles?.name || 'Sistema',
              matrix: `#${String(item.matrices?.matrix_number || 1).padStart(3, '0')}`,
              level: item.level_earned,
              value: item.amount_miles
            };
          });

          setTotals({ saldo, nivel1: n1, nivel2: n2, nivel3: n3 });
          setLedger(formatted);
        }
      } catch (error) {
        console.error("Erro ao carregar extrato:", error);
      } finally {
        setLoading(false);
      }
    }
    loadLedger();
  }, []);

  return (
    <div className="min-h-screen bg-[#07111F] text-[#F4F7FA] p-8">
      <h1 className="text-2xl font-bold mb-6 text-[#00AEEF]">Minhas Milhas</h1>
      
      {/* Cards Superiores */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-[#0E1B2B] p-6 rounded-xl border border-[#91A4B7]/20">
          <p className="text-[#91A4B7] text-sm">Saldo Atual</p>
          <p className="text-3xl font-bold text-[#00E89D]">{totals.saldo.toLocaleString('pt-BR')}</p>
        </div>
        <div className="bg-[#0E1B2B] p-6 rounded-xl border border-[#91A4B7]/20">
          <p className="text-[#91A4B7] text-sm">Nível 1 (20/pos)</p>
          <p className="text-2xl font-bold">{totals.nivel1} <span className="text-sm font-normal text-gray-500">/ 100</span></p>
        </div>
        <div className="bg-[#0E1B2B] p-6 rounded-xl border border-[#91A4B7]/20">
          <p className="text-[#91A4B7] text-sm">Nível 2 (10/pos)</p>
          <p className="text-2xl font-bold">{totals.nivel2} <span className="text-sm font-normal text-gray-500">/ 250</span></p>
        </div>
        <div className="bg-[#0E1B2B] p-6 rounded-xl border border-[#91A4B7]/20">
          <p className="text-[#91A4B7] text-sm">Nível 3 (20/pos)</p>
          <p className="text-2xl font-bold">{totals.nivel3} <span className="text-sm font-normal text-gray-500">/ 2500</span></p>
        </div>
      </div>

      {/* Extrato */}
      <div className="bg-[#0E1B2B] rounded-2xl border border-[#91A4B7]/20 shadow-lg overflow-hidden">
        <div className="p-4 border-b border-[#91A4B7]/20 flex justify-between items-center bg-[#07111F]/50">
          <h2 className="font-semibold text-lg">Extrato (Ledger)</h2>
          <select className="bg-[#07111F] border border-[#91A4B7]/30 text-white rounded p-2 text-sm">
            <option>Últimos 30 dias</option>
            <option>Este Mês</option>
            <option>Mês Passado</option>
          </select>
        </div>
        
        {loading ? (
          <div className="p-8 text-center text-[#00AEEF]">Carregando extrato...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-[#00AEEF]/5 border-b border-[#91A4B7]/20">
                  <th className="p-4 text-[#00E5FF]">Data/Hora</th>
                  <th className="p-4 text-[#00E5FF]">ID Transação</th>
                  <th className="p-4 text-[#00E5FF]">Descrição</th>
                  <th className="p-4 text-[#00E5FF]">Origem</th>
                  <th className="p-4 text-[#00E5FF]">Matriz</th>
                  <th className="p-4 text-[#00E5FF]">Nível</th>
                  <th className="p-4 text-right text-[#00E5FF]">Valor</th>
                </tr>
              </thead>
              <tbody>
                {ledger.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-[#91A4B7]">Nenhuma movimentação de milhas encontrada.</td>
                  </tr>
                )}
                {ledger.map((trx, idx) => (
                  <tr key={idx} className="border-b border-[#91A4B7]/10 hover:bg-[#07111F]/50">
                    <td className="p-4 text-[#91A4B7]">{trx.date}</td>
                    <td className="p-4 font-mono text-[#91A4B7] text-xs">TRX-{trx.id}</td>
                    <td className="p-4">{trx.desc}</td>
                    <td className="p-4">{trx.origin}</td>
                    <td className="p-4 text-[#00AEEF]">{trx.matrix}</td>
                    <td className="p-4">{trx.level}</td>
                    <td className="p-4 text-right font-bold text-[#00E89D]">+{trx.value}</td>
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
