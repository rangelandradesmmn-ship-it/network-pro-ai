"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Erro ao realizar login.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 bg-[var(--bg-color)]">
      <Link href="/">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[var(--primary-color)] to-[var(--secondary-color)] mb-8">
          NETWORK PRO AI
        </h1>
      </Link>
      
      <div className="w-full max-w-md bg-[var(--panel-color)] p-8 rounded-2xl border border-[#91A4B7]/20 shadow-2xl">
        <h2 className="text-2xl font-bold text-white mb-6">Acessar Conta</h2>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleLogin}>
          <div>
            <label className="block text-sm font-medium text-[#91A4B7] mb-1">E-mail</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-[var(--bg-color)] border border-[#91A4B7]/30 rounded-lg p-3 text-white focus:border-[var(--primary-color)] focus:outline-none transition-colors" placeholder="joao@exemplo.com" />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#91A4B7] mb-1">Senha</label>
            <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-[var(--bg-color)] border border-[#91A4B7]/30 rounded-lg p-3 text-white focus:border-[var(--primary-color)] focus:outline-none transition-colors" />
          </div>

          <div className="flex justify-end">
            <a href="#" className="text-sm text-[#91A4B7] hover:text-[var(--primary-color)]">Esqueceu a senha?</a>
          </div>

          <button type="submit" disabled={loading} className="w-full py-4 mt-4 bg-gradient-to-r from-[var(--primary-color)] to-[var(--secondary-color)] hover:from-[var(--secondary-color)] hover:to-[#00E89D] text-[var(--bg-color)] font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(0,174,239,0.3)] disabled:opacity-50">
            {loading ? 'ENTRANDO...' : 'ENTRAR NO SISTEMA'}
          </button>
        </form>
        
        <p className="mt-6 text-center text-sm text-[#91A4B7]">
          Ainda não faz parte? <Link href="/cadastro" className="text-[var(--primary-color)] hover:underline">Criar Conta</Link>
        </p>
      </div>
    </div>
  );
}
