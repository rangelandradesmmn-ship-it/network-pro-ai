"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase';

export default function Configuracoes() {
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    async function loadProfile() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (data) {
          setProfile(data);
          setAvatarUrl(data.avatar_url);
        }
      } catch (error) {
        console.error("Erro ao carregar perfil", error);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  async function uploadAvatar(event: React.ChangeEvent<HTMLInputElement>) {
    try {
      setUploading(true);
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('Você deve selecionar uma imagem.');
      }

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile.id}-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      // Upload the file to Supabase storage 'avatars' bucket
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      
      if (data.publicUrl) {
        // Update profile in database
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ avatar_url: data.publicUrl })
          .eq('id', profile.id);

        if (updateError) throw updateError;
        
        setAvatarUrl(data.publicUrl);
        alert('Avatar atualizado com sucesso!');
      }

    } catch (error: any) {
      alert('Erro ao fazer upload da imagem: ' + error.message);
    } finally {
      setUploading(false);
    }
  }

  if (loading) {
    return <div className="min-h-screen bg-[#07111F] text-[#00AEEF] flex justify-center items-center">Carregando...</div>;
  }

  return (
    <div className="min-h-screen bg-[#07111F] text-[#F4F7FA] p-8">
      <h2 className="text-2xl font-bold text-white mb-6">Configurações do Perfil</h2>

      <div className="bg-[#0E1B2B] p-8 rounded-2xl border border-[#91A4B7]/20 shadow-lg max-w-2xl">
        <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
          
          <div className="flex flex-col items-center gap-4">
            <img 
              src={avatarUrl || "https://i.pravatar.cc/150?u=admin"} 
              alt="Avatar" 
              className="w-32 h-32 rounded-full border-4 border-[#00AEEF] object-cover"
            />
            <div>
              <label className="cursor-pointer bg-[#00AEEF] hover:bg-[#00E5FF] text-[#07111F] px-4 py-2 rounded-lg font-bold transition-colors">
                {uploading ? 'Enviando...' : 'Mudar Foto'}
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={uploadAvatar} 
                  disabled={uploading}
                  className="hidden" 
                />
              </label>
            </div>
          </div>

          <div className="flex-1 w-full space-y-4">
            <div>
              <label className="block text-sm text-[#91A4B7] mb-1">Nome Completo</label>
              <input type="text" readOnly value={profile?.name || ''} className="w-full bg-[#07111F] border border-[#91A4B7]/30 rounded p-3 text-white opacity-70" />
            </div>
            <div>
              <label className="block text-sm text-[#91A4B7] mb-1">E-mail</label>
              <input type="email" readOnly value={profile?.email || ''} className="w-full bg-[#07111F] border border-[#91A4B7]/30 rounded p-3 text-white opacity-70" />
            </div>
            <div>
              <label className="block text-sm text-[#91A4B7] mb-1">WhatsApp</label>
              <input type="text" readOnly value={profile?.phone || ''} className="w-full bg-[#07111F] border border-[#91A4B7]/30 rounded p-3 text-white opacity-70" />
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
