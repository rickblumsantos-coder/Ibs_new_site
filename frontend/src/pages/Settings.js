import React, { useEffect, useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { api } from '@/utils/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Save } from 'lucide-react';

export default function Settings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    workshop_name: 'IBS Auto Center',
    logo_url: '',
    whatsapp: '',
    email: '',
    email_api_key: '',
    address: '',
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await api.getSettings();
      setFormData(response.data);
    } catch (error) {
      toast.error('Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if ((formData.logo_url || '').startsWith('blob:')) {
      toast.error('URL blob nao funciona no PDF. Use link direto da imagem (https://...).');
      return;
    }
    setSaving(true);
    try {
      await api.updateSettings(formData);
      toast.success('Configurações salvas com sucesso!');
    } catch (error) {
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="text-zinc-400">Carregando...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div data-testid="settings-page">
        <div className="mb-8">
          <h1 className="text-4xl font-heading font-bold uppercase tracking-tight text-zinc-50">
            CONFIGURAÇÕES
          </h1>
          <p className="text-zinc-400 text-sm mt-1">Configure as informações da oficina</p>
        </div>

        <div className="max-w-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-sm p-6">
              <h2 className="text-lg font-heading font-bold uppercase text-zinc-50 mb-4">
                Informações Gerais
              </h2>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="workshop_name" className="text-xs font-semibold uppercase text-zinc-500">
                    Nome da Oficina *
                  </Label>
                  <Input
                    id="workshop_name"
                    value={formData.workshop_name}
                    onChange={(e) => setFormData({ ...formData, workshop_name: e.target.value })}
                    required
                    className="bg-zinc-950 border-zinc-800 focus:border-red-600 rounded-sm"
                    data-testid="workshop-name-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address" className="text-xs font-semibold uppercase text-zinc-500">
                    Endereço
                  </Label>
                  <Textarea
                    id="address"
                    value={formData.address || ''}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="bg-zinc-950 border-zinc-800 focus:border-red-600 rounded-sm"
                    rows={3}
                    data-testid="address-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="logo_url" className="text-xs font-semibold uppercase text-zinc-500">
                    Logo (URL)
                  </Label>
                  <Input
                    id="logo_url"
                    value={formData.logo_url || ''}
                    onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                    placeholder="https://exemplo.com/minha-logo.png"
                    className="bg-zinc-950 border-zinc-800 focus:border-red-600 rounded-sm"
                    data-testid="logo-url-input"
                  />
                  <p className="text-xs text-zinc-600">
                    Use URL direta da imagem (https://...). Link blob do WhatsApp Web nao funciona.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-sm p-6">
              <h2 className="text-lg font-heading font-bold uppercase text-zinc-50 mb-4">
                Contato
              </h2>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="whatsapp" className="text-xs font-semibold uppercase text-zinc-500">
                    WhatsApp
                  </Label>
                  <Input
                    id="whatsapp"
                    value={formData.whatsapp || ''}
                    onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                    placeholder="Ex: 5511999999999"
                    className="bg-zinc-950 border-zinc-800 focus:border-red-600 rounded-sm font-mono"
                    data-testid="whatsapp-input"
                  />
                  <p className="text-xs text-zinc-600">
                    Número com código do país (sem símbolos). Ex: 5511999999999
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-xs font-semibold uppercase text-zinc-500">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="contato@ibsautocenter.com"
                    className="bg-zinc-950 border-zinc-800 focus:border-red-600 rounded-sm"
                    data-testid="email-input"
                  />
                </div>
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-sm p-6">
              <h2 className="text-lg font-heading font-bold uppercase text-zinc-50 mb-4">
                Integração de Email
              </h2>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email_api_key" className="text-xs font-semibold uppercase text-zinc-500">
                    Chave da API de Email
                  </Label>
                  <Input
                    id="email_api_key"
                    type="password"
                    value={formData.email_api_key || ''}
                    onChange={(e) => setFormData({ ...formData, email_api_key: e.target.value })}
                    placeholder="Cole aqui sua chave da API (Resend, SendGrid, etc.)"
                    className="bg-zinc-950 border-zinc-800 focus:border-red-600 rounded-sm font-mono"
                    data-testid="email-api-key-input"
                  />
                  <p className="text-xs text-zinc-600">
                    Configure futuramente para envio automático de notificações por email
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={saving}
                className="bg-red-600 hover:bg-red-700 text-white font-bold uppercase tracking-wide rounded-sm h-10 px-6 active:scale-95"
                data-testid="save-settings-button"
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'SALVANDO...' : 'SALVAR CONFIGURAÇÕES'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}
