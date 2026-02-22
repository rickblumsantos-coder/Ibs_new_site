import React, { useEffect, useState, useCallback } from 'react';
import { Layout } from '@/components/layout/Layout';
import { api } from '@/utils/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Appointments() {
  const [appointments, setAppointments] = useState([]);
  const [clients, setClients] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [formData, setFormData] = useState({
    client_id: '',
    vehicle_id: '',
    appointment_date: '',
    status: 'scheduled',
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [appointmentsRes, clientsRes, vehiclesRes] = await Promise.all([
        api.getAppointments(),
        api.getClients(),
        api.getVehicles(),
      ]);
      setAppointments(appointmentsRes.data);
      setClients(clientsRes.data);
      setVehicles(vehiclesRes.data);
    } catch (error) {
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        ...formData,
        appointment_date: new Date(formData.appointment_date).toISOString(),
      };
      if (editingAppointment) {
        await api.updateAppointment(editingAppointment.id, data);
        toast.success('Agendamento atualizado com sucesso!');
      } else {
        await api.createAppointment(data);
        toast.success('Agendamento criado com sucesso!');
      }
      setDialogOpen(false);
      resetForm();
      loadData();
    } catch (error) {
      toast.error('Erro ao salvar agendamento');
    }
  };

  const handleEdit = (appointment) => {
    setEditingAppointment(appointment);
    setFormData({
      client_id: appointment.client_id,
      vehicle_id: appointment.vehicle_id,
      appointment_date: format(new Date(appointment.appointment_date), "yyyy-MM-dd'T'HH:mm"),
      status: appointment.status,
      notes: appointment.notes || '',
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir este agendamento?')) {
      try {
        await api.deleteAppointment(id);
        toast.success('Agendamento excluído com sucesso!');
        loadData();
      } catch (error) {
        toast.error('Erro ao excluir agendamento');
      }
    }
  };

  const resetForm = () => {
    setEditingAppointment(null);
    setFormData({
      client_id: '',
      vehicle_id: '',
      appointment_date: '',
      status: 'scheduled',
      notes: '',
    });
  };

  const getClientName = useCallback(
    (clientId) => {
      const client = clients.find((c) => c.id === clientId);
      return client ? client.name : 'N/A';
    },
    [clients]
  );

  const getVehicleInfo = useCallback(
    (vehicleId) => {
      const vehicle = vehicles.find((v) => v.id === vehicleId);
      return vehicle ? `${vehicle.brand} ${vehicle.model} - ${vehicle.license_plate}` : 'N/A';
    },
    [vehicles]
  );

  const getClientVehicles = useCallback(
    (clientId) => {
      return vehicles.filter((v) => v.client_id === clientId);
    },
    [vehicles]
  );

  const getStatusBadge = (status) => {
    const badges = {
      scheduled: 'bg-blue-950/30 text-blue-400 border-blue-900',
      confirmed: 'bg-green-950/30 text-green-400 border-green-900',
      completed: 'bg-zinc-800 text-zinc-400 border-zinc-700',
      cancelled: 'bg-red-950/30 text-red-400 border-red-900',
    };
    const labels = {
      scheduled: 'Agendado',
      confirmed: 'Confirmado',
      completed: 'Concluído',
      cancelled: 'Cancelado',
    };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-sm text-xs font-medium border ${badges[status]}`}>
        {labels[status]}
      </span>
    );
  };

  const sortedAppointments = [...appointments].sort((a, b) =>
    new Date(b.appointment_date) - new Date(a.appointment_date)
  );

  return (
    <Layout>
      <div data-testid="appointments-page">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
          <div>
            <h1 className="text-4xl font-heading font-bold uppercase tracking-tight text-zinc-50">
              AGENDAMENTOS
            </h1>
            <p className="text-zinc-400 text-sm mt-1">Gerencie os agendamentos da oficina</p>
          </div>
          <Button
            onClick={() => { resetForm(); setDialogOpen(true); }}
            className="bg-red-600 hover:bg-red-700 text-white font-bold uppercase tracking-wide rounded-sm h-10 px-6 active:scale-95"
            data-testid="add-appointment-button"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Agendamento
          </Button>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-sm overflow-hidden">
          {loading ? (
            <div className="text-center py-12 text-zinc-500">Carregando...</div>
          ) : sortedAppointments.length === 0 ? (
            <div className="text-center py-12 text-zinc-500">Nenhum agendamento encontrado</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full" data-testid="appointments-table">
                <thead>
                  <tr className="bg-zinc-900/50 text-zinc-400 uppercase text-xs font-bold tracking-wider h-10">
                    <th className="text-left px-4">Data/Hora</th>
                    <th className="text-left px-4">Cliente</th>
                    <th className="text-left px-4">Veículo</th>
                    <th className="text-left px-4">Status</th>
                    <th className="text-left px-4">Observações</th>
                    <th className="text-right px-4">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedAppointments.map((appointment) => (
                    <tr
                      key={appointment.id}
                      className="border-b border-zinc-800 hover:bg-zinc-900/50 transition-colors h-12"
                    >
                      <td className="text-sm text-zinc-200 px-4 font-mono">
                        {format(new Date(appointment.appointment_date), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                      </td>
                      <td className="text-sm text-zinc-200 px-4">{getClientName(appointment.client_id)}</td>
                      <td className="text-sm text-zinc-200 px-4 font-mono">{getVehicleInfo(appointment.vehicle_id)}</td>
                      <td className="px-4">{getStatusBadge(appointment.status)}</td>
                      <td className="text-sm text-zinc-400 px-4 max-w-xs truncate">{appointment.notes || '-'}</td>
                      <td className="px-4">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            onClick={() => handleEdit(appointment)}
                            variant="ghost"
                            size="sm"
                            className="hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-sm"
                            data-testid={`edit-appointment-${appointment.id}`}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            onClick={() => handleDelete(appointment.id)}
                            variant="ghost"
                            size="sm"
                            className="hover:bg-red-950 text-red-400 hover:text-red-300 rounded-sm"
                            data-testid={`delete-appointment-${appointment.id}`}
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
          <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-50 max-w-lg" data-testid="appointment-dialog">
            <DialogHeader>
              <DialogTitle className="text-xl font-heading font-bold uppercase">
                {editingAppointment ? 'EDITAR AGENDAMENTO' : 'NOVO AGENDAMENTO'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="client" className="text-xs font-semibold uppercase text-zinc-500">Cliente *</Label>
                  <Select
                    value={formData.client_id}
                    onValueChange={(value) => {
                      setFormData({ ...formData, client_id: value, vehicle_id: '' });
                    }}
                    required
                  >
                    <SelectTrigger className="bg-zinc-950 border-zinc-800 focus:border-red-600 rounded-sm" data-testid="appointment-client-select">
                      <SelectValue placeholder="Selecione um cliente" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-950 border-zinc-800">
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vehicle" className="text-xs font-semibold uppercase text-zinc-500">Veículo *</Label>
                  <Select
                    value={formData.vehicle_id}
                    onValueChange={(value) => setFormData({ ...formData, vehicle_id: value })}
                    required
                    disabled={!formData.client_id}
                  >
                    <SelectTrigger className="bg-zinc-950 border-zinc-800 focus:border-red-600 rounded-sm" data-testid="appointment-vehicle-select">
                      <SelectValue placeholder={formData.client_id ? "Selecione um veículo" : "Primeiro selecione um cliente"} />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-950 border-zinc-800">
                      {getClientVehicles(formData.client_id).map((vehicle) => (
                        <SelectItem key={vehicle.id} value={vehicle.id}>
                          {vehicle.brand} {vehicle.model} - {vehicle.license_plate}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date" className="text-xs font-semibold uppercase text-zinc-500">Data e Hora *</Label>
                  <Input
                    id="date"
                    type="datetime-local"
                    value={formData.appointment_date}
                    onChange={(e) => setFormData({ ...formData, appointment_date: e.target.value })}
                    required
                    className="bg-zinc-950 border-zinc-800 focus:border-red-600 rounded-sm font-mono"
                    data-testid="appointment-date-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status" className="text-xs font-semibold uppercase text-zinc-500">Status *</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                    required
                  >
                    <SelectTrigger className="bg-zinc-950 border-zinc-800 focus:border-red-600 rounded-sm" data-testid="appointment-status-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-950 border-zinc-800">
                      <SelectItem value="scheduled">Agendado</SelectItem>
                      <SelectItem value="confirmed">Confirmado</SelectItem>
                      <SelectItem value="completed">Concluído</SelectItem>
                      <SelectItem value="cancelled">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes" className="text-xs font-semibold uppercase text-zinc-500">Observações</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="bg-zinc-950 border-zinc-800 focus:border-red-600 rounded-sm"
                    rows={3}
                    data-testid="appointment-notes-input"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => { setDialogOpen(false); resetForm(); }}
                  className="border border-zinc-700 hover:border-zinc-500 text-white rounded-sm"
                  data-testid="cancel-button"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="bg-red-600 hover:bg-red-700 text-white font-bold uppercase rounded-sm active:scale-95"
                  data-testid="save-appointment-button"
                >
                  {editingAppointment ? 'ATUALIZAR' : 'CRIAR'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
