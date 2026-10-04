import React from 'react';

export default function MinhasIndicacoes() {
  const referrals = [
    { id: 'NP000010', name: 'Maria Silva', date: '01/10/2026', matrix: '#002', level: 1, pos: 2, status: 'Ativo' },
    { id: 'NP000015', name: 'Carlos Santos', date: '02/10/2026', matrix: '#002', level: 1, pos: 5, status: 'Ativo' },
    { id: 'NP000022', name: 'Ana Beatriz', date: '02/10/2026', matrix: '#002', level: 2, pos: 8, status: 'Ativo' },
    { id: 'NP000045', name: 'Felipe Rocha', date: '03/10/2026', matrix: '#002', level: 2, pos: 12, status: 'Pendente' },
  ];

  return (
    <div className="min-h-screen bg-[#07111F] text-[#F4F7FA] p-8">
      <h1 className="text-2xl font-bold mb-6 text-[#00AEEF]">Minhas Indicações</h1>
      
      <div className="bg-[#0E1B2B] rounded-2xl border border-[#91A4B7]/20 shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#00AEEF]/10 border-b border-[#91A4B7]/20">
                <th className="p-4 font-semibold text-[#00E5FF]">ID</th>
                <th className="p-4 font-semibold text-[#00E5FF]">Nome</th>
                <th className="p-4 font-semibold text-[#00E5FF]">Data Cadastro</th>
                <th className="p-4 font-semibold text-[#00E5FF]">Matriz</th>
                <th className="p-4 font-semibold text-[#00E5FF]">Nível</th>
                <th className="p-4 font-semibold text-[#00E5FF]">Posição</th>
                <th className="p-4 font-semibold text-[#00E5FF]">Status</th>
              </tr>
            </thead>
            <tbody>
              {referrals.map((ref, idx) => (
                <tr key={idx} className="border-b border-[#91A4B7]/10 hover:bg-[#07111F]/50 transition-colors">
                  <td className="p-4 font-mono text-sm text-[#91A4B7]">{ref.id}</td>
                  <td className="p-4 font-medium">{ref.name}</td>
                  <td className="p-4 text-[#91A4B7]">{ref.date}</td>
                  <td className="p-4 text-[#00AEEF]">{ref.matrix}</td>
                  <td className="p-4">{ref.level}</td>
                  <td className="p-4">{ref.pos}</td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${ref.status === 'Ativo' ? 'bg-[#00E89D]/20 text-[#00E89D]' : 'bg-yellow-500/20 text-yellow-500'}`}>
                      {ref.status}
                    </span>
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
