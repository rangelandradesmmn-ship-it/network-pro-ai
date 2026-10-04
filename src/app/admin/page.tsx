import React from 'react';

export default function AdminDashboard() {
  return (
    <div className="min-h-screen bg-[#07111F] text-[#F4F7FA] p-8">
      <header className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-bold text-red-500">
            Painel Super Admin
          </h1>
          <p className="text-[#91A4B7] mt-1">Visão global da plataforma Network Pro AI</p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-[#0E1B2B] p-6 rounded-2xl border border-red-500/20 shadow-lg">
          <h3 className="text-[#91A4B7] mb-2 font-semibold">Total de Usuários</h3>
          <p className="text-4xl font-bold text-white">12.450</p>
          <p className="text-sm mt-2 text-[#00E89D]">+45 hoje</p>
        </div>
        
        <div className="bg-[#0E1B2B] p-6 rounded-2xl border border-red-500/20 shadow-lg">
          <h3 className="text-[#91A4B7] mb-2 font-semibold">Matrizes Ativas</h3>
          <p className="text-4xl font-bold text-white">11.100</p>
        </div>

        <div className="bg-[#0E1B2B] p-6 rounded-2xl border border-red-500/20 shadow-lg">
          <h3 className="text-[#91A4B7] mb-2 font-semibold">Matrizes Completas</h3>
          <p className="text-4xl font-bold text-[#00AEEF]">1.350</p>
        </div>

        <div className="bg-[#0E1B2B] p-6 rounded-2xl border border-red-500/20 shadow-lg">
          <h3 className="text-[#91A4B7] mb-2 font-semibold">Milhas Distribuídas</h3>
          <p className="text-4xl font-bold text-[#00E89D]">4.5M</p>
        </div>
      </div>

      <div className="bg-[#0E1B2B] rounded-2xl border border-red-500/20 shadow-lg overflow-hidden">
        <div className="p-4 border-b border-red-500/20 flex justify-between items-center bg-[#07111F]/50">
          <h2 className="font-semibold text-lg text-red-400">Auditoria Recente</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-red-500/5 border-b border-red-500/20">
                <th className="p-4 text-red-400">Timestamp</th>
                <th className="p-4 text-red-400">Ação</th>
                <th className="p-4 text-red-400">Admin ID</th>
                <th className="p-4 text-red-400">Target</th>
                <th className="p-4 text-red-400">Detalhes</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-[#91A4B7]/10 hover:bg-[#07111F]/50">
                <td className="p-4 text-[#91A4B7]">04/10/2026 09:30</td>
                <td className="p-4 text-white font-bold">Bloqueio de Usuário</td>
                <td className="p-4">ADM-001</td>
                <td className="p-4 text-[#00AEEF]">NP00456</td>
                <td className="p-4 text-[#91A4B7]">Violação de regras</td>
              </tr>
              <tr className="border-b border-[#91A4B7]/10 hover:bg-[#07111F]/50">
                <td className="p-4 text-[#91A4B7]">04/10/2026 08:15</td>
                <td className="p-4 text-white font-bold">Alteração de Regra</td>
                <td className="p-4">ADM-001</td>
                <td className="p-4 text-[#00AEEF]">Sistema Global</td>
                <td className="p-4 text-[#91A4B7]">Versão 2 (25/15/25) cadastrada</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
