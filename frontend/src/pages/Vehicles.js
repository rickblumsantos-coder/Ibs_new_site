import React, { useEffect, useState, useMemo } from 'react';
import { Layout } from '@/components/layout/Layout';
import { api } from '@/utils/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Search, ChevronDown, ChevronRight, Car } from 'lucide-react';

export default function Vehicles() {
  const [vehicles, setVehicles] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [expandedBrands, setExpandedBrands] = useState({});
  const [formData, setFormData] = useState({
    client_id: '',
    license_plate: '',
    model: '',
    brand: '',
    year: new Date().getFullYear(),
    color: '',
    transmission: '',
    fuel_type: '',
    mileage: '',
    engine: '',
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [vehiclesRes, clientsRes] = await Promise.all([
        api.getVehicles(),
        api.getClients(),
      ]);
      setVehicles(vehiclesRes.data);
      setClients(clientsRes.data);
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
        year: parseInt(formData.year),
        mileage: formData.mileage ? parseInt(formData.mileage) : null,
      };
      if (editingVehicle) {
        await api.updateVehicle(editingVehicle.id, data);
        toast.success('VeÃ­culo atualizado com sucesso!');
      } else {
        await api.createVehicle(data);
        toast.success('VeÃ­culo criado com sucesso!');
      }
      setDialogOpen(false);
      resetForm();
      loadData();
    } catch (error) {
      toast.error('Erro ao salvar veÃ­culo');
    }
  };

  const handleEdit = (vehicle) => {
    setEditingVehicle(vehicle);
    setFormData({
      client_id: vehicle.client_id,
      license_plate: vehicle.license_plate,
      model: vehicle.model,
      brand: vehicle.brand,
      year: vehicle.year,
      color: vehicle.color || '',
      transmission: vehicle.transmission || '',
      fuel_type: vehicle.fuel_type || '',
      mileage: vehicle.mileage || '',
      engine: vehicle.engine || '',
      notes: vehicle.notes || '',
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir este veÃ­culo?')) {
      try {
        await api.deleteVehicle(id);
        toast.success('VeÃ­culo excluÃ­do com sucesso!');
        loadData();
      } catch (error) {
        toast.error('Erro ao excluir veÃ­culo');
      }
    }
  };

  const resetForm = () => {
    setEditingVehicle(null);
    setFormData({
      client_id: '',
      license_plate: '',
      model: '',
      brand: '',
      year: new Date().getFullYear(),
      color: '',
      transmission: '',
      fuel_type: '',
      mileage: '',
      engine: '',
      notes: '',
    });
  };

  const getClientName = (clientId) => {
    const client = clients.find((c) => c.id === clientId);
    return client ? client.name : 'N/A';
  };

  const filteredVehicles = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return vehicles.filter((vehicle) =>
      vehicle.license_plate.toLowerCase().includes(term) ||
      vehicle.model.toLowerCase().includes(term) ||
      vehicle.brand.toLowerCase().includes(term) ||
      getClientName(vehicle.client_id).toLowerCase().includes(term)
    );
  }, [vehicles, searchTerm, clients]);

  // Agrupar veÃ­culos por marca
  const vehiclesByBrand = useMemo(() => {
    const grouped = {};
    filteredVehicles.forEach((vehicle) => {
      const brand = vehicle.brand.toUpperCase();
      if (!grouped[brand]) {
        grouped[brand] = [];
      }
      grouped[brand].push(vehicle);
    });
    // Ordenar marcas alfabeticamente
    return Object.keys(grouped)
      .sort()
      .reduce((acc, key) => {
        acc[key] = grouped[key];
        return acc;
      }, {});
  }, [filteredVehicles]);

  const toggleBrand = (brand) => {
    setExpandedBrands((prev) => ({
      ...prev,
      [brand]: !prev[brand],
    }));
  };

  // Expandir todas as marcas por padrÃ£o
  useEffect(() => {
    setExpandedBrands((prev) => {
      const next = {};
      Object.keys(vehiclesByBrand).forEach((brand) => {
        next[brand] = prev[brand] ?? true;
      });
      return next;
    });
  }, [vehiclesByBrand]);

  return (
    <Layout>
      <div data-testid="vehicles-page">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
          <div>
            <h1 className="text-4xl font-heading font-bold uppercase tracking-tight text-zinc-50">
              VEÃCULOS
            </h1>
            <p className="text-zinc-400 text-sm mt-1">Gerencie os veÃ­culos dos clientes</p>
          </div>
          <Button
            onClick={() => {
              resetForm();
              setDialogOpen(true);
            }}
            className="bg-red-600 hover:bg-red-700 text-white font-bold uppercase tracking-wide rounded-sm h-10 px-6 active:scale-95"
            data-testid="add-vehicle-button"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo VeÃ­culo
          </Button>
        </div>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por placa, modelo, marca ou cliente..."
              className="pl-10 bg-zinc-950 border-zinc-800 focus:border-red-600 focus:ring-1 focus:ring-red-600 rounded-sm"
              data-testid="search-input"
            />
          </div>
        </div>

        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-12 text-zinc-500">Carregando...</div>
          ) : filteredVehicles.length === 0 ? (
            <div className="text-center py-12 text-zinc-500">Nenhum veÃ­culo encontrado</div>
          ) : (
            Object.entries(vehiclesByBrand).map(([brand, brandVehicles]) => (
              <div key={brand} className="bg-zinc-900 border border-zinc-800 rounded-sm overflow-hidden">
                {/* Header da marca */}
                <button
                  onClick={() => toggleBrand(brand)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-zinc-900/80 hover:bg-zinc-800/50 transition-colors"
                  data-testid={`brand-header-${brand}`}
                >
                  <div className="flex items-center gap-3">
                    <Car className="w-5 h-5 text-red-500" />
                    <span className="text-lg font-heading font-bold uppercase text-zinc-50">{brand}</span>
                    <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-sm">
                      {brandVehicles.length} {brandVehicles.length === 1 ? 'veÃ­culo' : 'veÃ­culos'}
                    </span>
                  </div>
                  {expandedBrands[brand] ? (
                    <ChevronDown className="w-5 h-5 text-zinc-400" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-zinc-400" />
                  )}
                </button>
                
                {/* Lista de veÃ­culos da marca */}
                {expandedBrands[brand] && (
                  <div className="divide-y divide-zinc-800">
                    {brandVehicles.map((vehicle) => (
                      <div
                        key={vehicle.id}
                        className="p-4 hover:bg-zinc-900/50 transition-colors"
                        data-testid={`vehicle-card-${vehicle.id}`}
                      >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                            {/* Info principal */}
                            <div>
                              <div className="text-xs text-zinc-500 uppercase mb-1">Placa</div>
                              <div className="text-lg font-mono font-bold text-red-500">{vehicle.license_plate}</div>
                            </div>
                            <div>
                              <div className="text-xs text-zinc-500 uppercase mb-1">Modelo</div>
                              <div className="text-sm text-zinc-200 font-medium">{vehicle.model}</div>
                              <div className="text-xs text-zinc-500">{vehicle.year}</div>
                            </div>
                            <div>
                              <div className="text-xs text-zinc-500 uppercase mb-1">Cliente</div>
                              <div className="text-sm text-zinc-200">{getClientName(vehicle.client_id)}</div>
                            </div>
                            {/* EspecificaÃ§Ãµes */}
                            <div>
                              <div className="text-xs text-zinc-500 uppercase mb-1">EspecificaÃ§Ãµes</div>
                              <div className="flex flex-wrap gap-1">
                                {vehicle.color && (
                                  <span className="text-xs bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded-sm">{vehicle.color}</span>
                                )}
                                {vehicle.transmission && (
                                  <span className="text-xs bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded-sm">{vehicle.transmission}</span>
                                )}
                                {vehicle.fuel_type && (
                                  <span className="text-xs bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded-sm">{vehicle.fuel_type}</span>
                                )}
                                {vehicle.engine && (
                                  <span className="text-xs bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded-sm">{vehicle.engine}</span>
                                )}
                                {vehicle.mileage && (
                                  <span className="text-xs bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded-sm">{vehicle.mileage.toLocaleString()} km</span>
                                )}
                              </div>
                            </div>
                          </div>
                          {/* AÃ§Ãµes */}
                          <div className="flex items-center gap-2">
                            <Button
                              onClick={() => handleEdit(vehicle)}
                              variant="ghost"
                              size="sm"
                              className="hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-sm"
                              data-testid={`edit-vehicle-${vehicle.id}`}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              onClick={() => handleDelete(vehicle.id)}
                              variant="ghost"
                              size="sm"
                              className="hover:bg-red-950 text-red-400 hover:text-red-300 rounded-sm"
                              data-testid={`delete-vehicle-${vehicle.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-50 max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="vehicle-dialog">
            <DialogHeader>
              <DialogTitle className="text-xl font-heading font-bold uppercase">
                {editingVehicle ? 'EDITAR VEÃCULO' : 'NOVO VEÃCULO'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="client" className="text-xs font-semibold uppercase text-zinc-500">
                    Cliente *
                  </Label>
                  <Select
                    value={formData.client_id}
                    onValueChange={(value) => setFormData({ ...formData, client_id: value })}
                    required
                  >
                    <SelectTrigger className="bg-zinc-950 border-zinc-800 focus:border-red-600 rounded-sm" data-testid="vehicle-client-select">
                      <SelectValue placeholder="Selecione um cliente" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-950 border-zinc-800">
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="border-t border-zinc-800 pt-4">
                  <h3 className="text-sm font-semibold uppercase text-zinc-400 mb-3">InformaÃ§Ãµes BÃ¡sicas</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="license_plate" className="text-xs font-semibold uppercase text-zinc-500">
                        Placa *
                      </Label>
                      <Input
                        id="license_plate"
                        value={formData.license_plate}
                        onChange={(e) => setFormData({ ...formData, license_plate: e.target.value.toUpperCase() })}
                        required
                        placeholder="ABC-1234"
                        className="bg-zinc-950 border-zinc-800 focus:border-red-600 rounded-sm font-mono"
                        data-testid="vehicle-plate-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="brand" className="text-xs font-semibold uppercase text-zinc-500">
                        Marca *
                      </Label>
                      <Input
                        id="brand"
                        value={formData.brand}
                        onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                        required
                        placeholder="Honda, Toyota, VW..."
                        className="bg-zinc-950 border-zinc-800 focus:border-red-600 rounded-sm"
                        data-testid="vehicle-brand-input"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="model" className="text-xs font-semibold uppercase text-zinc-500">
                        Modelo *
                      </Label>
                      <Input
                        id="model"
                        value={formData.model}
                        onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                        required
                        placeholder="Civic, Corolla, Gol..."
                        className="bg-zinc-950 border-zinc-800 focus:border-red-600 rounded-sm"
                        data-testid="vehicle-model-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="year" className="text-xs font-semibold uppercase text-zinc-500">
                        Ano *
                      </Label>
                      <Input
                        id="year"
                        type="number"
                        value={formData.year}
                        onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                        required
                        className="bg-zinc-950 border-zinc-800 focus:border-red-600 rounded-sm font-mono"
                        data-testid="vehicle-year-input"
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t border-zinc-800 pt-4">
                  <h3 className="text-sm font-semibold uppercase text-zinc-400 mb-3">EspecificaÃ§Ãµes</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="color" className="text-xs font-semibold uppercase text-zinc-500">
                        Cor
                      </Label>
                      <Input
                        id="color"
                        value={formData.color}
                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                        placeholder="Preto, Branco, Prata..."
                        className="bg-zinc-950 border-zinc-800 focus:border-red-600 rounded-sm"
                        data-testid="vehicle-color-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="engine" className="text-xs font-semibold uppercase text-zinc-500">
                        Motor
                      </Label>
                      <Input
                        id="engine"
                        value={formData.engine}
                        onChange={(e) => setFormData({ ...formData, engine: e.target.value })}
                        placeholder="1.0, 1.6, 2.0..."
                        className="bg-zinc-950 border-zinc-800 focus:border-red-600 rounded-sm"
                        data-testid="vehicle-engine-input"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="transmission" className="text-xs font-semibold uppercase text-zinc-500">
                        CÃ¢mbio
                      </Label>
                      <Select
                        value={formData.transmission}
                        onValueChange={(value) => setFormData({ ...formData, transmission: value })}
                      >
                        <SelectTrigger className="bg-zinc-950 border-zinc-800 focus:border-red-600 rounded-sm" data-testid="vehicle-transmission-select">
                          <SelectValue placeholder="Selecione o cÃ¢mbio" />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-950 border-zinc-800">
                          <SelectItem value="Manual">Manual</SelectItem>
                          <SelectItem value="AutomÃ¡tico">AutomÃ¡tico</SelectItem>
                          <SelectItem value="CVT">CVT</SelectItem>
                          <SelectItem value="Automatizado">Automatizado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fuel_type" className="text-xs font-semibold uppercase text-zinc-500">
                        CombustÃ­vel
                      </Label>
                      <Select
                        value={formData.fuel_type}
                        onValueChange={(value) => setFormData({ ...formData, fuel_type: value })}
                      >
                        <SelectTrigger className="bg-zinc-950 border-zinc-800 focus:border-red-600 rounded-sm" data-testid="vehicle-fuel-select">
                          <SelectValue placeholder="Selecione o combustÃ­vel" />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-950 border-zinc-800">
                          <SelectItem value="Gasolina">Gasolina</SelectItem>
                          <SelectItem value="Etanol">Etanol</SelectItem>
                          <SelectItem value="Flex">Flex</SelectItem>
                          <SelectItem value="Diesel">Diesel</SelectItem>
                          <SelectItem value="ElÃ©trico">ElÃ©trico</SelectItem>
                          <SelectItem value="HÃ­brido">HÃ­brido</SelectItem>
                          <SelectItem value="GNV">GNV</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="mileage" className="text-xs font-semibold uppercase text-zinc-500">
                        Quilometragem
                      </Label>
                      <Input
                        id="mileage"
                        type="number"
                        value={formData.mileage}
                        onChange={(e) => setFormData({ ...formData, mileage: e.target.value })}
                        placeholder="Ex: 50000"
                        className="bg-zinc-950 border-zinc-800 focus:border-red-600 rounded-sm font-mono"
                        data-testid="vehicle-mileage-input"
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t border-zinc-800 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="notes" className="text-xs font-semibold uppercase text-zinc-500">
                      ObservaÃ§Ãµes
                    </Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="InformaÃ§Ãµes adicionais sobre o veÃ­culo..."
                      className="bg-zinc-950 border-zinc-800 focus:border-red-600 rounded-sm"
                      rows={2}
                      data-testid="vehicle-notes-input"
                    />
                  </div>
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
                  data-testid="save-vehicle-button"
                >
                  {editingVehicle ? 'ATUALIZAR' : 'CRIAR'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
