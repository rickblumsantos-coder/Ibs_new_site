import React, { useEffect, useState, useMemo } from 'react';
import { Layout } from '@/components/layout/Layout';
import { api } from '@/utils/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Package, Search } from 'lucide-react';

export default function Parts() {
  const [parts, setParts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPart, setEditingPart] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '', supplier: '', price: '', stock: '0' });
  const [searchTerm, setSearchTerm] = useState('');
  const [supplierCategoryFilter, setSupplierCategoryFilter] = useState('all');

  const supplierCategories = useMemo(() => {
    const values = parts
      .map((part) => (part.supplier || '').trim())
      .filter(Boolean);
    return [...new Set(values)].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [parts]);

  const filteredParts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return parts.filter((part) => {
      const supplier = (part.supplier || '').trim();
      const matchesSearch = !term || (
        part.name.toLowerCase().includes(term) ||
        (part.description && part.description.toLowerCase().includes(term)) ||
        supplier.toLowerCase().includes(term)
      );

      if (!matchesSearch) return false;
      if (supplierCategoryFilter === 'all') return true;
      if (supplierCategoryFilter === '__none__') return !supplier;
      return supplier === supplierCategoryFilter;
    });
  }, [parts, searchTerm, supplierCategoryFilter]);

  useEffect(() => {
    loadParts();
  }, []);

  const loadParts = async () => {
    try {
      const response = await api.getParts();
      setParts(response.data);
    } catch (error) {
      toast.error('Erro ao carregar peças');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        ...formData,
        price: parseFloat(formData.price),
        stock: parseInt(formData.stock, 10),
      };
      if (editingPart) {
        await api.updatePart(editingPart.id, data);
        toast.success('Peça atualizada com sucesso!');
      } else {
        await api.createPart(data);
        toast.success('Peça criada com sucesso!');
      }
      setDialogOpen(false);
      resetForm();
      loadParts();
    } catch (error) {
      toast.error('Erro ao salvar peça');
    }
  };

  const handleEdit = (part) => {
    setEditingPart(part);
    setFormData({
      name: part.name,
      description: part.description || '',
      supplier: part.supplier || '',
      price: part.price,
      stock: part.stock,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir esta peça?')) {
      try {
        await api.deletePart(id);
        toast.success('Peça excluída com sucesso!');
        loadParts();
      } catch (error) {
        toast.error('Erro ao excluir peça');
      }
    }
  };

  const resetForm = () => {
    setEditingPart(null);
    setFormData({ name: '', description: '', supplier: '', price: '', stock: '0' });
  };

  const getStockBadge = (stock) => {
    if (stock === 0) return <span className="inline-flex items-center px-2.5 py-0.5 rounded-sm text-xs font-medium border bg-red-950/30 text-red-400 border-red-900">ESGOTADO</span>;
    if (stock < 5) return <span className="inline-flex items-center px-2.5 py-0.5 rounded-sm text-xs font-medium border bg-yellow-950/30 text-yellow-400 border-yellow-900">BAIXO</span>;
    return <span className="inline-flex items-center px-2.5 py-0.5 rounded-sm text-xs font-medium border bg-green-950/30 text-green-400 border-green-900">DISPONÍVEL</span>;
  };

  return (
    <Layout>
      <div data-testid="parts-page">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
          <div>
            <h1 className="text-4xl font-heading font-bold uppercase tracking-tight text-zinc-50">
              PEÇAS
            </h1>
            <p className="text-zinc-400 text-sm mt-1">Gerencie o estoque de peças</p>
          </div>
          <Button
            onClick={() => { resetForm(); setDialogOpen(true); }}
            className="bg-red-600 hover:bg-red-700 text-white font-bold uppercase tracking-wide rounded-sm h-10 px-6 active:scale-95"
            data-testid="add-part-button"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Peça
          </Button>
        </div>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome, descrição ou revendedora..."
              className="pl-10 bg-zinc-950 border-zinc-800 focus:border-red-600 focus:ring-1 focus:ring-red-600 rounded-sm"
              data-testid="parts-search-input"
            />
          </div>
        </div>
        <div className="mb-6">
          <Select value={supplierCategoryFilter} onValueChange={setSupplierCategoryFilter}>
            <SelectTrigger className="bg-zinc-950 border-zinc-800 rounded-sm max-w-sm" data-testid="parts-supplier-category-filter">
              <SelectValue placeholder="Categoria de revendedora" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-950 border-zinc-800">
              <SelectItem value="all">Todas as revendedoras</SelectItem>
              <SelectItem value="__none__">Sem revendedora</SelectItem>
              {supplierCategories.map((supplier) => (
                <SelectItem key={supplier} value={supplier}>{supplier}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-full text-center py-12 text-zinc-500">Carregando...</div>
          ) : filteredParts.length === 0 ? (
            <div className="col-span-full text-center py-12 text-zinc-500">
              {searchTerm ? 'Nenhuma peça encontrada para esta busca' : 'Nenhuma peça encontrada'}
            </div>
          ) : (
            filteredParts.map((part) => (
              <div
                key={part.id}
                className="bg-zinc-900 border border-zinc-800 rounded-sm p-5 hover:border-zinc-700 transition-colors"
                data-testid={`part-card-${part.id}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-zinc-500" />
                    <h3 className="text-lg font-heading font-bold uppercase text-zinc-50">
                      {part.name}
                    </h3>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      onClick={() => handleEdit(part)}
                      variant="ghost"
                      size="sm"
                      className="hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-sm p-1 h-auto"
                      data-testid={`edit-part-${part.id}`}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => handleDelete(part.id)}
                      variant="ghost"
                      size="sm"
                      className="hover:bg-red-950 text-red-400 hover:text-red-300 rounded-sm p-1 h-auto"
                      data-testid={`delete-part-${part.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                {part.description && (
                  <p className="text-sm text-zinc-400 mb-3">{part.description}</p>
                )}
                {part.supplier && (
                  <p className="text-xs text-zinc-500 mb-3">
                    Revendedora: <span className="text-zinc-300">{part.supplier}</span>
                  </p>
                )}
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-mono font-bold text-red-600">
                    R$ {part.price.toFixed(2)}
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Estoque</div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-mono font-bold text-zinc-200">{part.stock}</span>
                      {getStockBadge(part.stock)}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-50" data-testid="part-dialog">
            <DialogHeader>
              <DialogTitle className="text-xl font-heading font-bold uppercase">
                {editingPart ? 'EDITAR PEÇA' : 'NOVA PEÇA'}
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
                    data-testid="part-name-input"
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
                    data-testid="part-description-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supplier" className="text-xs font-semibold uppercase text-zinc-500">Revendedora</Label>
                  <Input
                    id="supplier"
                    value={formData.supplier}
                    onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                    className="bg-zinc-950 border-zinc-800 focus:border-red-600 rounded-sm"
                    data-testid="part-supplier-input"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="price" className="text-xs font-semibold uppercase text-zinc-500">Preço *</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      required
                      className="bg-zinc-950 border-zinc-800 focus:border-red-600 rounded-sm font-mono"
                      data-testid="part-price-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="stock" className="text-xs font-semibold uppercase text-zinc-500">Estoque *</Label>
                    <Input
                      id="stock"
                      type="number"
                      value={formData.stock}
                      onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                      required
                      className="bg-zinc-950 border-zinc-800 focus:border-red-600 rounded-sm font-mono"
                      data-testid="part-stock-input"
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => { setDialogOpen(false); resetForm(); }} className="border border-zinc-700 hover:border-zinc-500 text-white rounded-sm" data-testid="cancel-button">
                  Cancelar
                </Button>
                <Button type="submit" className="bg-red-600 hover:bg-red-700 text-white font-bold uppercase rounded-sm active:scale-95" data-testid="save-part-button">
                  {editingPart ? 'ATUALIZAR' : 'CRIAR'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
