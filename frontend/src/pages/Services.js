import React, { useEffect, useState, useMemo } from 'react';
import { Layout } from '@/components/layout/Layout';
import { api } from '@/utils/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Search, Wrench } from 'lucide-react';

export default function Services() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '', default_price: '' });
  const [searchTerm, setSearchTerm] = useState('');

  const filteredServices = useMemo(() => {
    if (!searchTerm.trim()) return services;
    const term = searchTerm.toLowerCase();
    return services.filter((service) =>
      service.name.toLowerCase().includes(term) ||
      (service.description && service.description.toLowerCase().includes(term))
    );
  }, [services, searchTerm]);

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    try {
      const response = await api.getServices();
      setServices(response.data);
    } catch (error) {
      toast.error('Erro ao carregar serviços');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = { ...formData, default_price: parseFloat(formData.default_price) };
      if (editingService) {
        await api.updateService(editingService.id, data);
        toast.success('Serviço atualizado com sucesso!');
      } else {
        await api.createService(data);
        toast.success('Serviço criado com sucesso!');
      }
      setDialogOpen(false);
      resetForm();
      loadServices();
    } catch (error) {
      toast.error('Erro ao salvar serviço');
    }
  };

  const handleEdit = (service) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      description: service.description || '',
      default_price: service.default_price,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir este serviço?')) {
      try {
        await api.deleteService(id);
        toast.success('Serviço excluído com sucesso!');
        loadServices();
      } catch (error) {
        toast.error('Erro ao excluir serviço');
      }
    }
  };

  const resetForm = () => {
    setEditingService(null);
    setFormData({ name: '', description: '', default_price: '' });
  };

  return (
    <Layout>
      <div data-testid="services-page">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
          <div>
            <h1 className="text-4xl font-heading font-bold uppercase tracking-tight text-zinc-50">
              SERVIÇOS
            </h1>
            <p className="text-zinc-400 text-sm mt-1">Gerencie os serviços oferecidos</p>
          </div>
          <Button
            onClick={() => { resetForm(); setDialogOpen(true); }}
            className="bg-red-600 hover:bg-red-700 text-white font-bold uppercase tracking-wide rounded-sm h-10 px-6 active:scale-95"
            data-testid="add-service-button"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Serviço
          </Button>
        </div>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome ou descrição..."
              className="pl-10 bg-zinc-950 border-zinc-800 focus:border-red-600 focus:ring-1 focus:ring-red-600 rounded-sm"
              data-testid="services-search-input"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-full text-center py-12 text-zinc-500">Carregando...</div>
          ) : filteredServices.length === 0 ? (
            <div className="col-span-full text-center py-12 text-zinc-500">
              {searchTerm ? 'Nenhum serviço encontrado para esta busca' : 'Nenhum serviço encontrado'}
            </div>
          ) : (
            filteredServices.map((service) => (
              <div
                key={service.id}
                className="bg-zinc-900 border border-zinc-800 rounded-sm p-5 hover:border-zinc-700 transition-colors"
                data-testid={`service-card-${service.id}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-heading font-bold uppercase text-zinc-50">
                    {service.name}
                  </h3>
                  <div className="flex gap-1">
                    <Button
                      onClick={() => handleEdit(service)}
                      variant="ghost"
                      size="sm"
                      className="hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-sm p-1 h-auto"
                      data-testid={`edit-service-${service.id}`}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => handleDelete(service.id)}
                      variant="ghost"
                      size="sm"
                      className="hover:bg-red-950 text-red-400 hover:text-red-300 rounded-sm p-1 h-auto"
                      data-testid={`delete-service-${service.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                {service.description && (
                  <p className="text-sm text-zinc-400 mb-3">{service.description}</p>
                )}
                <div className="text-2xl font-mono font-bold text-red-600">
                  R$ {service.default_price.toFixed(2)}
                </div>
              </div>
            ))
          )}
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-50" data-testid="service-dialog">
            <DialogHeader>
              <DialogTitle className="text-xl font-heading font-bold uppercase">
                {editingService ? 'EDITAR SERVIÇO' : 'NOVO SERVIÇO'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-xs font-semibold uppercase text-zinc-500">Nome *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="bg-zinc-950 border-zinc-800 focus:border-red-600 rounded-sm"
                    data-testid="service-name-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-xs font-semibold uppercase text-zinc-500">Descrição</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="bg-zinc-950 border-zinc-800 focus:border-red-600 rounded-sm"
                    rows={3}
                    data-testid="service-description-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price" className="text-xs font-semibold uppercase text-zinc-500">Preço Padrão *</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={formData.default_price}
                    onChange={(e) => setFormData({ ...formData, default_price: e.target.value })}
                    required
                    className="bg-zinc-950 border-zinc-800 focus:border-red-600 rounded-sm font-mono"
                    data-testid="service-price-input"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => { setDialogOpen(false); resetForm(); }} className="border border-zinc-700 hover:border-zinc-500 text-white rounded-sm" data-testid="cancel-button">
                  Cancelar
                </Button>
                <Button type="submit" className="bg-red-600 hover:bg-red-700 text-white font-bold uppercase rounded-sm active:scale-95" data-testid="save-service-button">
                  {editingService ? 'ATUALIZAR' : 'CRIAR'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}