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
  const [saasFee, setSaasFee] = useState(500);

  const handlePromoteToAdmin = async (refCode: string) => {
    if (!confirm(`Promover o dono do código ${refCode} a ADMIN (Empresa)?\n\nEle será removido da sua Matriz de rede. As milhas da ativação dele serão canceladas e você receberá o valor integral de Licença SaaS (${saasFee} Milhas).`)) return;
    try {
      // 1. Pegar usuário e Super Admin logado
      const { data: { user } } = await supabase.auth.getUser();
      const { data: userToPromote } = await supabase.from('profiles').select('id').eq('referral_code', refCode.trim()).single();
      
      if (!userToPromote || !user) {
        alert('Código de indicação não encontrado ou erro de sessão!');
        return;
      }
      
      const targetId = userToPromote.id;

      // 2. Atualizar para ADMIN e separar a rede (tenant próprio)
      await supabase.from('profiles').update({ role: 'ADMIN', tenant_id: targetId }).eq('id', targetId);
      
      // 3. Remover ele da matrix_positions (abre buraco que será preenchido pelo próximo)
      await supabase.from('matrix_positions').delete().eq('user_id', targetId);
      
      // 4. Apagar todos os pagamentos pendentes que ele gerou na rede
      await supabase.from('financial_ledger').delete().eq('from_user_id', targetId).eq('status', 'PENDING');
      
      // 5. Creditar o valor integral do SaaS para o SUPER ADMIN
      await supabase.from('financial_ledger').insert({
        user_id: user.id, // Super Admin recebe
        from_user_id: targetId, // Quem pagou o SaaS
        amount_miles: saasFee,
        description: 'Venda de Licença SaaS (Nova Empresa)',
        status: 'APPROVED', // Já entra aprovado e libera o cliente
        level_earned: 0,
        tenant_id: user.id // Pertence ao financeiro do Super Admin
      });

      alert('Usuário promovido com sucesso! A licença SaaS foi creditada a você e ele já está liberado para usar.');
      window.location.reload();
    } catch(e) { console.error(e); }
  };

  const handleSaveSaasFee = async () => {
    try {
      await supabase.from('system_settings').upsert({ id: 1, saas_fee: saasFee });
      alert('Valor da licença SaaS atualizado com sucesso!');
    } catch(e) { console.error(e); }
  };

  const handleApprove = async (fromUserId: string) => {
    try {
      const { error } = await supabase.from('financial_ledger').update({ status: 'APPROVED' }).eq('from_user_id', fromUserId).eq('status', 'PENDING');
      if (!error) {
        // Atualiza os dias de atividade do usuário (30 dias)
        await supabase.rpc('renew_user_subscription', { p_user_id: fromUserId, p_days: 30 });
        
        setPending(prev => prev.filter(p => p.from_user_id !== fromUserId));
        alert('Pagamento aprovado, comissões distribuídas e mensalidade renovada!');
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
        const totalMiles = milesData ? milesData.reduce((acc: number, curr: any) => acc + curr.amount_miles, 0) : 0;

        let totalAdmins = 0;
        if (isSuper) {
          const { count: admCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'ADMIN');
          totalAdmins = admCount || 0;
          
          const { data: tenants } = await supabase.from('profiles').select('id, name, email, created_at').eq('role', 'ADMIN').order('created_at', { ascending: false });
          setTenantsList(tenants || []);
          
          const { data: settings } = await supabase.from('system_settings').select('saas_fee').eq('id', 1).single();
          if (settings) setSaasFee(settings.saas_fee);
        }

        setStats({ totalUsers: totalUsers||0, usersToday: usersToday||0, activeMatrices: activeMatrices||0, completedMatrices: completedMatrices||0, totalMiles, totalAdmins });

        // Load Tables for Admin & Super Admin
        const { data: ledgerData } = await tFilter(supabase.from('financial_ledger').select(`id, created_at, description, amount_miles, profiles!financial_ledger_user_id_fkey (name, referral_code)`).order('created_at', { ascending: false }).limit(50));
        if (ledgerData) {
          setAudit(ledgerData.map((item: any) => {
            const isNegative = item.amount_miles < 0;
            const sign = isNegative ? '' : '+';
            return {
              date: new Date(item.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }),
              action: item.description, 
              target: (item.profiles as any)?.name || 'Usuário', 
              details: `${sign}${item.amount_miles} Milhas`
            };
          }));
        }

        // Fetch pending payments
        const { data: pendingData } = await tFilter(supabase.from('financial_ledger').select('created_at, from_user_id, profiles!financial_ledger_from_user_id_fkey(name)').eq('status', 'PENDING'));
        if (pendingData) {
          const uniquePending = Array.from(new Set(pendingData.map((p: any) => p.from_user_id))).map(uid => {
            const row = pendingData.find((p: any) => p.from_user_id === uid);
            return { from_user_id: uid, date: new Date(row!.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }), payerName: (row?.profiles as any)?.name || 'Usuário' };
          });
          setPending(uniquePending);
        }

        // Fetch withdrawals
        const { data: wData } = await tFilter(supabase.from('withdrawals').select('id, amount_miles, created_at, user_id, pix_key, profiles!withdrawals_user_id_fkey(name)').eq('status', 'PENDING').order('created_at', { ascending: false }));
        if (wData) {
          setWithdrawals(wData.map((w: any) => ({
            id: w.id, user_id: w.user_id, amount_miles: w.amount_miles, pix_key: w.pix_key,
            date: new Date(w.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }), userName: (w.profiles as any)?.name || 'Usuário'
          })));
        }

      } catch (error) { console.error("Erro ao carregar admin", error); } finally { setLoading(false); }
    }
    loadAdminData();
  }, []);

  if (loading) return <div className="min-h-screen bg-[#07111F] text-[var(--primary-color)] flex justify-center items-center">Carregando painel...</div>;
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
          <div className="p-6 border-b border-[#91A4B7]/20 flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
              <h2 className="text-lg font-bold text-purple-400">Suas Empresas Clientes (Admins)</h2>
              <p className="text-sm text-[#91A4B7]">Preço atual da Licença SaaS: <strong className="text-white">{saasFee} Milhas</strong></p>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center bg-[#07111F] rounded border border-[#91A4B7]/30">
                <input 
                  type="number" 
                  value={saasFee} 
                  onChange={e => setSaasFee(Number(e.target.value))}
                  className="bg-transparent text-white p-2 w-24 outline-none text-sm"
                />
                <button onClick={handleSaveSaasFee} className="px-3 text-xs text-purple-400 hover:text-white font-bold">Salvar Preço</button>
              </div>
              
              <button onClick={() => {
                const code = prompt('Qual é o Código de Indicação (Ex: NP123456) do usuário que comprou a plataforma?');
                if(code) handlePromoteToAdmin(code);
              }} className="text-sm bg-purple-600 text-white px-4 py-2 rounded font-bold hover:bg-purple-700 transition-colors">
                + Promover a Empresa
              </button>
            </div>
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
      <div className="bg-[#0E1B2B] rounded-2xl border border-[var(--primary-color)]/20 shadow-lg overflow-hidden mb-8">
        <div className="p-6 border-b border-[#91A4B7]/20 flex justify-between items-center">
          <h2 className="text-lg font-bold text-[var(--primary-color)]">Pedidos de Saque (Resgate de Milhas)</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[var(--primary-color)]/5 border-b border-[#91A4B7]/20 text-sm">
                <th className="p-4 font-bold text-[var(--primary-color)]">Data</th>
                <th className="p-4 font-bold text-[var(--primary-color)]">Usuário</th>
                <th className="p-4 font-bold text-[var(--primary-color)]">Chave PIX</th>
                <th className="p-4 font-bold text-[var(--primary-color)] text-right">Valor</th>
                <th className="p-4 font-bold text-[var(--primary-color)] text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {withdrawals.length === 0 && (<tr><td colSpan={5} className="p-8 text-center text-[#91A4B7]">Nenhum saque pendente.</td></tr>)}
              {withdrawals.map((item, idx) => (
                <tr key={idx} className="border-b border-[#91A4B7]/10 hover:bg-[#07111F]/50 text-sm">
                  <td className="p-4 text-[#91A4B7]">{item.date}</td>
                  <td className="p-4 font-bold text-white">{item.userName}</td>
                  <td className="p-4 text-yellow-500 font-mono">{item.pix_key || 'Não informada'}</td>
                  <td className="p-4 font-black text-[var(--primary-color)] text-right">{item.amount_miles}</td>
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

      {/* Extrato Global Financeiro */}
      <div className="bg-[#0E1B2B] rounded-2xl border border-gray-500/20 shadow-lg overflow-hidden mb-8">
        <div className="p-6 border-b border-[#91A4B7]/20 flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-300">Extrato Global de Transações</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-500/5 border-b border-[#91A4B7]/20 text-sm">
                <th className="p-4 font-bold text-gray-400">Data</th>
                <th className="p-4 font-bold text-gray-400">Transação</th>
                <th className="p-4 font-bold text-gray-400">Usuário Afetado</th>
                <th className="p-4 font-bold text-gray-400 text-right">Valor</th>
              </tr>
            </thead>
            <tbody>
              {audit.length === 0 && (<tr><td colSpan={4} className="p-8 text-center text-[#91A4B7]">Nenhuma transação registrada.</td></tr>)}
              {audit.map((item, idx) => (
                <tr key={idx} className="border-b border-[#91A4B7]/10 hover:bg-[#07111F]/50 text-sm">
                  <td className="p-4 text-[#91A4B7]">{item.date}</td>
                  <td className="p-4 font-medium text-white">{item.action}</td>
                  <td className="p-4 text-[#91A4B7]">{item.target}</td>
                  <td className={`p-4 font-bold text-right ${item.details.includes('-') ? 'text-red-500' : 'text-[#00E89D]'}`}>{item.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
