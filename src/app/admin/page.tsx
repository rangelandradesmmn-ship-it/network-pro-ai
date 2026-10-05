"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase';

export default function PainelAdmin() {
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  // Global / Local Stats
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeMatrices: 0,
    completedMatrices: 0,
    totalMiles: 0,
    usersToday: 0,
    totalAdmins: 0 // Super Admin only
  });

  // Admin Tables
  const [audit, setAudit] = useState<any[]>([]);
  const [pending, setPending] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  
  // Super Admin Tables
  const [tenantsList, setTenantsList] = useState<any[]>([]);

  // Promoção
  const handlePromoteToAdmin = async (userId: string) => {
    if (!confirm('Promover este usuário a ADMIN (Dono de Rede)? Ele terá o próprio painel e os indicados dele farão parte da rede dele.')) return;
    try {
      await supabase.from('profiles').update({ role: 'ADMIN', tenant_id: userId }).eq('id', userId);
      alert('Usuário promovido com sucesso!');
      window.location.reload();
    } catch(e) { console.error(e); }
  };

  const handleApprove = async (fromUserId: string) => {
    try {
      const { error } = await supabase.from('financial_ledger').update({ status: 'APPROVED' }).eq('from_user_id', fromUserId);
      if (!error) {
        setPending(prev => prev.filter(p => p.from_user_id !== fromUserId));
        alert('Pagamento aprovado e comissões distribuídas na rede!');
      }
    } catch (e) { console.error(e); }
  };

  const handleApproveWithdraw = async (id: string) => {
    try {
      await supabase.from('withdrawals').update({ status: 'APPROVED' }).eq('id', id);
      setWithdrawals(prev => prev.filter(w => w.id !== id));
      alert('Saque aprovado com sucesso!');
    } catch (e) { console.error(e); }
  };

  const handleRejectWithdraw = async (id: string, userId: string, amount: number) => {
    try {
      await supabase.from('withdrawals').update({ status: 'REJECTED' }).eq('id', id);
      await supabase.from('financial_ledger').insert({
        user_id: userId, from_user_id: userId, amount_miles: amount,
        description: 'Estorno: Saque Recusado', status: 'APPROVED', level_earned: 0, tenant_id: tenantId
      });
      setWithdrawals(prev => prev.filter(w => w.id !== id));
      alert('Saque recusado e milhas estornadas para o usuário!');
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    async function loadAdminData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase.from('profiles').select('role, tenant_id').eq('id', user.id).single();
        if (profile?.role !== 'ADMIN' && profile?.role !== 'SUPER_ADMIN') {
          setHasAccess(false); setLoading(false); return;
        }
        setHasAccess(true);
        setRole(profile.role);
        setTenantId(profile.tenant_id);

        const isSuper = profile.role === 'SUPER_ADMIN';

        // Base Query Modifiers
        const tFilter = (query: any) => isSuper ? query : query.eq('tenant_id', profile.tenant_id);

        // Fetch Total Users
        const { count: totalUsers } = await tFilter(supabase.from('profiles').select('*', { count: 'exact', head: true }));
        
        // Fetch Users Today
        const today = new Date(); today.setHours(0,0,0,0);
        const { count: usersToday } = await tFilter(supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', today.toISOString()));

        // Fetch Matrices
        const { count: activeMatrices } = await tFilter(supabase.from('matrices').select('*', { count: 'exact', head: true }).eq('status', 'ACTIVE'));
        const { count: completedMatrices } = await tFilter(supabase.from('matrices').select('*', { count: 'exact', head: true }).eq('status', 'COMPLETED'));

        // Fetch Miles
        const { data: milesData } = await tFilter(supabase.from('financial_ledger').select('amount_miles'));
        const totalMiles = milesData ? milesData.reduce((acc, curr) => acc + curr.amount_miles, 0) : 0;

        let totalAdmins = 0;
        if (isSuper) {
          const { count: admCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'ADMIN');
          totalAdmins = admCount || 0;
          
          const { data: tenants } = await supabase.from('profiles').select('id, name, email, created_at').eq('role', 'ADMIN').order('created_at', { ascending: false });
          setTenantsList(tenants || []);
        }

        setStats({ totalUsers: totalUsers||0, usersToday: usersToday||0, activeMatrices: activeMatrices||0, completedMatrices: completedMatrices||0, totalMiles, totalAdmins });

        // Load Tables for Admin & Super Admin
        const { data: ledgerData } = await tFilter(supabase.from('financial_ledger').select(`id, created_at, description, amount_miles, profiles!financial_ledger_user_id_fkey (name, referral_code)`).order('created_at', { ascending: false }).limit(10));
        if (ledgerData) {
          setAudit(ledgerData.map(item => ({
            date: new Date(item.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }),
            action: item.description, admin: 'Sistema', target: (item.profiles as any)?.referral_code || '---', details: `+${item.amount_miles} Milhas processadas`
          })));
        }

        // Fetch pending payments
        const { data: pendingData } = await tFilter(supabase.from('financial_ledger').select('created_at, from_user_id, profiles!financial_ledger_from_user_id_fkey(name)').eq('status', 'PENDING'));
        if (pendingData) {
          const uniquePending = Array.from(new Set(pendingData.map(p => p.from_user_id))).map(uid => {
            const row = pendingData.find(p => p.from_user_id === uid);
            return { from_user_id: uid, date: new Date(row!.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }), payerName: (row?.profiles as any)?.name || 'Usuário' };
          });
          setPending(uniquePending);
        }

        // Fetch withdrawals
        const { data: wData } = await tFilter(supabase.from('withdrawals').select('id, amount_miles, created_at, user_id, profiles!withdrawals_user_id_fkey(name)').eq('status', 'PENDING').order('created_at', { ascending: false }));
        if (wData) {
          setWithdrawals(wData.map(w => ({
            id: w.id, user_id: w.user_id, amount_miles: w.amount_miles,
            date: new Date(w.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }), userName: (w.profiles as any)?.name || 'Usuário'
          })));
        }

      } catch (error) { console.error("Erro ao carregar admin", error); } finally { setLoading(false); }
    }
    loadAdminData();
  }, []);

  if (loading) return <div className="min-h-screen bg-[#07111F] text-[#00AEEF] flex justify-center items-center">Carregando painel...</div>;
  if (!hasAccess) return (
    <div className="min-h-screen bg-[#07111F] text-[#F4F7FA] p-8 flex justify-center items-center">
      <div className="bg-[#0E1B2B] p-8 rounded-2xl border border-red-500/20 text-center"><h2 className="text-2xl font-bold text-red-500">Acesso Negado</h2></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#07111F] text-[#F4F7FA] p-8">
      <h1 className="text-2xl font-bold mb-2 text-red-500">
        {role === 'SUPER_ADMIN' ? 'Painel Super Admin (Plataforma)' : 'Painel Admin (Sua Rede)'}
      </h1>
      <p className="text-[#91A4B7] mb-8">
        {role === 'SUPER_ADMIN' ? 'Visão global de todas as empresas e redes ativas no SaaS.' : 'Gerencie as ativações e saques dos seus usuários.'}
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {role === 'SUPER_ADMIN' && (
          <div className="bg-[#0E1B2B] p-6 rounded-2xl border border-purple-500/40 shadow-lg">
            <p className="text-sm text-purple-400 mb-2 font-bold">Empresas Clientes (Admins)</p>
            <p className="text-4xl font-bold text-white">{stats.totalAdmins}</p>
          </div>
        )}
        <div className="bg-[#0E1B2B] p-6 rounded-2xl border border-red-500/20 shadow-lg">
          <p className="text-sm text-[#91A4B7] mb-2 font-bold">{role === 'SUPER_ADMIN' ? 'Total Global de Usuários' : 'Membros da sua Rede'}</p>
          <p className="text-4xl font-bold text-white mb-1">{stats.totalUsers.toLocaleString('pt-BR')}</p>
          <p className="text-xs text-[#00E89D]">+{stats.usersToday} hoje</p>
        </div>
        <div className="bg-[#0E1B2B] p-6 rounded-2xl border border-[#91A4B7]/20 shadow-lg flex flex-col justify-center">
          <p className="text-sm text-[#91A4B7] mb-2 font-bold">Matrizes Ativas</p>
          <p className="text-3xl font-bold text-white">{stats.activeMatrices.toLocaleString('pt-BR')}</p>
        </div>
        <div className="bg-[#0E1B2B] p-6 rounded-2xl border border-[#91A4B7]/20 shadow-lg flex flex-col justify-center">
          <p className="text-sm text-[#91A4B7] mb-2 font-bold">Milhas Processadas</p>
          <p className="text-3xl font-bold text-[#00E89D]">{stats.totalMiles.toLocaleString('pt-BR')}</p>
        </div>
      </div>

      {role === 'SUPER_ADMIN' && (
        <div className="bg-[#0E1B2B] rounded-2xl border border-purple-500/20 shadow-lg overflow-hidden mb-8">
          <div className="p-6 border-b border-[#91A4B7]/20 flex justify-between items-center">
            <h2 className="text-lg font-bold text-purple-400">Suas Empresas Clientes (Admins)</h2>
            <button onClick={() => {
              const id = prompt('Cole o ID do Usuário que comprou a plataforma para promovê-lo a ADMIN:');
              if(id) handlePromoteToAdmin(id);
            }} className="text-sm bg-purple-600 text-white px-4 py-2 rounded font-bold hover:bg-purple-700 transition-colors">
              + Nova Empresa
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-purple-500/5 border-b border-[#91A4B7]/20 text-sm">
                  <th className="p-4 font-bold text-purple-400">Cliente (Empresa)</th>
                  <th className="p-4 font-bold text-purple-400">Email</th>
                  <th className="p-4 font-bold text-purple-400">Data de Entrada</th>
                </tr>
              </thead>
              <tbody>
                {tenantsList.length === 0 && (<tr><td colSpan={3} className="p-8 text-center text-[#91A4B7]">Nenhuma empresa cadastrada.</td></tr>)}
                {tenantsList.map((item, idx) => (
                  <tr key={idx} className="border-b border-[#91A4B7]/10 hover:bg-[#07111F]/50 text-sm">
                    <td className="p-4 font-bold text-white">{item.name}</td>
                    <td className="p-4 text-[#91A4B7]">{item.email}</td>
                    <td className="p-4 text-[#91A4B7]">{new Date(item.created_at).toLocaleDateString('pt-BR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Mesas de Aprovação (Visíveis para SUPER_ADMIN testando ou ADMIN real) */}
      <div className="bg-[#0E1B2B] rounded-2xl border border-[#00AEEF]/20 shadow-lg overflow-hidden mb-8">
        <div className="p-6 border-b border-[#91A4B7]/20 flex justify-between items-center">
          <h2 className="text-lg font-bold text-[#00AEEF]">Pedidos de Saque (Resgate de Milhas)</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#00AEEF]/5 border-b border-[#91A4B7]/20 text-sm">
                <th className="p-4 font-bold text-[#00AEEF]">Data</th>
                <th className="p-4 font-bold text-[#00AEEF]">Usuário</th>
                <th className="p-4 font-bold text-[#00AEEF] text-right">Valor Solicitado</th>
                <th className="p-4 font-bold text-[#00AEEF] text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {withdrawals.length === 0 && (<tr><td colSpan={4} className="p-8 text-center text-[#91A4B7]">Nenhum saque pendente.</td></tr>)}
              {withdrawals.map((item, idx) => (
                <tr key={idx} className="border-b border-[#91A4B7]/10 hover:bg-[#07111F]/50 text-sm">
                  <td className="p-4 text-[#91A4B7]">{item.date}</td>
                  <td className="p-4 font-bold text-white">{item.userName}</td>
                  <td className="p-4 font-black text-[#00AEEF] text-right">{item.amount_miles} Milhas</td>
                  <td className="p-4 flex justify-center gap-2">
                    <button onClick={() => handleApproveWithdraw(item.id)} className="bg-[#00E89D] text-[#07111F] px-4 py-1 rounded font-bold hover:bg-[#00C585] transition-colors">Aprovar</button>
                    <button onClick={() => handleRejectWithdraw(item.id, item.user_id, item.amount_miles)} className="bg-red-500 text-white px-4 py-1 rounded font-bold hover:bg-red-600 transition-colors">Recusar (Estorno)</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-[#0E1B2B] rounded-2xl border border-yellow-500/20 shadow-lg overflow-hidden mb-8">
        <div className="p-6 border-b border-[#91A4B7]/20 flex justify-between items-center">
          <h2 className="text-lg font-bold text-yellow-500">Pagamentos Pendentes (Ativações)</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-yellow-500/5 border-b border-[#91A4B7]/20 text-sm">
                <th className="p-4 font-bold text-yellow-500">Data</th>
                <th className="p-4 font-bold text-yellow-500">Usuário Pagador</th>
                <th className="p-4 font-bold text-yellow-500">Ação</th>
              </tr>
            </thead>
            <tbody>
              {pending.length === 0 && (<tr><td colSpan={3} className="p-8 text-center text-[#91A4B7]">Nenhuma ativação pendente.</td></tr>)}
              {pending.map((item, idx) => (
                <tr key={idx} className="border-b border-[#91A4B7]/10 hover:bg-[#07111F]/50 text-sm">
                  <td className="p-4 text-[#91A4B7]">{item.date}</td>
                  <td className="p-4 font-bold text-white">{item.payerName}</td>
                  <td className="p-4">
                    <button onClick={() => handleApprove(item.from_user_id)} className="bg-green-500 text-white px-4 py-1 rounded font-bold hover:bg-green-600 transition-colors">Aprovar Matriz</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
