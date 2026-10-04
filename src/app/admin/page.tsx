"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase';

export default function PainelAdmin() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeMatrices: 0,
    completedMatrices: 0,
    totalMiles: 0,
    usersToday: 0
  });
  const [audit, setAudit] = useState<any[]>([]);

  useEffect(() => {
    async function loadAdminData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch Total Users
        const { count: totalUsers } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
        
        // Fetch Users Today
        const today = new Date();
        today.setHours(0,0,0,0);
        const { count: usersToday } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', today.toISOString());

        // Fetch Matrices
        const { count: activeMatrices } = await supabase.from('matrices').select('*', { count: 'exact', head: true }).eq('status', 'ACTIVE');
        const { count: completedMatrices } = await supabase.from('matrices').select('*', { count: 'exact', head: true }).eq('status', 'COMPLETED');

        // Fetch Miles
        const { data: milesData } = await supabase.from('financial_ledger').select('amount_miles');
        const totalMiles = milesData ? milesData.reduce((acc, curr) => acc + curr.amount_miles, 0) : 0;

        setStats({
          totalUsers: totalUsers || 0,
          usersToday: usersToday || 0,
          activeMatrices: activeMatrices || 0,
          completedMatrices: completedMatrices || 0,
          totalMiles
        });

        // Fetch recent activity for Audit (Last 10 ledger entries as proxy for system activity)
        const { data: ledgerData } = await supabase
          .from('financial_ledger')
          .select(`
            id, created_at, description, amount_miles,
            profiles!financial_ledger_user_id_fkey (name, referral_code)
          `)
          .order('created_at', { ascending: false })
          .limit(10);

        if (ledgerData) {
          const formattedAudit = ledgerData.map(item => ({
            date: new Date(item.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }),
            action: item.description,
            admin: 'Sistema',
            target: item.profiles?.referral_code || '---',
            details: `+${item.amount_miles} Milhas processadas`
          }));
          setAudit(formattedAudit);
        }

      } catch (error) {
        console.error("Erro ao carregar admin", error);
      } finally {
        setLoading(false);
      }
    }
    loadAdminData();
  }, []);

  return (
    <div className="min-h-screen bg-[#07111F] text-[#F4F7FA] p-8">
      <h1 className="text-2xl font-bold mb-2 text-red-500">Painel Super Admin</h1>
      <p className="text-[#91A4B7] mb-8">Visão global da plataforma Network Pro AI</p>
      
      {loading ? (
        <div className="text-red-500 py-8 text-center">Carregando métricas da plataforma...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-[#0E1B2B] p-6 rounded-2xl border border-red-500/20 shadow-lg">
              <p className="text-sm text-[#91A4B7] mb-2 font-bold">Total de Usuários</p>
              <p className="text-4xl font-bold text-white mb-1">{stats.totalUsers.toLocaleString('pt-BR')}</p>
              <p className="text-xs text-[#00E89D]">+{stats.usersToday} hoje</p>
            </div>
            
            <div className="bg-[#0E1B2B] p-6 rounded-2xl border border-[#91A4B7]/20 shadow-lg flex flex-col justify-center">
              <p className="text-sm text-[#91A4B7] mb-2 font-bold">Matrizes Ativas</p>
              <p className="text-3xl font-bold text-white">{stats.activeMatrices.toLocaleString('pt-BR')}</p>
            </div>

            <div className="bg-[#0E1B2B] p-6 rounded-2xl border border-[#91A4B7]/20 shadow-lg flex flex-col justify-center">
              <p className="text-sm text-[#91A4B7] mb-2 font-bold">Matrizes Completas</p>
              <p className="text-3xl font-bold text-[#00AEEF]">{stats.completedMatrices.toLocaleString('pt-BR')}</p>
            </div>

            <div className="bg-[#0E1B2B] p-6 rounded-2xl border border-[#91A4B7]/20 shadow-lg flex flex-col justify-center">
              <p className="text-sm text-[#91A4B7] mb-2 font-bold">Milhas Distribuídas</p>
              <p className="text-3xl font-bold text-[#00E89D]">{stats.totalMiles.toLocaleString('pt-BR')}</p>
            </div>
          </div>

          <div className="bg-[#0E1B2B] rounded-2xl border border-red-500/20 shadow-lg overflow-hidden">
            <div className="p-6 border-b border-[#91A4B7]/20">
              <h2 className="text-lg font-bold text-red-400">Atividade Recente do Sistema</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-red-500/5 border-b border-[#91A4B7]/20 text-sm">
                    <th className="p-4 font-bold text-red-400">Timestamp</th>
                    <th className="p-4 font-bold text-red-400">Ação / Gatilho</th>
                    <th className="p-4 font-bold text-red-400">Agente</th>
                    <th className="p-4 font-bold text-red-400">Target</th>
                    <th className="p-4 font-bold text-red-400">Detalhes</th>
                  </tr>
                </thead>
                <tbody>
                  {audit.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-[#91A4B7]">Nenhuma atividade registrada na rede ainda.</td>
                    </tr>
                  )}
                  {audit.map((item, idx) => (
                    <tr key={idx} className="border-b border-[#91A4B7]/10 hover:bg-[#07111F]/50 text-sm">
                      <td className="p-4 text-[#91A4B7]">{item.date}</td>
                      <td className="p-4 font-bold text-white">{item.action}</td>
                      <td className="p-4 text-[#91A4B7]">{item.admin}</td>
                      <td className="p-4 text-[#00AEEF]">{item.target}</td>
                      <td className="p-4 text-[#91A4B7]">{item.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
