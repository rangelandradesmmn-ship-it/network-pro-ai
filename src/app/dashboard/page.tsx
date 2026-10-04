"use client";
import QRCode from "react-qr-code";
import React, { useState } from 'react';

export default function Dashboard() {
  const [showQR, setShowQR] = useState(false);
  const referralLink = "https://networkpro.ai/cadastro?ref=NP123456";

  return (
    <div className="min-h-screen bg-[#07111F] text-[#F4F7FA] p-8">
      <header className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#00AEEF] to-[#00E5FF]">
            NETWORK PRO AI
          </h1>
          <p className="text-[#91A4B7] mt-1">Bem-vindo(a) de volta, João Silva</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm text-[#91A4B7]">ID: NP123456</p>
            <p className="font-bold text-[#00E89D]">Status: Ativo</p>
          </div>
          <img src="https://i.pravatar.cc/150?u=admin" alt="Perfil" className="w-12 h-12 rounded-full border-2 border-[#00AEEF]" />
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-[#0E1B2B] p-6 rounded-2xl border border-[#91A4B7]/20 shadow-lg">
          <h3 className="text-[#91A4B7] mb-2 font-semibold">Total de Milhas</h3>
          <p className="text-4xl font-bold text-[#00E89D]">2.450</p>
          <p className="text-sm mt-2 text-[#91A4B7]">+120 milhas hoje</p>
        </div>
        
        <div className="bg-[#0E1B2B] p-6 rounded-2xl border border-[#91A4B7]/20 shadow-lg flex flex-col justify-between">
          {!showQR ? (
            <>
              <div>
                <h3 className="text-[#91A4B7] mb-2 font-semibold">Seu Link de Indicação</h3>
                <p className="text-lg font-mono text-[#00AEEF] bg-[#07111F] p-2 rounded-lg truncate">
                  {referralLink}
                </p>
              </div>
              <div className="flex gap-2 mt-4">
                <button 
                  onClick={() => navigator.clipboard.writeText(referralLink)}
                  className="flex-1 bg-[#00AEEF] hover:bg-[#00E5FF] text-[#07111F] font-bold py-2 rounded-lg transition-colors"
                >
                  Copiar
                </button>
                <button 
                  onClick={() => setShowQR(true)}
                  className="flex-1 bg-[#0E1B2B] border border-[#00AEEF] hover:bg-[#00AEEF]/20 text-[#00AEEF] font-bold py-2 rounded-lg transition-colors"
                >
                  QR Code
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="bg-white p-2 rounded-lg mb-4">
                 <QRCode value={referralLink} size={120} />
              </div>
              <button 
                onClick={() => setShowQR(false)}
                className="w-full bg-[#0E1B2B] border border-[#91A4B7] text-[#91A4B7] hover:text-white hover:border-white py-1 rounded transition-colors text-sm"
              >
                Voltar
              </button>
            </div>
          )}
        </div>

        <div className="bg-[#0E1B2B] p-6 rounded-2xl border border-[#91A4B7]/20 shadow-lg">
          <h3 className="text-[#91A4B7] mb-2 font-semibold">Matriz Atual: #002</h3>
          <div className="flex justify-between items-end mb-2">
            <p className="text-3xl font-bold text-white">87 <span className="text-lg text-[#91A4B7]">/ 155</span></p>
            <p className="text-[#00E5FF] font-bold">56%</p>
          </div>
          <div className="w-full bg-[#07111F] rounded-full h-3 mb-4 overflow-hidden">
            <div className="bg-gradient-to-r from-[#00AEEF] to-[#00E5FF] h-3 rounded-full" style={{ width: '56%' }}></div>
          </div>
          <div className="flex justify-between text-xs text-[#91A4B7]">
            <span>N1: 5/5</span>
            <span>N2: 25/25</span>
            <span>N3: 57/125</span>
          </div>
        </div>
      </div>
    </div>
  );
}
