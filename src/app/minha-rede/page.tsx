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
  const [currentUserId, setCurrentUserId] = useState<string>('');

  useEffect(() => {
    async function loadNetwork() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        setCurrentUserId(user.id);

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
        const { data: positions, error: posError } = await supabase
          .from('matrix_positions')
          .select('user_id, position_index, level, is_direct_referral, sponsor_id')
          .eq('matrix_id', matrixData.id)
          .order('position_index', { ascending: true });

        if (posError) {
          console.error("Erro ao buscar posições:", posError);
        }

        if (positions && positions.length > 0) {
          // Fetch profiles for these users manually to avoid PostgREST FK ambiguity
          const userIds = positions.map(p => p.user_id);
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('id, name, avatar_url')
            .in('id', userIds);

          const profileMap: Record<string, any> = {};
          if (profilesData) {
            profilesData.forEach(p => {
              profileMap[p.id] = p;
            });
          }

          positions.forEach((pos: any) => {
            const userProfile = profileMap[pos.user_id];
            networkMembers.push({
              id: pos.user_id,
              name: userProfile?.name || 'Membro',
              level: pos.level,
              position: pos.position_index,
              avatar: userProfile?.avatar_url || `https://i.pravatar.cc/150?u=${pos.position_index}`,
              isDirect: pos.sponsor_id === user.id
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

  const TreeNode = ({ member, isRoot = false }: { member: Member, isRoot?: boolean }) => {
    const children = getChildren(member.position);
    
    return (
      <div className="flex flex-col items-center relative">
        <div className={`p-2 m-2 rounded-lg border-2 w-32 flex flex-col items-center shadow-lg transition-transform hover:scale-105 relative z-10 ${member.isDirect ? 'border-[#00AEEF] bg-[#0E1B2B]' : 'border-[#00E89D] bg-[#0E1B2B]'}`}>
          <img src={member.avatar} alt="avatar" className="w-12 h-12 rounded-full mb-2 object-cover" />
          <p className="text-xs text-center font-bold text-white truncate w-full">{member.name}</p>
          <p className="text-[10px] text-[#91A4B7]">Pos: {member.position > 0 ? member.position : 'ROOT'}</p>
        </div>
        
        {children.length > 0 && (
          <>
            {/* Linha vertical do pai descendo */}
            <div className="w-[2px] h-6 bg-[#91A4B7]/40 -mt-2"></div>
            
            {/* Container dos filhos com borda superior conectando todos */}
            <div className="flex flex-row relative pt-4 border-t-2 border-[#91A4B7]/40">
              {children.map((child, idx) => (
                <div key={child.id} className="px-2 relative flex flex-col items-center">
                  {/* Linha vertical subindo de cada filho para conectar na borda superior */}
                  <div className="w-[2px] h-4 bg-[#91A4B7]/40 absolute top-0"></div>
                  <TreeNode member={child} />
                </div>
              ))}
            </div>
          </>
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
      <div className="flex items-center gap-4 mb-8 text-sm bg-[#0E1B2B] p-4 rounded-xl border border-[#91A4B7]/20 w-fit">
        <div className="flex items-center gap-2"><div className="w-4 h-4 rounded border-2 border-[#00AEEF] bg-[#0E1B2B]"></div> Sua Indicação Direta</div>
        <div className="flex items-center gap-2"><div className="w-4 h-4 rounded border-2 border-[#00E89D] bg-[#0E1B2B]"></div> Spillover (Caiu na sua rede)</div>
      </div>
      
      <div className="flex-grow overflow-auto p-8 border border-[#91A4B7]/20 rounded-xl bg-[#07111F]/50 flex justify-center items-start">
        {members.length > 0 ? (
          <div className="inline-flex min-w-max pb-16">
            <TreeNode member={members[0]} isRoot={true} />
          </div>
        ) : (
          <div className="text-[#91A4B7] text-center p-8">Nenhuma rede encontrada. Comece a indicar!</div>
        )}
      </div>
    </div>
  );
}
