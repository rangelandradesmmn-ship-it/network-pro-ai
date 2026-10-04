"use client";
import React, { useState } from 'react';

type Member = {
  id: string;
  name: string;
  level: number;
  position: number;
  avatar: string;
  isDirect: boolean;
};

// Mock data generator for demonstration
const generateMockMatrix = () => {
  const members: Member[] = [];
  members.push({ id: '1', name: 'Você (Titular)', level: 0, position: 0, avatar: 'https://i.pravatar.cc/150?u=0', isDirect: true });
  for (let i = 1; i <= 155; i++) {
    let level = 1;
    if (i > 5 && i <= 30) level = 2;
    if (i > 30) level = 3;
    members.push({
      id: `${i+1}`,
      name: `Membro ${i}`,
      level,
      position: i,
      avatar: `https://i.pravatar.cc/150?u=${i}`,
      isDirect: Math.random() > 0.5
    });
  }
  return members;
};

export default function MatrixView() {
  const [members] = useState<Member[]>(generateMockMatrix().slice(0, 31)); // Only showing 31 to keep it manageable initially

  const getChildren = (parentId: string, parentPos: number) => {
    if (parentPos === 0) return members.filter(m => m.level === 1);
    const startChildPos = (parentPos - 1) * 5 + 6;
    return members.filter(m => m.position >= startChildPos && m.position <= startChildPos + 4);
  };

  const TreeNode = ({ member }: { member: Member }) => {
    const children = getChildren(member.id, member.position);
    
    return (
      <div className="flex flex-col items-center">
        <div className={`p-2 m-2 rounded-lg border-2 w-32 flex flex-col items-center shadow-lg transition-transform hover:scale-105 ${member.isDirect ? 'border-[#00AEEF] bg-[#0E1B2B]' : 'border-[#00E89D] bg-[#0E1B2B]'}`}>
          <img src={member.avatar} alt="avatar" className="w-12 h-12 rounded-full mb-2" />
          <p className="text-xs text-center font-bold text-white truncate w-full">{member.name}</p>
          <p className="text-[10px] text-gray-400">Pos: {member.position > 0 ? member.position : 'ROOT'}</p>
        </div>
        {children.length > 0 && (
          <div className="flex flex-row relative mt-4">
            {children.map(child => (
              <div key={child.id} className="mx-1 relative">
                <TreeNode member={child} />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#07111F] text-[#F4F7FA] p-8 overflow-auto flex flex-col">
      <h1 className="text-2xl font-bold mb-6 text-[#00AEEF]">Minha Rede</h1>
      <div className="flex items-center gap-4 mb-8 text-sm">
        <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-[#00AEEF]"></div> Indicação Direta</div>
        <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-[#00E89D]"></div> Spillover</div>
      </div>
      
      <div className="flex-grow overflow-auto p-4 border border-[#91A4B7]/20 rounded-xl bg-[#07111F]/50">
        <div className="inline-flex min-w-max">
          <TreeNode member={members[0]} />
        </div>
      </div>
    </div>
  );
}
