import React, { useEffect, useState, useMemo } from 'react';
import { Layout } from '@/components/layout/Layout';
import { api } from '@/utils/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Search, History } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyClient, setHistoryClient] = useState(null);
  const [historyData, setHistoryData] = useState({ quotes: [], appointments: [] });
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    cpf: '',
    address: '',
  });

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      const response = await api.getClients();
      setClients(response.data);
    } catch (error) {
      toast.error('Erro ao carregar clientes');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingClient) {
        await api.updateClient(editingClient.id, formData);
        toast.success('Cliente atualizado com sucesso!');
      } else {
        await api.createClient(formData);
        toast.success('Cliente criado com sucesso!');
      }
      setDialogOpen(false);
      resetForm();
      loadClients();
    } catch (error) {
      toast.error('Erro ao salvar cliente');
    }
  };

  const handleEdit = (client) => {
    setEditingClient(client);
    setFormData({
      name: client.name,
      phone: client.phone,
      email: client.email || '',
      cpf: client.cpf || '',
      address: client.address || '',
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir este cliente?')) {
      try {
        await api.deleteClient(id);
        toast.success('Cliente excluído com sucesso!');
        loadClients();
      } catch (error) {
        toast.error('Erro ao excluir cliente');
      }
    }
  };

  const handleOpenHistory = async (client) => {
    setHistoryClient(client);
    setHistoryDialogOpen(true);
    setHistoryLoading(true);
    try {
      const [quotesRes, appointmentsRes, vehiclesRes] = await Promise.all([
        api.getQuotes(),
        api.getAppointments(),
        api.getVehicles(),
      ]);

      const vehiclesById = vehiclesRes.data.reduce((acc, vehicle) => {
        acc[vehicle.id] = vehicle;
        return acc;
      }, {});

      const quotes = quotesRes.data
        .filter((quote) => quote.client_id === client.id)
        .map((quote) => ({
          ...quote,
          vehicle_label: vehiclesById[quote.vehicle_id]
            ? `${vehiclesById[quote.vehicle_id].brand} ${vehiclesById[quote.vehicle_id].model} - ${vehiclesById[quote.vehicle_id].license_plate}`
            : 'N/A',
        }))
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      const appointments = appointmentsRes.data
        .filter((apt) => apt.client_id === client.id)
        .map((apt) => ({
          ...apt,
          vehicle_label: vehiclesById[apt.vehicle_id]
            ? `${vehiclesById[apt.vehicle_id].brand} ${vehiclesById[apt.vehicle_id].model} - ${vehiclesById[apt.vehicle_id].license_plate}`
            : 'N/A',
        }))
        .sort((a, b) => new Date(b.appointment_date) - new Date(a.appointment_date));

      setHistoryData({ quotes, appointments });
    } catch (error) {
      toast.error('Erro ao carregar histórico do cliente');
    } finally {
      setHistoryLoading(false);
    }
  };

  const resetForm = () => {
    setEditingClient(null);
    setFormData({ name: '', phone: '', email: '', cpf: '', address: '' });
  };

  const filteredClients = useMemo(
    () => clients.filter((client) =>
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (client.phone || '').includes(searchTerm) ||
      (client.email && client.email.toLowerCase().includes(searchTerm.toLowerCase()))
    ),
    [clients, searchTerm]
  );

  return (
    <Layout>
      <div data-testid="clients-page">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
          <div>
            <h1 className="text-4xl font-heading font-bold uppercase tracking-tight text-zinc-50">
              CLIENTES
            </h1>
            <p className="text-zinc-400 text-sm mt-1">Gerencie os clientes da oficina</p>
          </div>
          <Button
            onClick={() => {
              resetForm();
              setDialogOpen(true);
            }}
            className="bg-red-600 hover:bg-red-700 text-white font-bold uppercase tracking-wide rounded-sm h-10 px-6 active:scale-95"
            data-testid="add-client-button"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Cliente
          </Button>
        </div>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome, telefone ou email..."
              className="pl-10 bg-zinc-950 border-zinc-800 focus:border-red-600 focus:ring-1 focus:ring-red-600 rounded-sm"
              data-testid="search-input"
            />
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-sm overflow-hidden">
          {loading ? (
            <div className="text-center py-12 text-zinc-500">Carregando...</div>
          ) : filteredClients.length === 0 ? (
            <div className="text-center py-12 text-zinc-500">Nenhum cliente encontrado</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full" data-testid="clients-table">
                <thead>
                  <tr className="bg-zinc-900/50 text-zinc-400 uppercase text-xs font-bold tracking-wider h-10">
                    <th className="text-left px-4">Nome</th>
                    <th className="text-left px-4">Telefone</th>
                    <th className="text-left px-4">Email</th>
                    <th className="text-left px-4">CPF</th>
                    <th className="text-right px-4">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClients.map((client) => (
                    <tr
                      key={client.id}
                      className="border-b border-zinc-800 hover:bg-zinc-900/50 transition-colors h-12"
                    >
                      <td className="text-sm text-zinc-200 px-4">{client.name}</td>
                      <td className="text-sm text-zinc-200 px-4 font-mono">{client.phone || '-'}</td>
                      <td className="text-sm text-zinc-200 px-4">{client.email || '-'}</td>
                      <td className="text-sm text-zinc-200 px-4 font-mono">{client.cpf || '-'}</td>
                      <td className="px-4">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            onClick={() => handleOpenHistory(client)}
                            variant="ghost"
                            size="sm"
                            className="hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-sm"
                            data-testid={`history-client-${client.id}`}
                          >
                            <History className="w-4 h-4" />
                          </Button>
                          <Button
                            onClick={() => handleEdit(client)}
                            variant="ghost"
                            size="sm"
                            className="hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-sm"
                            data-testid={`edit-client-${client.id}`}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            onClick={() => handleDelete(client.id)}
                            variant="ghost"
                            size="sm"
                            className="hover:bg-red-950 text-red-400 hover:text-red-300 rounded-sm"
                            data-testid={`delete-client-${client.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-50" data-testid="client-dialog">
            <DialogHeader>
              <DialogTitle className="text-xl font-heading font-bold uppercase">
                {editingClient ? 'EDITAR CLIENTE' : 'NOVO CLIENTE'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-xs font-semibold uppercase text-zinc-500">
                    Nome *
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="bg-zinc-950 border-zinc-800 focus:border-red-600 rounded-sm"
                    data-testid="client-name-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-xs font-semibold uppercase text-zinc-500">
                    Telefone
                  </Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="bg-zinc-950 border-zinc-800 focus:border-red-600 rounded-sm"
                    data-testid="client-phone-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-xs font-semibold uppercase text-zinc-500">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="bg-zinc-950 border-zinc-800 focus:border-red-600 rounded-sm"
                    data-testid="client-email-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cpf" className="text-xs font-semibold uppercase text-zinc-500">
                    CPF
                  </Label>
                  <Input
                    id="cpf"
                    value={formData.cpf}
                    onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                    className="bg-zinc-950 border-zinc-800 focus:border-red-600 rounded-sm"
                    data-testid="client-cpf-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address" className="text-xs font-semibold uppercase text-zinc-500">
                    Endereço
                  </Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="bg-zinc-950 border-zinc-800 focus:border-red-600 rounded-sm"
                    data-testid="client-address-input"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setDialogOpen(false);
                    resetForm();
                  }}
                  className="border border-zinc-700 hover:border-zinc-500 text-white rounded-sm"
                  data-testid="cancel-button"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="bg-red-600 hover:bg-red-700 text-white font-bold uppercase rounded-sm active:scale-95"
                  data-testid="save-client-button"
                >
                  {editingClient ? 'ATUALIZAR' : 'CRIAR'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
          <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-50 max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="client-history-dialog">
            <DialogHeader>
              <DialogTitle className="text-xl font-heading font-bold uppercase">
                HISTÓRICO {historyClient ? `• ${historyClient.name}` : ''}
              </DialogTitle>
            </DialogHeader>

            {historyLoading ? (
              <div className="text-center py-10 text-zinc-500">Carregando histórico...</div>
            ) : (
              <div className="space-y-6 py-2">
                <div className="border border-zinc-800 rounded-sm overflow-hidden">
                  <div className="px-4 py-3 bg-zinc-900/60 border-b border-zinc-800">
                    <h3 className="text-sm font-semibold uppercase text-zinc-300">
                      Orçamentos ({historyData.quotes.length})
                    </h3>
                  </div>
                  {historyData.quotes.length === 0 ? (
                    <div className="p-4 text-sm text-zinc-500">Nenhum orçamento para este cliente.</div>
                  ) : (
                    <div className="divide-y divide-zinc-800">
                      {historyData.quotes.map((quote) => (
                        <div key={quote.id} className="p-4">
                          <div className="flex items-center justify-between mb-1">
                            <div className="text-sm text-zinc-200 font-medium">
                              #{quote.id.substring(0, 8)} • {quote.vehicle_label}
                            </div>
                            <div className="text-xs text-zinc-500 font-mono">
                              {format(new Date(quote.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                            </div>
                          </div>
                          <div className="text-xs text-zinc-400 uppercase">
                            Status: {quote.status} • Total: R$ {quote.total.toFixed(2)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="border border-zinc-800 rounded-sm overflow-hidden">
                  <div className="px-4 py-3 bg-zinc-900/60 border-b border-zinc-800">
                    <h3 className="text-sm font-semibold uppercase text-zinc-300">
                      Agendamentos ({historyData.appointments.length})
                    </h3>
                  </div>
                  {historyData.appointments.length === 0 ? (
                    <div className="p-4 text-sm text-zinc-500">Nenhum agendamento para este cliente.</div>
                  ) : (
                    <div className="divide-y divide-zinc-800">
                      {historyData.appointments.map((apt) => (
                        <div key={apt.id} className="p-4">
                          <div className="flex items-center justify-between mb-1">
                            <div className="text-sm text-zinc-200 font-medium">{apt.vehicle_label}</div>
                            <div className="text-xs text-zinc-500 font-mono">
                              {format(new Date(apt.appointment_date), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                            </div>
                          </div>
                          <div className="text-xs text-zinc-400 uppercase">Status: {apt.status}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setHistoryDialogOpen(false)}
                className="border border-zinc-700 hover:border-zinc-500 text-white rounded-sm"
              >
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
