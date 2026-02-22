import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Layout } from '@/components/layout/Layout';
import { api } from '@/utils/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Trash2, Download, Check, X as XIcon, Search, Car, Edit, ChevronDown, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Quotes() {
  const [quotes, setQuotes] = useState([]);
  const [clients, setClients] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [services, setServices] = useState([]);
  const [parts, setParts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingQuote, setEditingQuote] = useState(null);
  const [quoteClientFilter, setQuoteClientFilter] = useState('all');
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [showVehicleDropdown, setShowVehicleDropdown] = useState(false);
  const [expandedQuoteBrands, setExpandedQuoteBrands] = useState({});
  const [formData, setFormData] = useState({
    client_id: '',
    vehicle_id: '',
    items: [],
    discount: 0,
    labor_cost: 0,
    notes: '',
    status: 'pending',
  });
  const [newItem, setNewItem] = useState({
    type: 'service',
    item_id: '',
    supplier: '',
    quantity: 1,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [quotesRes, clientsRes, vehiclesRes, servicesRes, partsRes] = await Promise.all([
        api.getQuotes(),
        api.getClients(),
        api.getVehicles(),
        api.getServices(),
        api.getParts(),
      ]);
      setQuotes(quotesRes.data);
      setClients(clientsRes.data);
      setVehicles(vehiclesRes.data);
      setServices(servicesRes.data);
      setParts(partsRes.data);
    } catch (error) {
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const serviceSupplierOptions = useMemo(() => {
    const values = services
      .map((service) => (service.supplier || '').trim())
      .filter(Boolean);
    return [...new Set(values)].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [services]);

  const partSupplierOptions = useMemo(() => {
    const values = parts
      .map((part) => (part.supplier || '').trim())
      .filter(Boolean);
    return [...new Set(values)].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [parts]);

  const filteredPartOptions = useMemo(() => {
    const selectedSupplier = (newItem.supplier || '').trim();
    if (!selectedSupplier) return parts;
    return parts.filter((part) => (part.supplier || '').trim() === selectedSupplier);
  }, [parts, newItem.supplier]);

  const itemOptions = newItem.type === 'service' ? services : filteredPartOptions;

  const filteredQuotes = useMemo(() => {
    const base = quoteClientFilter === 'all'
      ? quotes
      : quotes.filter((quote) => quote.client_id === quoteClientFilter);
    return [...base].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }, [quotes, quoteClientFilter]);

  const addItemToQuote = () => {
    if (!newItem.item_id) {
      toast.error('Selecione um item');
      return;
    }

    const itemData = newItem.type === 'service'
      ? services.find((s) => s.id === newItem.item_id)
      : parts.find((p) => p.id === newItem.item_id);

    if (!itemData) return;
    const quantity = parseInt(newItem.quantity, 10);
    if (!quantity || quantity <= 0) {
      toast.error('Quantidade inválida');
      return;
    }

    const unitPrice = newItem.type === 'service' ? itemData.default_price : itemData.price;

    const quoteItem = {
      type: newItem.type,
      item_id: itemData.id,
      name: itemData.name,
      supplier: (newItem.supplier || itemData.supplier || '').trim() || null,
      quantity,
      unit_price: unitPrice,
      total: unitPrice * quantity,
    };

    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, quoteItem],
    }));

    setNewItem((prev) => ({
      ...prev,
      item_id: '',
      supplier: prev.type === 'part' ? prev.supplier : '',
      quantity: 1,
    }));
  };

  const removeItemFromQuote = (index) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const calculateSubtotal = () => {
    return formData.items.reduce((sum, item) => sum + item.total, 0);
  };

  const calculateTotal = () => {
    return calculateSubtotal() + (parseFloat(formData.labor_cost) || 0) - (parseFloat(formData.discount) || 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.vehicle_id || !formData.client_id) {
      toast.error('Selecione um veículo');
      return;
    }

    if (formData.items.length === 0) {
      toast.error('Adicione pelo menos um item ao orçamento');
      return;
    }

    try {
      const data = {
        client_id: formData.client_id,
        vehicle_id: formData.vehicle_id,
        items: formData.items,
        discount: parseFloat(formData.discount) || 0,
        labor_cost: parseFloat(formData.labor_cost) || 0,
        notes: formData.notes,
      };

      if (editingQuote) {
        await api.updateQuote(editingQuote.id, data);
        if (formData.status !== editingQuote.status) {
          await api.updateQuoteStatus(editingQuote.id, formData.status);
        }
        toast.success('Orçamento atualizado com sucesso!');
      } else {
        const created = await api.createQuote(data);
        if (formData.status !== 'pending' && created?.data?.id) {
          await api.updateQuoteStatus(created.data.id, formData.status);
        }
        toast.success('Orçamento criado com sucesso!');
      }
      setDialogOpen(false);
      resetForm();
      loadData();
    } catch (error) {
      toast.error('Erro ao salvar orçamento');
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await api.updateQuoteStatus(id, status);
      toast.success('Status do orçamento atualizado!');
      loadData();
    } catch (error) {
      toast.error('Erro ao atualizar status do orçamento');
    }
  };

  const handleEdit = (quote) => {
    setEditingQuote(quote);
    setFormData({
      client_id: quote.client_id,
      vehicle_id: quote.vehicle_id,
      items: (quote.items || []).map((item) => ({ ...item, supplier: item.supplier || null })),
      discount: quote.discount || 0,
      labor_cost: quote.labor_cost || 0,
      notes: quote.notes || '',
      status: quote.status || 'pending',
    });
    setVehicleSearch(getVehicleInfo(quote.vehicle_id));
    setShowVehicleDropdown(false);
    setDialogOpen(true);
  };

  const handleDownloadPDF = async (id) => {
    try {
      const response = await api.downloadQuotePDF(id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `orcamento_${id.substring(0, 8)}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('PDF baixado com sucesso!');
    } catch (error) {
      toast.error('Erro ao gerar PDF');
    }
  };

  const resetForm = () => {
    setEditingQuote(null);
    setFormData({
      client_id: '',
      vehicle_id: '',
      items: [],
      discount: 0,
      labor_cost: 0,
      notes: '',
      status: 'pending',
    });
    setNewItem({ type: 'service', item_id: '', supplier: '', quantity: 1 });
    setVehicleSearch('');
    setShowVehicleDropdown(false);
  };

  const getClientName = useCallback((clientId) => {
    const client = clients.find((c) => c.id === clientId);
    return client ? client.name : 'N/A';
  }, [clients]);

  const getVehicleInfo = (vehicleId) => {
    const vehicle = vehicles.find((v) => v.id === vehicleId);
    return vehicle ? `${vehicle.brand} ${vehicle.model} - ${vehicle.license_plate}` : 'N/A';
  };

  // Filtrar veículos pela busca (marca, modelo ou placa)
  const filteredVehiclesForSearch = useMemo(() => {
    if (!vehicleSearch.trim()) return vehicles;
    const term = vehicleSearch.toLowerCase();
    return vehicles.filter((v) =>
      v.brand.toLowerCase().includes(term) ||
      v.model.toLowerCase().includes(term) ||
      v.license_plate.toLowerCase().includes(term) ||
      getClientName(v.client_id).toLowerCase().includes(term)
    );
  }, [vehicles, vehicleSearch, getClientName]);

  // Agrupar veículos filtrados por marca
  const groupedVehicles = useMemo(() => {
    const grouped = {};
    filteredVehiclesForSearch.forEach((vehicle) => {
      const brand = vehicle.brand.toUpperCase();
      if (!grouped[brand]) {
        grouped[brand] = [];
      }
      grouped[brand].push(vehicle);
    });
    return Object.keys(grouped)
      .sort()
      .reduce((acc, key) => {
        acc[key] = grouped[key];
        return acc;
      }, {});
  }, [filteredVehiclesForSearch]);

  useEffect(() => {
    setExpandedQuoteBrands((prev) => {
      const next = {};
      Object.keys(groupedVehicles).forEach((brand) => {
        next[brand] = prev[brand] ?? true;
      });
      return next;
    });
  }, [groupedVehicles]);

  const selectVehicle = (vehicle) => {
    setFormData({ ...formData, vehicle_id: vehicle.id, client_id: vehicle.client_id });
    setVehicleSearch(`${vehicle.brand} ${vehicle.model} - ${vehicle.license_plate}`);
    setShowVehicleDropdown(false);
  };

  const toggleQuoteBrand = (brand) => {
    setExpandedQuoteBrands((prev) => ({
      ...prev,
      [brand]: !prev[brand],
    }));
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'bg-yellow-950/30 text-yellow-400 border-yellow-900',
      approved: 'bg-green-950/30 text-green-400 border-green-900',
      rejected: 'bg-red-950/30 text-red-400 border-red-900',
      completed: 'bg-zinc-800 text-zinc-400 border-zinc-700',
    };
    const labels = {
      pending: 'Pendente',
      approved: 'Aprovado',
      rejected: 'Rejeitado',
      completed: 'Concluído',
    };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-sm text-xs font-medium border ${badges[status]}`}>
        {labels[status]}
      </span>
    );
  };

  return (
    <Layout>
      <div data-testid="quotes-page">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-8 gap-4">
          <div>
            <h1 className="text-4xl font-heading font-bold uppercase tracking-tight text-zinc-50">
              ORÇAMENTOS
            </h1>
            <p className="text-zinc-400 text-sm mt-1">Gerencie os orçamentos da oficina</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
            <div className="min-w-[240px]">
              <Select value={quoteClientFilter} onValueChange={setQuoteClientFilter}>
                <SelectTrigger className="bg-zinc-950 border-zinc-800 rounded-sm" data-testid="quote-client-filter">
                  <SelectValue placeholder="Filtrar por cliente" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-950 border-zinc-800">
                  <SelectItem value="all">Todos os clientes</SelectItem>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={() => { resetForm(); setDialogOpen(true); }}
              className="bg-red-600 hover:bg-red-700 text-white font-bold uppercase tracking-wide rounded-sm h-10 px-6 active:scale-95"
              data-testid="add-quote-button"
            >
              <Plus className="w-4 h-4 mr-2" />
              Novo Orçamento
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {loading ? (
            <div className="col-span-full text-center py-12 text-zinc-500">Carregando...</div>
          ) : filteredQuotes.length === 0 ? (
            <div className="col-span-full text-center py-12 text-zinc-500">Nenhum orçamento encontrado</div>
          ) : (
            filteredQuotes.map((quote) => (
              <div
                key={quote.id}
                className="bg-zinc-900 border border-zinc-800 rounded-sm p-6 hover:border-zinc-700 transition-colors"
                data-testid={`quote-card-${quote.id}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-heading font-bold uppercase text-zinc-50 mb-1">
                      ORÇAMENTO #{quote.id.substring(0, 8)}
                    </h3>
                    <p className="text-xs text-zinc-500 font-mono">
                      {format(new Date(quote.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                    </p>
                  </div>
                  {getStatusBadge(quote.status)}
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500">Cliente:</span>
                    <span className="text-zinc-200 font-medium">{getClientName(quote.client_id)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500">Veículo:</span>
                    <span className="text-zinc-200 font-mono text-xs">{getVehicleInfo(quote.vehicle_id)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500">Itens:</span>
                    <span className="text-zinc-200">{quote.items.length}</span>
                  </div>
                  {Array.from(new Set((quote.items || []).map((item) => item.supplier).filter(Boolean))).length > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-500">Revendedoras:</span>
                      <span className="text-zinc-200 text-right">
                        {Array.from(new Set((quote.items || []).map((item) => item.supplier).filter(Boolean))).join(', ')}
                      </span>
                    </div>
                  )}
                  {quote.labor_cost > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-500">Mão de Obra:</span>
                      <span className="text-green-400 font-mono">R$ {quote.labor_cost.toFixed(2)}</span>
                    </div>
                  )}
                </div>

                <div className="border-t border-zinc-800 pt-4 mb-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-zinc-500 uppercase tracking-wider font-semibold">TOTAL</span>
                    <span className="text-2xl font-mono font-bold text-red-600">
                      R$ {quote.total.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => handleEdit(quote)}
                    size="sm"
                    variant="ghost"
                    className="border border-zinc-700 hover:border-zinc-500 text-zinc-300 hover:text-white rounded-sm flex-1"
                    data-testid={`edit-quote-${quote.id}`}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Editar
                  </Button>
                  <Button
                    onClick={() => handleDownloadPDF(quote.id)}
                    size="sm"
                    variant="ghost"
                    className="border border-zinc-700 hover:border-zinc-500 text-zinc-300 hover:text-white rounded-sm flex-1"
                    data-testid={`download-pdf-${quote.id}`}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    PDF
                  </Button>
                  {quote.status === 'pending' && (
                    <>
                      <Button
                        onClick={() => handleStatusChange(quote.id, 'approved')}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white rounded-sm flex-1"
                        data-testid={`approve-quote-${quote.id}`}
                      >
                        <Check className="w-4 h-4 mr-2" />
                        Aprovar
                      </Button>
                      <Button
                        onClick={() => handleStatusChange(quote.id, 'rejected')}
                        size="sm"
                        variant="ghost"
                        className="hover:bg-red-950 text-red-400 hover:text-red-300 rounded-sm"
                        data-testid={`reject-quote-${quote.id}`}
                      >
                        <XIcon className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-50 max-w-3xl max-h-[90vh] overflow-y-auto" data-testid="quote-dialog">
            <DialogHeader>
              <DialogTitle className="text-xl font-heading font-bold uppercase">
                {editingQuote ? 'EDITAR ORÇAMENTO' : 'NOVO ORÇAMENTO'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-6 py-4">
                {editingQuote && (
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase text-zinc-500">Status do Orçamento</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) => setFormData({ ...formData, status: value })}
                    >
                      <SelectTrigger className="bg-zinc-950 border-zinc-800 rounded-sm" data-testid="quote-status-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-950 border-zinc-800">
                        <SelectItem value="pending">Pendente</SelectItem>
                        <SelectItem value="approved">Aprovado</SelectItem>
                        <SelectItem value="rejected">Rejeitado</SelectItem>
                        <SelectItem value="completed">Concluído</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {/* Busca de Veículo com Autocomplete */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase text-zinc-500">
                    <Car className="w-3 h-3 inline mr-1" />
                    Buscar Veículo *
                  </Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <Input
                      type="text"
                      value={vehicleSearch}
                      onChange={(e) => {
                        setVehicleSearch(e.target.value);
                        setShowVehicleDropdown(true);
                        if (!e.target.value) {
                          setFormData({ ...formData, vehicle_id: '', client_id: '' });
                        }
                      }}
                      onFocus={() => setShowVehicleDropdown(true)}
                      placeholder="Digite marca, modelo, placa ou nome do cliente..."
                      className="pl-10 bg-zinc-950 border-zinc-800 focus:border-red-600 rounded-sm"
                      data-testid="vehicle-search-input"
                    />
                    {/* Dropdown de resultados */}
                    {showVehicleDropdown && vehicleSearch && (
                      <div className="absolute z-50 w-full mt-1 bg-zinc-950 border border-zinc-800 rounded-sm max-h-64 overflow-y-auto shadow-lg">
                        {Object.keys(groupedVehicles).length === 0 ? (
                          <div className="p-3 text-sm text-zinc-500 text-center">Nenhum veículo encontrado</div>
                        ) : (
                          Object.entries(groupedVehicles).map(([brand, brandVehicles]) => (
                            <div key={brand}>
                              <button
                                type="button"
                                onClick={() => toggleQuoteBrand(brand)}
                                className="w-full px-3 py-2 bg-zinc-900/80 text-xs font-bold uppercase text-zinc-400 sticky top-0 flex items-center justify-between"
                              >
                                <span>{brand} ({brandVehicles.length})</span>
                                {expandedQuoteBrands[brand] ? (
                                  <ChevronDown className="w-4 h-4" />
                                ) : (
                                  <ChevronRight className="w-4 h-4" />
                                )}
                              </button>
                              {expandedQuoteBrands[brand] && brandVehicles.map((vehicle) => (
                                <button
                                  key={vehicle.id}
                                  type="button"
                                  onClick={() => selectVehicle(vehicle)}
                                  className="w-full px-3 py-2 text-left hover:bg-zinc-800 transition-colors flex justify-between items-center"
                                  data-testid={`vehicle-option-${vehicle.id}`}
                                >
                                  <div>
                                    <div className="text-sm text-zinc-200">{vehicle.model}</div>
                                    <div className="text-xs text-zinc-500">{vehicle.license_plate} - {getClientName(vehicle.client_id)}</div>
                                  </div>
                                  <span className="text-xs text-zinc-600 font-mono">{vehicle.year}</span>
                                </button>
                              ))}
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                  {formData.vehicle_id && (
                    <div className="flex items-center gap-2 mt-2 p-2 bg-zinc-900/50 border border-zinc-800 rounded-sm">
                      <Car className="w-4 h-4 text-red-500" />
                      <span className="text-sm text-zinc-300">{getVehicleInfo(formData.vehicle_id)}</span>
                      <span className="text-xs text-zinc-500">- Cliente: {getClientName(formData.client_id)}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setFormData({ ...formData, vehicle_id: '', client_id: '' });
                          setVehicleSearch('');
                        }}
                        className="ml-auto text-zinc-500 hover:text-red-400 p-1 h-auto"
                      >
                        <XIcon className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>

                <div className="border border-zinc-800 rounded-sm p-4 bg-zinc-900/50">
                  <h3 className="text-sm font-heading font-bold uppercase text-zinc-50 mb-4">ADICIONAR ITEM</h3>
                  <div className="grid grid-cols-12 gap-2">
                    <div className="col-span-2">
                      <Select
                        value={newItem.type}
                        onValueChange={(value) => setNewItem({ ...newItem, type: value, item_id: '', supplier: '' })}
                      >
                        <SelectTrigger className="bg-zinc-950 border-zinc-800 rounded-sm" data-testid="item-type-select">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-950 border-zinc-800">
                          <SelectItem value="service">Serviço</SelectItem>
                          <SelectItem value="part">Peça</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-4">
                      <Select
                        value={newItem.item_id}
                        onValueChange={(value) => {
                          const source = newItem.type === 'service' ? services : filteredPartOptions;
                          const selected = source.find((item) => item.id === value);
                          setNewItem({
                            ...newItem,
                            item_id: value,
                            supplier: newItem.type === 'part'
                              ? (newItem.supplier || selected?.supplier || '')
                              : (selected?.supplier || ''),
                          });
                        }}
                      >
                        <SelectTrigger className="bg-zinc-950 border-zinc-800 rounded-sm" data-testid="item-select">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-950 border-zinc-800">
                          {itemOptions.map((item) => (
                            <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-3">
                      <Select
                        value={newItem.type === 'part' ? (newItem.supplier || '__all__') : (newItem.supplier || '__none__')}
                        onValueChange={(value) => {
                          if (newItem.type === 'part') {
                            setNewItem({ ...newItem, supplier: value === '__all__' ? '' : value, item_id: '' });
                            return;
                          }
                          setNewItem({ ...newItem, supplier: value === '__none__' ? '' : value });
                        }}
                      >
                        <SelectTrigger className="bg-zinc-950 border-zinc-800 rounded-sm" data-testid="item-supplier-select">
                          <SelectValue placeholder="Revendedora" />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-950 border-zinc-800">
                          {newItem.type === 'part' ? (
                            <>
                              <SelectItem value="__all__">Todas as revendedoras</SelectItem>
                              {partSupplierOptions.map((supplier) => (
                                <SelectItem key={supplier} value={supplier}>{supplier}</SelectItem>
                              ))}
                            </>
                          ) : (
                            <>
                              <SelectItem value="__none__">Sem revendedora</SelectItem>
                              {serviceSupplierOptions.map((supplier) => (
                                <SelectItem key={supplier} value={supplier}>{supplier}</SelectItem>
                              ))}
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-1">
                      <Input
                        type="number"
                        min="1"
                        value={newItem.quantity}
                        onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
                        className="bg-zinc-950 border-zinc-800 rounded-sm font-mono"
                        placeholder="Qtd"
                        data-testid="item-quantity-input"
                      />
                    </div>
                    <div className="col-span-2">
                      <Button
                        type="button"
                        onClick={addItemToQuote}
                        className="w-full bg-red-600 hover:bg-red-700 rounded-sm"
                        data-testid="add-item-button"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  {newItem.type === 'part' && newItem.supplier && itemOptions.length === 0 && (
                    <p className="text-xs text-yellow-400 mt-2">
                      Nenhuma peca cadastrada para a revendedora selecionada.
                    </p>
                  )}
                </div>

                {formData.items.length > 0 && (
                  <div className="border border-zinc-800 rounded-sm overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-zinc-900/50 text-zinc-400 uppercase text-xs font-bold h-10">
                          <th className="text-left px-3">Tipo</th>
                          <th className="text-left px-3">Item</th>
                          <th className="text-left px-3">Revendedora</th>
                          <th className="text-center px-3">Qtd</th>
                          <th className="text-right px-3">Unit.</th>
                          <th className="text-right px-3">Total</th>
                          <th className="w-10"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {formData.items.map((item, idx) => (
                          <tr key={idx} className="border-t border-zinc-800 h-10">
                            <td className="text-xs text-zinc-400 px-3 uppercase">{item.type}</td>
                            <td className="text-sm text-zinc-200 px-3">{item.name}</td>
                            <td className="text-xs text-zinc-400 px-3">{item.supplier || '-'}</td>
                            <td className="text-sm text-zinc-200 px-3 text-center font-mono">{item.quantity}</td>
                            <td className="text-sm text-zinc-200 px-3 text-right font-mono">R$ {item.unit_price.toFixed(2)}</td>
                            <td className="text-sm text-zinc-200 px-3 text-right font-mono font-bold">R$ {item.total.toFixed(2)}</td>
                            <td className="px-2">
                              <Button
                                type="button"
                                onClick={() => removeItemFromQuote(idx)}
                                variant="ghost"
                                size="sm"
                                className="hover:bg-red-950 text-red-400 rounded-sm p-1 h-auto"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase text-zinc-500">Mão de Obra (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.labor_cost}
                      onChange={(e) => setFormData({ ...formData, labor_cost: e.target.value })}
                      className="bg-zinc-950 border-zinc-800 rounded-sm font-mono"
                      data-testid="labor-cost-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase text-zinc-500">Desconto (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.discount}
                      onChange={(e) => setFormData({ ...formData, discount: e.target.value })}
                      className="bg-zinc-950 border-zinc-800 rounded-sm font-mono"
                      data-testid="discount-input"
                    />
                  </div>
                </div>
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-sm p-3">
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-zinc-500">Subtotal:</span>
                      <span className="font-mono text-zinc-300">R$ {calculateSubtotal().toFixed(2)}</span>
                    </div>
                    {parseFloat(formData.labor_cost) > 0 && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-zinc-500">Mão de Obra:</span>
                        <span className="font-mono text-green-400">+ R$ {parseFloat(formData.labor_cost || 0).toFixed(2)}</span>
                      </div>
                    )}
                    {parseFloat(formData.discount) > 0 && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-zinc-500">Desconto:</span>
                        <span className="font-mono text-red-400">- R$ {parseFloat(formData.discount || 0).toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center pt-2 border-t border-zinc-700 mt-1">
                      <span className="text-xs text-zinc-500 uppercase font-semibold">TOTAL</span>
                      <span className="text-2xl font-mono font-bold text-red-600">
                        R$ {calculateTotal().toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase text-zinc-500">Observações</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="bg-zinc-950 border-zinc-800 rounded-sm"
                    rows={3}
                    data-testid="quote-notes-input"
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
                  data-testid="save-quote-button"
                >
                  {editingQuote ? 'ATUALIZAR' : 'CRIAR ORÇAMENTO'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
