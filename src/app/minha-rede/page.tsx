"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase';

type Member = {
  id: string;
  name: string;
  level: number;
  position: number;
  avatar: string;
  isDirect: boolean;
};

export default function MatrixView() {
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<Member[]>([]);

  useEffect(() => {
    async function loadNetwork() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch user's active matrix
        const { data: matrixData } = await supabase
          .from('matrices')
          .select('id')
          .eq('owner_user_id', user.id)
          .order('matrix_number', { ascending: false })
          .limit(1)
          .single();

        if (!matrixData) {
          setMembers([]);
          return;
        }

        // Fetch user's profile to be the root node
        const { data: myProfile } = await supabase
          .from('profiles')
          .select('name, avatar_url')
          .eq('id', user.id)
          .single();

        const networkMembers: Member[] = [];
        
        // Root node
        networkMembers.push({
          id: user.id,
          name: myProfile?.name || 'Você',
          level: 0,
          position: 0,
          avatar: myProfile?.avatar_url || 'https://i.pravatar.cc/150?u=0',
          isDirect: true
        });

        // Fetch all positions in this matrix
        const { data: positions } = await supabase
          .from('matrix_positions')
          .select(`
            user_id,
            position_index,
            level,
            is_direct_referral,
            profiles!matrix_positions_user_id_fkey (
              name,
              avatar_url
            )
          `)
          .eq('matrix_id', matrixData.id)
          .order('position_index', { ascending: true });

        if (positions) {
          positions.forEach((pos: any) => {
            networkMembers.push({
              id: pos.user_id,
              name: pos.profiles?.name || 'Membro',
              level: pos.level,
              position: pos.position_index,
              avatar: pos.profiles?.avatar_url || `https://i.pravatar.cc/150?u=${pos.position_index}`,
              isDirect: pos.is_direct_referral
            });
          });
        }

        setMembers(networkMembers);
      } catch (error) {
        console.error("Erro ao carregar rede", error);
      } finally {
        setLoading(false);
      }
    }
    loadNetwork();
  }, []);

  const getChildren = (parentPos: number) => {
    if (parentPos === 0) return members.filter(m => m.level === 1);
    const startChildPos = (parentPos - 1) * 5 + 6; // Formula: 5 children per node
    return members.filter(m => m.position >= startChildPos && m.position <= startChildPos + 4);
  };

  const TreeNode = ({ member }: { member: Member }) => {
    const children = getChildren(member.position);
    
    return (
      <div className="flex flex-col items-center">
        <div className={`p-2 m-2 rounded-lg border-2 w-32 flex flex-col items-center shadow-lg transition-transform hover:scale-105 ${member.isDirect ? 'border-[#00AEEF] bg-[#0E1B2B]' : 'border-[#00E89D] bg-[#0E1B2B]'}`}>
          <img src={member.avatar} alt="avatar" className="w-12 h-12 rounded-full mb-2 object-cover" />
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

  if (loading) {
    return <div className="min-h-screen bg-[#07111F] text-[#00AEEF] flex justify-center items-center">Carregando mapa da rede...</div>;
  }

  return (
    <div className="min-h-screen bg-[#07111F] text-[#F4F7FA] p-8 overflow-auto flex flex-col">
      <h1 className="text-2xl font-bold mb-6 text-[#00AEEF]">Árvore da Matriz</h1>
      <div className="flex items-center gap-4 mb-8 text-sm">
        <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-[#00AEEF]"></div> Indicação Direta</div>
        <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-[#00E89D]"></div> Spillover (Derramamento)</div>
      </div>
      
      <div className="flex-grow overflow-auto p-4 border border-[#91A4B7]/20 rounded-xl bg-[#07111F]/50">
        {members.length > 0 ? (
          <div className="inline-flex min-w-max">
            <TreeNode member={members[0]} />
          </div>
        ) : (
          <div className="text-[#91A4B7] text-center p-8">Nenhuma rede encontrada. Comece a indicar!</div>
        )}
      </div>
    </div>
  );
}
