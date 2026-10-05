import React from 'react';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center">
      <div className="max-w-3xl">
        <h1 className="text-5xl md:text-7xl font-extrabold mb-6 tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-[var(--primary-color)] to-[#00E89D]">
          NETWORK PRO AI
        </h1>
        <p className="text-xl md:text-2xl text-[#91A4B7] mb-10 leading-relaxed">
          A plataforma mais inteligente de gerenciamento de rede de indicações.
          Crie sua matriz 5x3, acumule milhas e expanda seu time com o poder do Spillover automático.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/cadastro">
            <button className="w-full sm:w-auto px-8 py-4 bg-[var(--primary-color)] hover:bg-[var(--secondary-color)] text-[#07111F] font-bold text-lg rounded-xl shadow-[0_0_20px_rgba(0,174,239,0.4)] transition-all transform hover:scale-105">
              CRIAR CONTA
            </button>
          </Link>
          <Link href="/dashboard">
            <button className="w-full sm:w-auto px-8 py-4 bg-transparent border-2 border-[var(--primary-color)] text-[var(--primary-color)] hover:bg-[var(--primary-color)]/10 font-bold text-lg rounded-xl transition-all">
              ENTRAR
            </button>
          </Link>
        </div>
      </div>

      {/* Decorative Matrix Background Concept */}
      <div className="absolute inset-0 -z-10 overflow-hidden opacity-20 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[var(--primary-color)] rounded-full mix-blend-screen filter blur-[128px]"></div>
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-[#00E89D] rounded-full mix-blend-screen filter blur-[128px]"></div>
      </div>
    </div>
  );
}
