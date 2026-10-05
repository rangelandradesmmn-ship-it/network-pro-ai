"use client";
import QRCode from "react-qr-code";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase';

export default function Dashboard() {
  const [showQR, setShowQR] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [matrix, setMatrix] = useState<any>(null);
  const [needsActivation, setNeedsActivation] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [daysLeft, setDaysLeft] = useState<number | null>(null);
  const [showRenewalPopup, setShowRenewalPopup] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Buscar perfil e calcular milhas reais
        const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        const { data: milesData } = await supabase.from('financial_ledger').select('amount_miles').eq('user_id', user.id).eq('status', 'APPROVED');
        const realMiles = milesData ? milesData.reduce((acc, curr) => acc + curr.amount_miles, 0) : 0;

        if (profileData) {
          setProfile({ ...profileData, total_miles: realMiles });
          
          if (profileData.active_until) {
            const diffTime = new Date(profileData.active_until).getTime() - new Date().getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            setDaysLeft(diffDays);
            if (diffDays <= 3) {
              setShowRenewalPopup(true);
            }
          } else {
             // Nunca ativado (ou sistema legado)
             setDaysLeft(-1); // Força vencido
             setShowRenewalPopup(true);
          }
        }

        // Buscar ultimas movimentacoes
        const { data: activityData } = await supabase
          .from('financial_ledger')
          .select('id, created_at, description, amount_miles, status')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5);
        if (activityData) setRecentActivity(activityData);

        // Check if user has PENDING ledger entries as payer
        const { count: pendingCount } = await supabase
          .from('financial_ledger')
          .select('*', { count: 'exact', head: true })
          .eq('from_user_id', user.id)
          .eq('status', 'PENDING');
          
        if (pendingCount && pendingCount > 0) {
          setNeedsActivation(true);
          setShowRenewalPopup(false); // Já está pagando
        }

        // Buscar matriz ativa
        if (profileData?.role === 'SUPER_ADMIN' || profileData?.role === 'ADMIN') {
          const { data: matrixData } = await supabase
            .from('matrices')
            .select('*')
            .eq('owner_user_id', user.id)
            .order('matrix_number', { ascending: false })
            .limit(1)
            .single();
          if (matrixData) setMatrix(matrixData);
        } else {
          const { data: matrixData } = await supabase.rpc('get_user_matrices_progress', { p_user_id: user.id });
          if (matrixData && matrixData.length > 0) setMatrix(matrixData[0]);
        }
      } catch (error) {
        console.error("Erro ao carregar dados", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleRenew = async () => {
    setIsProcessing(true);
    try {
      await supabase.rpc('generate_renewal_commissions', { p_user_id: profile.id });
      setNeedsActivation(true);
      setShowRenewalPopup(false);
      alert('Pedido de renovação gerado! Pague sua ativação para continuar ganhando milhas.');
    } catch (e) {
      console.error(e);
      alert('Erro ao gerar renovação.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-[#07111F] text-[var(--primary-color)] flex justify-center items-center">Carregando dados reais...</div>;
  }

  const referralLink = profile ? `${window.location.origin}/cadastro?ref=${profile.referral_code}` : '';
  const totalMembers = matrix ? matrix.total_members : 0;
  const capacity = matrix ? matrix.capacity : 155;
  const percentage = Math.round((totalMembers / capacity) * 100);

  const isExpired = daysLeft !== null && daysLeft <= 0;

  return (
    <div className="min-h-screen bg-[#07111F] text-[#F4F7FA] p-8 relative">
      <header className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[var(--primary-color)] to-[var(--secondary-color)]">
            NETWORK PRO AI
          </h1>
          <p className="text-[#91A4B7] mt-1">Bem-vindo(a) de volta, {profile?.name || 'Visitante'}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm text-[#91A4B7]">ID: {profile?.referral_code || '---'}</p>
            <p className={`font-bold ${needsActivation || isExpired ? 'text-yellow-500' : 'text-[#00E89D]'}`}>
              Status: {needsActivation ? 'Pendente' : (isExpired ? 'Inativo (Vencido)' : 'Ativo')}
            </p>
            {profile?.active_until && (
              <p className="text-[10px] text-[#91A4B7]">Vence: {new Date(profile.active_until).toLocaleDateString('pt-BR')}</p>
            )}
          </div>
          <img src={profile?.avatar_url || "https://i.pravatar.cc/150?u=admin"} alt="Perfil" className="w-12 h-12 rounded-full border-2 border-[var(--primary-color)]" />
        </div>
      </header>

      {/* POPUP DE RENOVAÇÃO */}
      {showRenewalPopup && !needsActivation && (
        <div className="fixed bottom-8 right-8 z-50 bg-[#0E1B2B] border border-yellow-500 shadow-2xl shadow-yellow-500/20 p-6 rounded-2xl w-80 animate-bounce-short">
          <h3 className="text-yellow-500 font-bold text-lg mb-2">Mensalidade Vencendo!</h3>
          {isExpired ? (
            <p className="text-sm text-[#91A4B7] mb-4">Sua assinatura venceu. Você está Inativo e pode perder comissões! Renove agora.</p>
          ) : (
            <p className="text-sm text-[#91A4B7] mb-4">Sua assinatura vence em <strong className="text-white">{daysLeft} dias</strong>. Antecipe a renovação para não perder comissões!</p>
          )}
          <div className="flex gap-2">
            <button onClick={() => setShowRenewalPopup(false)} className="flex-1 px-4 py-2 bg-[#07111F] text-[#91A4B7] rounded-lg text-sm font-bold hover:text-white">Fechar</button>
            <button onClick={handleRenew} disabled={isProcessing} className="flex-1 px-4 py-2 bg-yellow-500 text-[#07111F] rounded-lg text-sm font-bold hover:bg-yellow-400 disabled:opacity-50">Renovar</button>
          </div>
        </div>
      )}

      {needsActivation && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-6 mb-8 flex justify-between items-center shadow-lg shadow-yellow-500/5">
          <div>
            <h2 className="text-yellow-500 font-bold text-lg mb-1">Atenção: Ativação Pendente</h2>
            <p className="text-[#91A4B7] text-sm">A sua entrada na rede está aguardando o reconhecimento do pagamento. Fale com o dono desta rede para ele aprovar a sua conta.</p>
          </div>
          <div className="bg-yellow-500/20 text-yellow-500 font-bold py-2 px-4 rounded-lg">
            Aguardando Admin
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-[#0E1B2B] p-6 rounded-2xl border border-[#91A4B7]/20 shadow-lg">
          <h3 className="text-[#91A4B7] mb-2 font-semibold">Total de Milhas</h3>
          <p className="text-4xl font-bold text-[#00E89D]">{profile?.total_miles || 0}</p>
          <p className="text-sm mt-2 text-[#91A4B7]">Acumuladas até o momento</p>
        </div>
        
        <div className="bg-[#0E1B2B] p-6 rounded-2xl border border-[#91A4B7]/20 shadow-lg flex flex-col justify-between">
          {!showQR ? (
            <>
              <div>
                <h3 className="text-[#91A4B7] mb-2 font-semibold">Seu Link de Indicação</h3>
                {needsActivation ? (
                  <p className="text-sm text-yellow-500 bg-yellow-500/10 p-2 rounded-lg mt-2">
                    Link bloqueado. Pague a ativação acima para liberar.
                  </p>
                ) : (
                  <p className="text-lg font-mono text-[var(--primary-color)] bg-[#07111F] p-2 rounded-lg truncate mt-2">
                    {referralLink || 'Link indisponível'}
                  </p>
                )}
              </div>
              <div className="flex gap-2 mt-4">
                <button 
                  onClick={() => navigator.clipboard.writeText(referralLink)}
                  disabled={needsActivation}
                  className="flex-1 bg-[var(--primary-color)] hover:bg-[var(--secondary-color)] text-[#07111F] font-bold py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Copiar
                </button>
                <button 
                  onClick={() => setShowQR(true)}
                  disabled={needsActivation}
                  className="flex-1 bg-[#0E1B2B] border border-[var(--primary-color)] hover:bg-[var(--primary-color)]/20 text-[var(--primary-color)] font-bold py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  QR Code
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="bg-white p-2 rounded-lg mb-4">
                 <QRCode value={referralLink} size={120} />
              </div>
              <button 
                onClick={() => setShowQR(false)}
                className="w-full bg-[#0E1B2B] border border-[#91A4B7] text-[#91A4B7] hover:text-white hover:border-white py-1 rounded transition-colors text-sm"
              >
                Voltar
              </button>
            </div>
          )}
        </div>

        <div className="bg-[#0E1B2B] p-6 rounded-2xl border border-[#91A4B7]/20 shadow-lg">
          <h3 className="text-[#91A4B7] mb-2 font-semibold">Matriz Atual: #{matrix?.matrix_number ? String(matrix.matrix_number).padStart(3, '0') : '---'}</h3>
          <div className="flex justify-between items-end mb-2">
            <p className="text-3xl font-bold text-white">{totalMembers} <span className="text-lg text-[#91A4B7]">/ {capacity}</span></p>
            <p className="text-[var(--secondary-color)] font-bold">{percentage}%</p>
          </div>
          <div className="w-full bg-[#07111F] rounded-full h-3 mb-4 overflow-hidden">
            <div className="bg-gradient-to-r from-[var(--primary-color)] to-[var(--secondary-color)] h-3 rounded-full" style={{ width: `${percentage}%` }}></div>
          </div>
          <div className="flex justify-between text-xs text-[#91A4B7]">
            <span className="w-full text-center">Níveis em preenchimento inteligente</span>
          </div>
        </div>
      </div>

      <div className="bg-[#0E1B2B] rounded-2xl border border-[#91A4B7]/20 shadow-lg overflow-hidden">
        <div className="p-6 border-b border-[#91A4B7]/20">
          <h2 className="text-lg font-bold text-white">Últimas Movimentações</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#07111F]/50 border-b border-[#91A4B7]/20 text-sm">
                <th className="p-4 font-bold text-[#91A4B7]">Data</th>
                <th className="p-4 font-bold text-[#91A4B7]">Tipo</th>
                <th className="p-4 font-bold text-[#91A4B7]">Status</th>
                <th className="p-4 font-bold text-[#91A4B7] text-right">Valor</th>
              </tr>
            </thead>
            <tbody>
              {recentActivity.length === 0 ? (
                <tr><td colSpan={4} className="p-8 text-center text-[#91A4B7]">Nenhuma movimentação recente.</td></tr>
              ) : recentActivity.map((item, idx) => {
                const isAprovado = !item.status || item.status === 'APPROVED';
                return (
                  <tr key={idx} className="border-b border-[#91A4B7]/10 hover:bg-[#07111F]/50 transition-colors">
                    <td className="p-4 text-sm text-[#91A4B7]">{new Date(item.created_at).toLocaleDateString('pt-BR')}</td>
                    <td className="p-4 text-sm font-medium">{item.description}</td>
                    <td className="p-4 text-sm font-bold">
                      {isAprovado ? (
                        <span className="text-[#00E89D] bg-[#00E89D]/10 px-2 py-1 rounded">Aprovado</span>
                      ) : (
                        <span className="text-yellow-500 bg-yellow-500/10 px-2 py-1 rounded">Pendente</span>
                      )}
                    </td>
                    <td className={`p-4 font-bold text-right ${item.amount_miles > 0 ? (isAprovado ? 'text-[#00E89D]' : 'text-yellow-500') : 'text-red-500'}`}>
                      {item.amount_miles > 0 ? '+' : ''}{item.amount_miles} Milhas
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
