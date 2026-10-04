import React from 'react';

export default function MinhasMilhas() {
  const transactions = [
    { id: 'TRX-101', type: '+20', desc: 'Novo participante (Indicação Direta)', origin: 'Maria Silva', matrix: '#002', level: 1, date: '01/10/2026 14:30' },
    { id: 'TRX-102', type: '+20', desc: 'Novo participante (Indicação Direta)', origin: 'Carlos Santos', matrix: '#002', level: 1, date: '02/10/2026 09:15' },
    { id: 'TRX-103', type: '+10', desc: 'Spillover (Rede)', origin: 'Ana Beatriz', matrix: '#002', level: 2, date: '02/10/2026 16:45' },
    { id: 'TRX-104', type: '+10', desc: 'Novo participante (Indicação Direta)', origin: 'Felipe Rocha', matrix: '#002', level: 2, date: '03/10/2026 10:00' },
  ];

  return (
    <div className="min-h-screen bg-[#07111F] text-[#F4F7FA] p-8">
      <h1 className="text-2xl font-bold mb-6 text-[#00AEEF]">Minhas Milhas</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-[#0E1B2B] p-6 rounded-xl border border-[#91A4B7]/20">
          <p className="text-[#91A4B7] text-sm">Saldo Atual</p>
          <p className="text-3xl font-bold text-[#00E89D]">2.450</p>
        </div>
        <div className="bg-[#0E1B2B] p-6 rounded-xl border border-[#91A4B7]/20">
          <p className="text-[#91A4B7] text-sm">Nível 1 (20/pos)</p>
          <p className="text-2xl font-bold">100 <span className="text-sm font-normal text-gray-500">/ 100</span></p>
        </div>
        <div className="bg-[#0E1B2B] p-6 rounded-xl border border-[#91A4B7]/20">
          <p className="text-[#91A4B7] text-sm">Nível 2 (10/pos)</p>
          <p className="text-2xl font-bold">250 <span className="text-sm font-normal text-gray-500">/ 250</span></p>
        </div>
        <div className="bg-[#0E1B2B] p-6 rounded-xl border border-[#91A4B7]/20">
          <p className="text-[#91A4B7] text-sm">Nível 3 (20/pos)</p>
          <p className="text-2xl font-bold">2.100 <span className="text-sm font-normal text-gray-500">/ 2500</span></p>
        </div>
      </div>

      <div className="bg-[#0E1B2B] rounded-2xl border border-[#91A4B7]/20 shadow-lg overflow-hidden">
        <div className="p-4 border-b border-[#91A4B7]/20 flex justify-between items-center bg-[#07111F]/50">
          <h2 className="font-semibold text-lg">Extrato (Ledger)</h2>
          <select className="bg-[#07111F] border border-[#91A4B7]/30 text-white rounded p-2 text-sm">
            <option>Últimos 30 dias</option>
            <option>Este Mês</option>
            <option>Mês Passado</option>
          </select>
        </div>
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
              {transactions.map((trx, idx) => (
                <tr key={idx} className="border-b border-[#91A4B7]/10 hover:bg-[#07111F]/50">
                  <td className="p-4 text-[#91A4B7]">{trx.date}</td>
                  <td className="p-4 font-mono text-[#91A4B7] text-xs">{trx.id}</td>
                  <td className="p-4">{trx.desc}</td>
                  <td className="p-4">{trx.origin}</td>
                  <td className="p-4 text-[#00AEEF]">{trx.matrix}</td>
                  <td className="p-4">{trx.level}</td>
                  <td className="p-4 text-right font-bold text-[#00E89D]">{trx.type}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
