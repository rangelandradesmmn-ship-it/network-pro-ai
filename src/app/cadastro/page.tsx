"use client";
import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/utils/supabase';

function CadastroForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [sponsorCode, setSponsorCode] = useState('');
  
  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Handle ?ref= code from URL
  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref) {
      setSponsorCode(ref);
      localStorage.setItem('np_sponsor', ref);
    } else {
      const savedRef = localStorage.getItem('np_sponsor');
      if (savedRef) setSponsorCode(savedRef);
    }
  }, [searchParams]);

  const handleCadastro = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (password !== confirmPassword) {
      return setError('As senhas não coincidem.');
    }
    if (!sponsorCode) {
      return setError('O código do patrocinador é obrigatório no Network Pro AI.');
    }

    setLoading(true);

    try {
      // 1. Criar usuário no Auth do Supabase
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name, phone: phone }
        }
      });

      if (authError) throw authError;

      // 2. Chamar nossa API Backend para posicionar o usuário na Matriz do Patrocinador (Spillover)
      if (authData.user) {
        const response = await fetch('/api/place-member', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            newUserId: authData.user.id,
            email: email,
            name: name,
            phone: phone,
            sponsorCode: sponsorCode
          })
        });
        
        const result = await response.json();
        if (!result.success) throw new Error(result.error || 'Erro ao posicionar na matriz');
      }

      alert('Conta criada com sucesso! Bem-vindo(a) à sua matriz.');
      router.push('/dashboard');

    } catch (err: any) {
      setError(err.message || 'Erro inesperado ao criar conta.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 bg-[#07111F]">
      <Link href="/">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[var(--primary-color)] to-[var(--secondary-color)] mb-8">
          NETWORK PRO AI
        </h1>
      </Link>
      
      <div className="w-full max-w-md bg-[#0E1B2B] p-8 rounded-2xl border border-[#91A4B7]/20 shadow-2xl">
        <h2 className="text-2xl font-bold text-white mb-6">Criar Conta</h2>
        
        {sponsorCode && (
          <div className="mb-6 p-3 bg-[var(--primary-color)]/10 border border-[var(--primary-color)]/30 rounded-lg text-sm text-[var(--primary-color)]">
            Você foi convidado por: <span className="font-bold">{sponsorCode}</span>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleCadastro}>
          <div>
            <label className="block text-sm font-medium text-[#91A4B7] mb-1">Nome Completo</label>
            <input type="text" required value={name} onChange={e => setName(e.target.value)} className="w-full bg-[#07111F] border border-[#91A4B7]/30 rounded-lg p-3 text-white focus:border-[var(--primary-color)] focus:outline-none transition-colors" placeholder="Ex: João da Silva" />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#91A4B7] mb-1">E-mail</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-[#07111F] border border-[#91A4B7]/30 rounded-lg p-3 text-white focus:border-[var(--primary-color)] focus:outline-none transition-colors" placeholder="joao@exemplo.com" />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#91A4B7] mb-1">WhatsApp</label>
            <input type="tel" required value={phone} onChange={e => setPhone(e.target.value)} className="w-full bg-[#07111F] border border-[#91A4B7]/30 rounded-lg p-3 text-white focus:border-[var(--primary-color)] focus:outline-none transition-colors" placeholder="(11) 99999-9999" />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#91A4B7] mb-1">Código do Patrocinador</label>
            <input type="text" required value={sponsorCode} onChange={e => setSponsorCode(e.target.value)} className="w-full bg-[#07111F] border border-[#91A4B7]/30 rounded-lg p-3 text-white focus:border-[var(--primary-color)] focus:outline-none transition-colors" placeholder="Ex: NP123456" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#91A4B7] mb-1">Senha</label>
              <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-[#07111F] border border-[#91A4B7]/30 rounded-lg p-3 text-white focus:border-[var(--primary-color)] focus:outline-none transition-colors" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#91A4B7] mb-1">Confirmar Senha</label>
              <input type="password" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full bg-[#07111F] border border-[#91A4B7]/30 rounded-lg p-3 text-white focus:border-[var(--primary-color)] focus:outline-none transition-colors" />
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full py-4 mt-6 bg-gradient-to-r from-[var(--primary-color)] to-[var(--secondary-color)] hover:from-[var(--secondary-color)] hover:to-[#00E89D] text-[#07111F] font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(0,174,239,0.3)] disabled:opacity-50">
            {loading ? 'PROCESSANDO...' : 'FINALIZAR CADASTRO'}
          </button>
        </form>
        
        <p className="mt-6 text-center text-sm text-[#91A4B7]">
          Já possui uma conta? <Link href="/login" className="text-[var(--primary-color)] hover:underline">Entrar</Link>
        </p>
      </div>
    </div>
  );
}

export default function Cadastro() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#07111F] flex items-center justify-center text-[var(--primary-color)]">Carregando...</div>}>
      <CadastroForm />
    </Suspense>
  );
}
