"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase';

export default function ExtratoMilhas() {
  const [loading, setLoading] = useState(true);
  const [extrato, setExtrato] = useState<any[]>([]);
  const [totalAprovado, setTotalAprovado] = useState(0);
  const [totalPendente, setTotalPendente] = useState(0);
  
  // Modal de Saque
  const [showModal, setShowModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState<number | ''>('');
  const [pixKey, setPixKey] = useState<string>('');
  const [userId, setUserId] = useState<string>('');
  const [tenantId, setTenantId] = useState<string | null>(null);

  async function loadMilhas() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data: profile } = await supabase.from('profiles').select('tenant_id, pix_key').eq('id', user.id).single();
      if (profile) {
        setTenantId(profile.tenant_id);
        if (profile.pix_key) setPixKey(profile.pix_key);
      }

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

  useEffect(() => {
    loadMilhas();
  }, []);

  const handleWithdraw = async () => {
    const amount = Number(withdrawAmount);
    if (amount <= 0 || amount > totalAprovado) {
      alert('Valor inválido ou saldo insuficiente.');
      return;
    }
    if (!pixKey || pixKey.trim() === '') {
      alert('Por favor, informe a sua Chave PIX.');
      return;
    }
    
    try {
      // Salva a chave PIX no perfil do usuário para o futuro
      await supabase.from('profiles').update({ pix_key: pixKey }).eq('id', userId);

      // 1. Registra o pedido de saque
      const { error: wError } = await supabase.from('withdrawals').insert({
        user_id: userId,
        amount_miles: amount,
        status: 'PENDING',
        tenant_id: tenantId,
        pix_key: pixKey
      });
      if (wError) throw wError;

      // 2. Debita as milhas do saldo imediatamente
      const { error: lError } = await supabase.from('financial_ledger').insert({
        user_id: userId,
        from_user_id: userId,
        amount_miles: -amount,
        description: 'Solicitação de Saque',
        status: 'APPROVED',
        level_earned: 0,
        tenant_id: tenantId
      });
      if (lError) throw lError;

      alert('Saque solicitado com sucesso! Aguarde a transferência via PIX.');
      setShowModal(false);
      setWithdrawAmount('');
      loadMilhas(); // Recarrega os dados
    } catch (error) {
      console.error(error);
      alert('Erro ao solicitar saque. Tente novamente.');
    }
  };

  return (
    <div className="min-h-screen bg-[#07111F] text-[#F4F7FA] p-8">
      <h1 className="text-2xl font-bold mb-8 text-[var(--primary-color)]">Minhas Milhas</h1>
      
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
          <button 
            onClick={() => setShowModal(true)}
            className="text-sm bg-[var(--primary-color)] text-white px-4 py-2 rounded font-bold hover:bg-[#0091C7] transition-colors shadow-[0_0_15px_rgba(0,174,239,0.4)]"
          >
            Resgatar Milhas
          </button>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-[var(--primary-color)]">Carregando extrato...</div>
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
                    <td className={`p-4 font-bold text-right ${item.pontos > 0 ? (item.status === 'APPROVED' ? 'text-[#00E89D]' : 'text-yellow-500') : 'text-red-500'}`}>
                      {item.pontos > 0 ? '+' : ''}{item.pontos}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal de Saque */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#0E1B2B] border border-[#91A4B7]/20 p-8 rounded-2xl w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-2">Solicitar Resgate</h3>
            <p className="text-sm text-[#91A4B7] mb-6">Saldo disponível: <strong className="text-[#00E89D]">{totalAprovado} Milhas</strong></p>
            
            <div className="mb-4">
              <label className="block text-xs font-bold text-[#91A4B7] uppercase mb-2">Quantidade a resgatar</label>
              <input 
                type="number" 
                value={withdrawAmount}
                onChange={e => setWithdrawAmount(Number(e.target.value))}
                className="w-full bg-[#07111F] border border-[#91A4B7]/30 rounded-lg p-3 text-white outline-none focus:border-[var(--primary-color)] transition-colors"
                placeholder="Ex: 50"
              />
            </div>

            <div className="mb-6">
              <label className="block text-xs font-bold text-[#91A4B7] uppercase mb-2">Sua Chave PIX</label>
              <input 
                type="text" 
                value={pixKey}
                onChange={e => setPixKey(e.target.value)}
                className="w-full bg-[#07111F] border border-[#91A4B7]/30 rounded-lg p-3 text-white outline-none focus:border-[#00E89D] transition-colors"
                placeholder="CPF, Email, Telefone ou Chave Aleatória"
              />
              <p className="text-[10px] text-yellow-500 mt-1">* Confira sua chave antes de solicitar o saque.</p>
            </div>
            
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded text-sm font-bold text-[#91A4B7] hover:bg-white/5 transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleWithdraw}
                className="px-4 py-2 rounded text-sm font-bold bg-[var(--primary-color)] text-white hover:bg-[#0091C7] transition-colors"
              >
                Confirmar Saque
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
