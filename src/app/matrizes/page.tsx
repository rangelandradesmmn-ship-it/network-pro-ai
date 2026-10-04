import React from 'react';
import Link from 'next/link';

export default function MinhasMatrizes() {
  const matrizes = [
    { id: '#003', status: 'Em andamento', progresso: 0, total: 155, date: '03/10/2026', current: true },
    { id: '#002', status: 'Completa', progresso: 155, total: 155, date: '01/10/2026', current: false },
    { id: '#001', status: 'Completa', progresso: 155, total: 155, date: '15/09/2026', current: false },
  ];

  return (
    <div className="min-h-screen bg-[#07111F] text-[#F4F7FA] p-8">
      <h1 className="text-2xl font-bold mb-6 text-[#00AEEF]">Histórico de Matrizes</h1>
      
      <p className="text-[#91A4B7] mb-8 max-w-2xl">
        Aqui você encontra o registro imutável de todos os seus ciclos. Cada nova matriz começa vazia (0/155). As matrizes fechadas continuam disponíveis para auditoria da rede.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {matrizes.map((matriz) => (
          <div key={matriz.id} className={`bg-[#0E1B2B] p-6 rounded-2xl border shadow-lg relative ${matriz.current ? 'border-[#00AEEF]' : 'border-[#91A4B7]/20'}`}>
            {matriz.current && (
              <span className="absolute top-4 right-4 bg-[#00AEEF]/20 text-[#00AEEF] text-xs font-bold px-2 py-1 rounded">ATUAL</span>
            )}
            <h3 className="text-xl font-bold mb-2">Matriz {matriz.id}</h3>
            
            <p className={`font-semibold mb-4 ${matriz.status === 'Completa' ? 'text-[#00E89D]' : 'text-[#91A4B7]'}`}>
              {matriz.status}
            </p>

            <div className="flex justify-between items-end mb-2">
              <p className="text-2xl font-bold text-white">{matriz.progresso} <span className="text-sm text-[#91A4B7]">/ {matriz.total}</span></p>
              <p className="text-sm font-bold">{Math.round((matriz.progresso/matriz.total)*100)}%</p>
            </div>
            
            <div className="w-full bg-[#07111F] rounded-full h-2 mb-4 overflow-hidden">
              <div 
                className={`h-2 rounded-full ${matriz.status === 'Completa' ? 'bg-[#00E89D]' : 'bg-gradient-to-r from-[#00AEEF] to-[#00E5FF]'}`}
                style={{ width: `${(matriz.progresso/matriz.total)*100}%` }}
              ></div>
            </div>

            <p className="text-xs text-[#91A4B7] mb-4">Criada em: {matriz.date}</p>

            <Link href="/minha-rede">
              <button className="w-full py-2 bg-[#07111F] border border-[#91A4B7]/30 hover:bg-[#00AEEF]/10 hover:border-[#00AEEF]/50 transition-colors rounded-lg text-sm font-semibold">
                Visualizar Estrutura
              </button>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
