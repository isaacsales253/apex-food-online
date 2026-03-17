'use client';

import React, { useState, useEffect } from 'react';
import { Package, Plus, Save, Trash2, Edit3, XCircle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Brand {
  id: number;
  name: string;
  status: string;
}

export default function MarcasPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  
  const [newBrand, setNewBrand] = useState({
    name: '',
    status: 'Aprovada'
  });
  
  const [editingId, setEditingId] = useState<number | null>(null);

  useEffect(() => {
    fetchBrands();
  }, []);

  const fetchBrands = async () => {
    try {
      const res = await fetch('/api/marcas', { cache: 'no-store' });
      const data = await res.json();
      setBrands(data);
    } catch (error) {
      console.error('Error fetching brands:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const method = editingId ? 'PUT' : 'POST';
      const url = editingId ? `/api/marcas/${editingId}` : '/api/marcas';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBrand)
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        alert(errorData.error || 'Erro ao salvar marca');
        return;
      }

      setShowAddForm(false);
      setEditingId(null);
      fetchBrands();
      setNewBrand({
        name: '',
        status: 'Aprovada'
      });
    } catch (error) {
      console.error('Error saving brand:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir esta marca?')) return;
    
    try {
      const res = await fetch(`/api/marcas/${id}`, {
        method: 'DELETE',
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        alert(errorData.error || 'Erro ao excluir marca');
        return;
      }
      
      fetchBrands();
    } catch (error) {
      console.error('Error deleting brand:', error);
      alert('Erro ao excluir marca');
    }
  };

  const toggleStatus = async (id: number, currentStatus: string, currentName: string) => {
    const nextStatus = currentStatus === 'Aprovada' ? 'Reprovada' : 'Aprovada';
    
    try {
      const res = await fetch(`/api/marcas/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: currentName, status: nextStatus })
      });
      
      if (res.ok) {
         fetchBrands();
      }
    } catch (e) {
      alert('Erro ao alterar status.');
    }
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-[1200px] mx-auto">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-2">Controle de Marcas</h1>
          <p className="text-muted text-lg">Central de marcas aprovadas x reprovadas para compras.</p>
        </div>
        <button 
          onClick={() => {
            setShowAddForm(!showAddForm);
            if (showAddForm) setEditingId(null);
          }}
          className="btn btn-primary"
        >
          {showAddForm ? <Trash2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showAddForm ? 'Cancelar' : 'Nova Marca'}
        </button>
      </header>

      {showAddForm && (
        <div className="glass-panel p-8 border-primary/20 bg-primary/5">
          <h2 className="text-xl font-bold mb-6">{editingId ? 'Editar Marca' : 'Cadastrar Nova Marca'}</h2>
          <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-6">
            <div className="space-y-2 flex-1">
              <label className="text-sm font-semibold text-muted">Nome da Marca</label>
              <input 
                className="input py-3" 
                placeholder="Ex: Yoki, Camil..." 
                value={newBrand.name}
                onChange={e => setNewBrand({...newBrand, name: e.target.value})}
                required
              />
            </div>
            <div className="space-y-2 flex-1">
              <label className="text-sm font-semibold text-muted">Status</label>
              <select 
                className="input py-3"
                value={newBrand.status}
                onChange={e => setNewBrand({...newBrand, status: e.target.value})}
              >
                <option value="Aprovada">Aprovada (Pode comprar)</option>
                <option value="Reprovada">Reprovada (Não comprar)</option>
                <option value="Em Teste">Em Teste (Aguardando Parecer)</option>
              </select>
            </div>
            <div className="flex items-end">
              <button type="submit" className="btn btn-primary px-8 h-[50px]">
                <Save className="w-4 h-4" /> Salvar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="glass-panel p-6">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th className="w-16">Status</th>
                <th>Nome da Marca</th>
                <th className="text-center">Aprovada?</th>
                <th className="text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {brands.length === 0 && !loading ? (
                <tr>
                  <td colSpan={4} className="text-center py-12 text-muted italic">
                    Nenhuma marca cadastrada. Clique em "Nova Marca" para começar.
                  </td>
                </tr>
              ) : (
                brands.map((b) => (
                  <tr key={b.id} className={cn(
                    b.status === 'Reprovada' ? 'opacity-75 grayscale bg-danger/5' : ''
                  )}>
                    <td>
                      {b.status === 'Aprovada' && <CheckCircle className="w-6 h-6 text-success" />}
                      {b.status === 'Reprovada' && <XCircle className="w-6 h-6 text-danger" />}
                      {b.status === 'Em Teste' && <Package className="w-6 h-6 text-yellow-500" />}
                    </td>
                    <td>
                      <span className="font-bold text-lg">{b.name}</span>
                      <span className={cn(
                         "ml-3 px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-widest",
                         b.status === 'Aprovada' ? 'bg-success/20 text-success' :
                         b.status === 'Reprovada' ? 'bg-danger/20 text-danger' : 
                         'bg-yellow-500/20 text-yellow-500'
                      )}>{b.status}</span>
                    </td>
                    <td className="text-center">
                       <button
                         onClick={() => toggleStatus(b.id, b.status, b.name)}
                         className="text-xs font-bold px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 transition-colors"
                       >
                         Alternar
                       </button>
                    </td>
                    <td>
                      <div className="flex gap-2 items-center justify-end">
                        <button 
                          onClick={() => {
                            setEditingId(b.id);
                            setNewBrand({
                              name: b.name,
                              status: b.status
                            });
                            setShowAddForm(true);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className="p-2 hover:bg-white/5 rounded-lg text-primary transition-colors"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(b.id)}
                          className="p-2 hover:bg-white/5 rounded-lg text-danger transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
