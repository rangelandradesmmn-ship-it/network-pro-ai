"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { 
  LayoutDashboard, 
  Network, 
  Layers, 
  Share2, 
  Users, 
  Star, 
  Trophy, 
  Lock, 
  Settings, 
  LogOut 
} from 'lucide-react';

import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const [isAdmin, setIsAdmin] = useState(false);
  const [companyName, setCompanyName] = useState('NETWORK PRO AI');
  const [shortName, setShortName] = useState('NP AI');

  useEffect(() => {
    async function checkAdmin() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('role, tenant_id').eq('id', user.id).single();
        if (profile?.role === 'ADMIN' || profile?.role === 'SUPER_ADMIN') {
          setIsAdmin(true);
        }
        
        if (profile?.tenant_id) {
          const { data: settings } = await supabase.from('tenant_settings').select('company_name').eq('tenant_id', profile.tenant_id).single();
          if (settings && settings.company_name) {
            setCompanyName(settings.company_name.toUpperCase());
            const initials = settings.company_name.split(' ').map((n: string) => n[0]).join('').substring(0, 3);
            setShortName(initials);
          }
        }
      }
    }
    checkAdmin();
  }, []);

  const menuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard size={20} /> },
    { name: 'Minhas Matrizes', path: '/matrizes', icon: <Layers size={20} /> },
    { name: 'Minha Rede', path: '/minha-rede', icon: <Share2 size={20} /> },
    { name: 'Minhas Indicações', path: '/minhas-indicacoes', icon: <Users size={20} /> },
    { name: 'Minhas Milhas', path: '/minhas-milhas', icon: <Star size={20} /> },
    { name: 'Ranking', path: '/ranking', icon: <Trophy size={20} /> },
    ...(isAdmin ? [{ name: 'Painel Admin', path: '/admin', icon: <Lock size={20} /> }] : []),
  ];

  return (
    <>
      {/* Mobile Header / Menu Button */}
      <div className="md:hidden flex justify-between items-center p-4 bg-[#0E1B2B] border-b border-[#91A4B7]/20">
        <h1 className="text-xl font-bold text-[var(--primary-color)]">{shortName}</h1>
        <button onClick={() => setIsOpen(!isOpen)} className="text-[#F4F7FA] text-2xl">
          ☰
        </button>
      </div>

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#0E1B2B] border-r border-[#91A4B7]/20 transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 transition-transform duration-300 flex flex-col`}>
        <div className="p-6 hidden md:block">
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[var(--primary-color)] to-[var(--secondary-color)]">
            {companyName}
          </h1>
        </div>
        
        <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
          {menuItems.map((item) => (
            <Link 
              key={item.path} 
              href={item.path}
              onClick={() => setIsOpen(false)}
            >
              <div className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${pathname === item.path ? 'bg-[var(--primary-color)]/10 text-[var(--primary-color)] border border-[var(--primary-color)]/20' : 'text-[#91A4B7] hover:bg-[#07111F] hover:text-[#F4F7FA]'}`}>
                <span className="flex items-center justify-center opacity-80">{item.icon}</span>
                <span className="font-medium">{item.name}</span>
              </div>
            </Link>
          ))}
        </nav>
        
        <div className="p-4 border-t border-[#91A4B7]/20">
          <Link href="/configuracoes">
            <div className={`flex items-center gap-3 px-4 py-3 w-full rounded-xl transition-colors ${pathname === '/configuracoes' ? 'bg-[var(--primary-color)]/10 text-[var(--primary-color)] border border-[var(--primary-color)]/20' : 'text-[#91A4B7] hover:bg-[#07111F] hover:text-[#F4F7FA]'}`}>
              <span className="flex items-center justify-center opacity-80"><Settings size={20} /></span>
              <span className="font-medium">Configurações</span>
            </div>
          </Link>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-red-400 hover:bg-red-400/10 transition-colors mt-2"
          >
            <span className="flex items-center justify-center opacity-80"><LogOut size={20} /></span>
            <span className="font-medium">Sair</span>
          </button>
        </div>
      </div>
      
      {/* Overlay mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
