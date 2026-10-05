"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase';

type Member = {
  id: string;
  name: string;
  avatar: string;
  isDirect: boolean;
  children: Member[];
};

export default function MatrixView() {
  const [loading, setLoading] = useState(true);
  const [rootMember, setRootMember] = useState<Member | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>('');

  useEffect(() => {
    async function loadNetwork() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        setCurrentUserId(user.id);

        // Fetch all profiles to map names and avatars
        const { data: profilesData } = await supabase.from('profiles').select('id, name, avatar_url');
        const profileMap: Record<string, any> = {};
        if (profilesData) {
          profilesData.forEach(p => {
            profileMap[p.id] = p;
          });
        }

        // Fetch all matrix positions to build the tree
        const { data: positions } = await supabase
          .from('matrix_positions')
          .select('user_id, parent_user_id, sponsor_id, position_index');

        if (!positions) {
          setLoading(false);
          return;
        }

        // Build adjacency list
        const childrenMap: Record<string, any[]> = {};
        positions.forEach(pos => {
          if (pos.parent_user_id) {
            if (!childrenMap[pos.parent_user_id]) childrenMap[pos.parent_user_id] = [];
            childrenMap[pos.parent_user_id].push(pos);
          }
        });

        // Recursive function to build the tree up to 3 levels deep
        function buildTree(userId: string, currentLevel: number): Member {
          const profile = profileMap[userId] || {};
          const childrenPositions = childrenMap[userId] || [];
          
          // Sort children by position_index to keep them in order
          childrenPositions.sort((a, b) => a.position_index - b.position_index);

          let children: Member[] = [];
          if (currentLevel < 3) {
            children = childrenPositions.map(childPos => buildTree(childPos.user_id, currentLevel + 1));
          }

          // Determine if it's a direct referral of the logged-in user
          // For the root node itself, isDirect doesn't matter much visually, we'll set it true
          let isDirect = false;
          if (userId === user?.id) {
            isDirect = true;
          } else {
            // Find the position record for this user to check sponsor
            const myPos = positions?.find(p => p.user_id === userId);
            isDirect = myPos?.sponsor_id === user?.id;
          }

          return {
            id: userId,
            name: profile.name || 'Membro',
            avatar: profile.avatar_url || `https://i.pravatar.cc/150?u=${userId}`,
            isDirect,
            children
          };
        }

        const tree = buildTree(user.id, 0);
        setRootMember(tree);

      } catch (error) {
        console.error("Erro ao carregar rede", error);
      } finally {
        setLoading(false);
      }
    }
    loadNetwork();
  }, []);

  const TreeNode = ({ member, isRoot = false }: { member: Member, isRoot?: boolean }) => {
    return (
      <div className="flex flex-col items-center relative">
        <div className={`p-2 m-2 rounded-lg border-2 w-32 flex flex-col items-center shadow-lg transition-transform hover:scale-105 relative z-10 ${member.isDirect ? 'border-[var(--primary-color)] bg-[#0E1B2B]' : 'border-[#00E89D] bg-[#0E1B2B]'}`}>
          <img src={member.avatar} alt="avatar" className="w-12 h-12 rounded-full mb-2 object-cover" />
          <p className="text-xs text-center font-bold text-white truncate w-full">{member.name}</p>
          <p className="text-[10px] text-[#91A4B7]">{isRoot ? 'ROOT' : member.isDirect ? 'Direto' : 'Spillover'}</p>
        </div>
        
        {member.children && member.children.length > 0 && (
          <>
            <div className="w-[2px] h-6 bg-[#91A4B7]/40 -mt-2"></div>
            
            <div className="flex flex-row relative pt-4 border-t-2 border-[#91A4B7]/40">
              {member.children.map((child) => (
                <div key={child.id} className="px-2 relative flex flex-col items-center">
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
    return <div className="min-h-screen bg-[#07111F] text-[var(--primary-color)] flex justify-center items-center">Carregando mapa da rede...</div>;
  }

  return (
    <div className="min-h-screen bg-[#07111F] text-[#F4F7FA] p-8 overflow-auto flex flex-col">
      <h1 className="text-2xl font-bold mb-6 text-[var(--primary-color)]">Árvore da Matriz</h1>
      <div className="flex items-center gap-4 mb-8 text-sm bg-[#0E1B2B] p-4 rounded-xl border border-[#91A4B7]/20 w-fit">
        <div className="flex items-center gap-2"><div className="w-4 h-4 rounded border-2 border-[var(--primary-color)] bg-[#0E1B2B]"></div> Sua Indicação Direta</div>
        <div className="flex items-center gap-2"><div className="w-4 h-4 rounded border-2 border-[#00E89D] bg-[#0E1B2B]"></div> Spillover (Caiu na sua rede)</div>
      </div>
      
      <div className="flex-grow overflow-auto p-8 border border-[#91A4B7]/20 rounded-xl bg-[#07111F]/50 flex justify-center items-start">
        {rootMember ? (
          <div className="inline-flex min-w-max pb-16">
            <TreeNode member={rootMember} isRoot={true} />
          </div>
        ) : (
          <div className="text-[#91A4B7] text-center p-8">Nenhuma rede encontrada. Comece a indicar!</div>
        )}
      </div>
    </div>
  );
}
