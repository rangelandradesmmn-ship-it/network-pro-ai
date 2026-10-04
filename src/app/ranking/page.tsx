import React from 'react';

export default function Ranking() {
  const ranking = [
    { pos: 1, name: 'João Silva', milhas: '45.800', indicacoes: 124, matrizes: 4, avatar: 'https://i.pravatar.cc/150?u=1' },
    { pos: 2, name: 'Maria Souza', milhas: '32.100', indicacoes: 89, matrizes: 3, avatar: 'https://i.pravatar.cc/150?u=2' },
    { pos: 3, name: 'Pedro Alves', milhas: '28.500', indicacoes: 76, matrizes: 2, avatar: 'https://i.pravatar.cc/150?u=3' },
    { pos: 4, name: 'Ana Beatriz', milhas: '15.200', indicacoes: 45, matrizes: 1, avatar: 'https://i.pravatar.cc/150?u=4' },
    { pos: 5, name: 'Carlos Santos', milhas: '12.000', indicacoes: 30, matrizes: 1, avatar: 'https://i.pravatar.cc/150?u=5' },
  ];

  return (
    <div className="min-h-screen bg-[#07111F] text-[#F4F7FA] p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-[#00AEEF]">Ranking Global</h1>
        <select className="bg-[#0E1B2B] border border-[#91A4B7]/30 text-white rounded p-2 text-sm">
          <option>Mês Atual</option>
          <option>Geral</option>
        </select>
      </div>
      
      <div className="bg-[#0E1B2B] rounded-2xl border border-[#91A4B7]/20 shadow-lg p-6">
        <div className="flex flex-col gap-4">
          {ranking.map((user) => (
            <div key={user.pos} className="flex items-center justify-between p-4 bg-[#07111F]/50 rounded-xl border border-[#91A4B7]/10 hover:border-[#00AEEF]/50 transition-colors">
              <div className="flex items-center gap-4">
                <div className={`text-xl font-bold w-8 text-center ${user.pos === 1 ? 'text-yellow-400' : user.pos === 2 ? 'text-gray-300' : user.pos === 3 ? 'text-orange-400' : 'text-[#91A4B7]'}`}>
                  #{user.pos}
                </div>
                <img src={user.avatar} alt="avatar" className="w-12 h-12 rounded-full border-2 border-[#0E1B2B]" />
                <div>
                  <h3 className="font-bold text-lg">{user.name}</h3>
                  <p className="text-xs text-[#91A4B7]">{user.matrizes} Matrizes Completas | {user.indicacoes} Diretos</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-[#00E89D]">{user.milhas}</p>
                <p className="text-xs text-[#91A4B7]">Milhas Totais</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
