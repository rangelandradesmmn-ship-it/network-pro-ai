"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase';

export default function Configuracoes() {
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  
  const [tenantSettings, setTenantSettings] = useState({
    company_name: 'NETWORK PRO AI', primary_color: '#00AEEF', secondary_color: '#00E5FF',
    commission_level_1: 20, commission_level_2: 10, commission_level_3: 20
  });
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();

        if (data) {
          setProfile(data);
          setAvatarUrl(data.avatar_url);

          if (data.role === 'ADMIN' || data.role === 'SUPER_ADMIN') {
            const { data: tData } = await supabase.from('tenant_settings').select('*').eq('tenant_id', user.id).single();
            if (tData) setTenantSettings(tData);
          }
        }
      } catch (error) {
        console.error("Erro ao carregar perfil", error);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  async function handleSaveTenantSettings() {
    setSavingSettings(true);
    try {
      const payload = {
        tenant_id: profile.id,
        company_name: tenantSettings.company_name,
        primary_color: tenantSettings.primary_color,
        secondary_color: tenantSettings.secondary_color,
        commission_level_1: Number(tenantSettings.commission_level_1),
        commission_level_2: Number(tenantSettings.commission_level_2),
        commission_level_3: Number(tenantSettings.commission_level_3),
        updated_at: new Date().toISOString()
      };
      
      const { error } = await supabase.from('tenant_settings').upsert(payload);
      if (error) throw error;
      alert('Configurações salvas com sucesso! Para ver a mudança das cores, recarregue a página.');
    } catch (e: any) {
      console.error(e);
      alert('Erro ao salvar as configurações: ' + (e.message || JSON.stringify(e)));
    } finally {
      setSavingSettings(false);
    }
  }

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
    return <div className="min-h-screen bg-[#07111F] text-[var(--primary-color)] flex justify-center items-center">Carregando...</div>;
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
              className="w-32 h-32 rounded-full border-4 border-[var(--primary-color)] object-cover"
            />
            <div>
              <label className="cursor-pointer bg-[var(--primary-color)] hover:bg-[var(--secondary-color)] text-[#07111F] px-4 py-2 rounded-lg font-bold transition-colors">
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

      {profile?.role === 'ADMIN' && (
        <div className="mt-8 bg-[#0E1B2B] p-8 rounded-2xl border border-purple-500/30 shadow-lg shadow-purple-500/10 max-w-2xl">
          <h2 className="text-xl font-bold text-purple-400 mb-2">White Label (Configurações da Empresa)</h2>
          <p className="text-sm text-[#91A4B7] mb-6">Personalize as cores, nome e comissões da sua rede. Isso refletirá para todos os seus indicados.</p>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-[#91A4B7] mb-1">Nome da Empresa / Projeto</label>
              <input type="text" value={tenantSettings.company_name} onChange={e => setTenantSettings({...tenantSettings, company_name: e.target.value})} className="w-full bg-[#07111F] border border-[#91A4B7]/30 rounded p-3 text-white outline-none focus:border-purple-400" />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-[#91A4B7] mb-1">Cor Primária (Hex)</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={tenantSettings.primary_color} onChange={e => setTenantSettings({...tenantSettings, primary_color: e.target.value})} className="w-10 h-10 rounded cursor-pointer bg-transparent border-0" />
                  <input type="text" value={tenantSettings.primary_color} onChange={e => setTenantSettings({...tenantSettings, primary_color: e.target.value})} className="w-full bg-[#07111F] border border-[#91A4B7]/30 rounded p-2 text-white outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-[#91A4B7] mb-1">Cor Secundária (Hex)</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={tenantSettings.secondary_color} onChange={e => setTenantSettings({...tenantSettings, secondary_color: e.target.value})} className="w-10 h-10 rounded cursor-pointer bg-transparent border-0" />
                  <input type="text" value={tenantSettings.secondary_color} onChange={e => setTenantSettings({...tenantSettings, secondary_color: e.target.value})} className="w-full bg-[#07111F] border border-[#91A4B7]/30 rounded p-2 text-white outline-none" />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-md font-bold text-white mt-4 mb-2">Comissões (em Milhas)</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#91A4B7] mb-1">Nível 1 (Diretos)</label>
                  <input type="number" value={tenantSettings.commission_level_1} onChange={e => setTenantSettings({...tenantSettings, commission_level_1: Number(e.target.value)})} className="w-full bg-[#07111F] border border-[#91A4B7]/30 rounded p-2 text-white outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#91A4B7] mb-1">Nível 2</label>
                  <input type="number" value={tenantSettings.commission_level_2} onChange={e => setTenantSettings({...tenantSettings, commission_level_2: Number(e.target.value)})} className="w-full bg-[#07111F] border border-[#91A4B7]/30 rounded p-2 text-white outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#91A4B7] mb-1">Nível 3</label>
                  <input type="number" value={tenantSettings.commission_level_3} onChange={e => setTenantSettings({...tenantSettings, commission_level_3: Number(e.target.value)})} className="w-full bg-[#07111F] border border-[#91A4B7]/30 rounded p-2 text-white outline-none" />
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button onClick={handleSaveTenantSettings} disabled={savingSettings} className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 px-6 rounded-lg transition-colors disabled:opacity-50">
                {savingSettings ? 'Salvando...' : 'Salvar Configurações da Empresa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
