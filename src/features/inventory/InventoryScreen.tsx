import React, { useState, useMemo } from 'react';
import {
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  History,
  QrCode,
  Layers,
  Refrigerator,
  Package,
  Plus,
  Trash2,
  Edit2,
  X,
  Calendar,
  MapPin,
  Tag,
} from 'lucide-react';
import { InventoryItem, ItemStatus } from '@/types';

interface InventoryScreenProps {
  userName: string;
  items: InventoryItem[];
  onOpenScanner: () => void;
  onUpdateItem: (updatedItem: InventoryItem) => void;
  onDeleteItem: (itemId: string) => void;
  onAddNewItemClick: () => void;
}

export const InventoryScreen: React.FC<InventoryScreenProps> = ({
  userName,
  items,
  onOpenScanner,
  onUpdateItem,
  onDeleteItem,
  onAddNewItemClick,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<string>('Todos');
  const [selectedStatus, setSelectedStatus] = useState<ItemStatus | null>(null);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  // Calculate status percentages
  const stats = useMemo(() => {
    const total = items.length || 1;
    const seguroCount = items.filter((i) => i.status === 'seguro').length;
    const prontoCount = items.filter((i) => i.status === 'pronto').length;
    const urgenteCount = items.filter((i) => i.status === 'urgente').length;
    const caducadoCount = items.filter((i) => i.status === 'caducado').length;

    return {
      seguro: Math.round((seguroCount / total) * 100),
      pronto: Math.round((prontoCount / total) * 100),
      urgente: Math.round((urgenteCount / total) * 100),
      caducado: Math.round((caducadoCount / total) * 100),
    };
  }, [items]);

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesLocation =
        selectedLocation === 'Todos' ||
        item.location.toLowerCase() === selectedLocation.toLowerCase() ||
        item.category.toLowerCase() === selectedLocation.toLowerCase();

      const matchesStatus = !selectedStatus || item.status === selectedStatus;

      return matchesSearch && matchesLocation && matchesStatus;
    });
  }, [items, searchTerm, selectedLocation, selectedStatus]);

  const handleStatusCircleClick = (status: ItemStatus) => {
    if (selectedStatus === status) {
      setSelectedStatus(null);
    } else {
      setSelectedStatus(status);
    }
  };

  const locations: string[] = ['Todos', 'Nevera', 'Despensa', 'Frutas', 'Verduras', 'Lácteos'];

  const getBorderColor = (status: ItemStatus) => {
    switch (status) {
      case 'urgente':
        return 'border-l-[#ba1a1a]';
      case 'pronto':
        return 'border-l-[#ff9800]';
      case 'seguro':
        return 'border-l-[#006e1c]';
      case 'caducado':
        return 'border-l-[#6f7a6b] opacity-75 grayscale-[20%]';
    }
  };

  const getBadgeStyle = (status: ItemStatus) => {
    switch (status) {
      case 'urgente':
        return 'bg-[#ffdad6] text-[#93000a]';
      case 'pronto':
        return 'bg-[#ffdcbe] text-[#653900]';
      case 'seguro':
        return 'bg-[#d7f9df]/20 text-[#4caf50]';
      case 'caducado':
        return 'bg-[#e3e2e2] text-[#3f4a3c]';
    }
  };

  const getStatusIcon = (status: ItemStatus) => {
    switch (status) {
      case 'urgente':
        return <AlertTriangle className="w-4 h-4 text-[#ba1a1a]" />;
      case 'pronto':
        return <Clock className="w-4 h-4 text-[#8b5000]" />;
      case 'seguro':
        return <CheckCircle2 className="w-4 h-4 text-[#006e1c]" />;
      case 'caducado':
        return <History className="w-4 h-4 text-[#6f7a6b]" />;
    }
  };

  return (
    <main className="pt-20 pb-28 px-4 max-w-[800px] mx-auto min-h-screen">
      {/* Greeting Header */}
      <section className="mb-6">
        <h2 className="font-heading font-bold text-2xl text-[#1a1c1c] dark:text-[#faf9f9]">
          Buen día, {userName}
        </h2>
        <p className="text-[#3f4a3c] dark:text-[#becab9] text-sm mt-0.5">
          Aquí tienes el resumen de tu despensa.
        </p>
      </section>

      {/* Search and Category Filters */}
      <section className="mb-6 space-y-3">
        <div className="relative">
          <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-[#6f7a6b] dark:text-[#a0aca0]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar productos..."
            className="w-full h-12 pl-12 pr-4 bg-white dark:bg-[#232623] text-[#1a1c1c] dark:text-[#faf9f9] border border-[#becab9]/40 dark:border-[#3f4a3c] rounded-xl focus:ring-2 focus:ring-[#006e1c] focus:border-transparent outline-none transition-all shadow-sm text-sm"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6f7a6b] hover:text-[#1a1c1c] dark:hover:text-[#faf9f9]"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Horizontal Category Chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar -mx-1 px-1">
          {locations.map((loc) => {
            const isSelected = selectedLocation === loc;
            return (
              <button
                key={loc}
                onClick={() => setSelectedLocation(loc)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all active:scale-95 ${
                  isSelected
                    ? 'bg-[#006e1c] text-white shadow-sm'
                    : 'bg-white dark:bg-[#232623] text-[#3f4a3c] dark:text-[#becab9] border border-[#becab9]/40 dark:border-[#3f4a3c] hover:bg-[#f4f3f3] dark:hover:bg-[#2e332e]'
                }`}
              >
                {loc === 'Todos' && <Layers className="w-3.5 h-3.5" />}
                {loc === 'Nevera' && <Refrigerator className="w-3.5 h-3.5" />}
                {loc === 'Despensa' && <Package className="w-3.5 h-3.5" />}
                <span>{loc}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Inventory Status Dashboard Widget */}
      <section className="bg-white dark:bg-[#232623] rounded-2xl shadow-[0px_4px_12px_rgba(0,0,0,0.05)] p-4 mb-6 border border-[#becab9]/30 dark:border-[#2f3131]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#3f4a3c] dark:text-[#becab9]">
            ESTADO DEL INVENTARIO
          </h3>
          {selectedStatus && (
            <button
              onClick={() => setSelectedStatus(null)}
              className="text-xs text-[#006e1c] dark:text-[#4caf50] font-semibold hover:underline"
            >
              Mostrar todos
            </button>
          )}
        </div>

        <div className="grid grid-cols-4 gap-2 text-center">
          {/* Seguro (Green) */}
          <button
            onClick={() => handleStatusCircleClick('seguro')}
            className={`flex flex-col items-center gap-1.5 transition-all p-1.5 rounded-xl ${
              selectedStatus === 'seguro' ? 'ring-2 ring-[#006e1c] bg-[#006e1c]/5 dark:bg-[#006e1c]/20' : ''
            }`}
          >
            <div className="relative w-14 h-14 md:w-16 md:h-16 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="#e3e2e2" className="dark:stroke-[#3f4a3c]" strokeWidth="3" />
                <circle
                  cx="18"
                  cy="18"
                  r="15.5"
                  fill="none"
                  stroke="#4CAF50"
                  strokeWidth="3"
                  strokeDasharray={`${stats.seguro}, 100`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#006e1c] dark:text-[#4caf50]" />
                <span className="font-bold text-xs text-[#1a1c1c] dark:text-[#faf9f9]">{stats.seguro}%</span>
              </div>
            </div>
            <span className="text-xs font-bold text-[#006e1c] dark:text-[#4caf50]">Seguro</span>
          </button>

          {/* Pronto (Orange) */}
          <button
            onClick={() => handleStatusCircleClick('pronto')}
            className={`flex flex-col items-center gap-1.5 transition-all p-1.5 rounded-xl ${
              selectedStatus === 'pronto' ? 'ring-2 ring-[#ff9800] bg-[#ff9800]/5 dark:bg-[#ff9800]/20' : ''
            }`}
          >
            <div className="relative w-14 h-14 md:w-16 md:h-16 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="#e3e2e2" className="dark:stroke-[#3f4a3c]" strokeWidth="3" />
                <circle
                  cx="18"
                  cy="18"
                  r="15.5"
                  fill="none"
                  stroke="#ff9800"
                  strokeWidth="3"
                  strokeDasharray={`${stats.pronto}, 100`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <Clock className="w-3.5 h-3.5 text-[#8b5000] dark:text-[#ffb74d]" />
                <span className="font-bold text-xs text-[#1a1c1c] dark:text-[#faf9f9]">{stats.pronto}%</span>
              </div>
            </div>
            <span className="text-xs font-bold text-[#8b5000] dark:text-[#ffb74d]">Pronto</span>
          </button>

          {/* Urgente (Red) */}
          <button
            onClick={() => handleStatusCircleClick('urgente')}
            className={`flex flex-col items-center gap-1.5 transition-all p-1.5 rounded-xl ${
              selectedStatus === 'urgente' ? 'ring-2 ring-[#ba1a1a] bg-[#ba1a1a]/5 dark:bg-[#ba1a1a]/20' : ''
            }`}
          >
            <div className="relative w-14 h-14 md:w-16 md:h-16 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="#e3e2e2" className="dark:stroke-[#3f4a3c]" strokeWidth="3" />
                <circle
                  cx="18"
                  cy="18"
                  r="15.5"
                  fill="none"
                  stroke="#f44336"
                  strokeWidth="3"
                  strokeDasharray={`${stats.urgente}, 100`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <AlertTriangle className="w-3.5 h-3.5 text-[#ba1a1a] dark:text-[#ff8a80]" />
                <span className="font-bold text-xs text-[#1a1c1c] dark:text-[#faf9f9]">{stats.urgente}%</span>
              </div>
            </div>
            <span className="text-xs font-bold text-[#ba1a1a] dark:text-[#ff8a80]">Urgente</span>
          </button>

          {/* Caducado (Grey) */}
          <button
            onClick={() => handleStatusCircleClick('caducado')}
            className={`flex flex-col items-center gap-1.5 transition-all p-1.5 rounded-xl ${
              selectedStatus === 'caducado' ? 'ring-2 ring-[#6f7a6b] bg-[#6f7a6b]/5 dark:bg-[#6f7a6b]/20' : ''
            }`}
          >
            <div className="relative w-14 h-14 md:w-16 md:h-16 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="#e3e2e2" className="dark:stroke-[#3f4a3c]" strokeWidth="3" />
                <circle
                  cx="18"
                  cy="18"
                  r="15.5"
                  fill="none"
                  stroke="#6f7a6b"
                  strokeWidth="3"
                  strokeDasharray={`${stats.caducado}, 100`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <History className="w-3.5 h-3.5 text-[#6f7a6b] dark:text-[#a0aca0]" />
                <span className="font-bold text-xs text-[#1a1c1c] dark:text-[#faf9f9]">{stats.caducado}%</span>
              </div>
            </div>
            <span className="text-xs font-bold text-[#6f7a6b] dark:text-[#a0aca0]">Caducado</span>
          </button>
        </div>
      </section>

      {/* Product List Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-heading font-semibold text-xl text-[#1a1c1c] dark:text-[#faf9f9]">
          Mi Inventario ({filteredItems.length})
        </h2>
        <button
          onClick={onAddNewItemClick}
          className="flex items-center gap-1 text-xs font-bold text-[#006e1c] dark:text-[#4caf50] hover:bg-[#006e1c]/10 dark:hover:bg-[#006e1c]/20 px-2.5 py-1.5 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Añadir</span>
        </button>
      </div>

      {/* Empty State */}
      {filteredItems.length === 0 && (
        <div className="bg-white dark:bg-[#232623] rounded-2xl p-8 text-center border border-[#becab9]/30 dark:border-[#2f3131] my-4 flex flex-col items-center">
          <Package className="w-12 h-12 text-[#6f7a6b] dark:text-[#a0aca0] mb-2 opacity-50" />
          <p className="font-medium text-[#1a1c1c] dark:text-[#faf9f9]">No se encontraron productos</p>
          <p className="text-xs text-[#3f4a3c] dark:text-[#becab9] mt-1">
            Intenta cambiar los filtros o escanea un nuevo producto.
          </p>
          <button
            onClick={onAddNewItemClick}
            className="mt-4 bg-[#006e1c] text-white px-4 py-2 rounded-full text-xs font-bold shadow-sm"
          >
            Añadir Producto
          </button>
        </div>
      )}

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filteredItems.map((item) => (
          <div
            key={item.id}
            onClick={() => setEditingItem(item)}
            className={`bg-white dark:bg-[#232623] rounded-xl shadow-[0px_4px_12px_rgba(0,0,0,0.05)] overflow-hidden flex h-[104px] border-l-4 ${getBorderColor(
              item.status
            )} relative active:scale-[0.98] transition-all cursor-pointer hover:shadow-md border-t border-r border-b border-[#becab9]/20 dark:border-[#2f3131] group`}
          >
            <div className="w-24 h-full shrink-0 overflow-hidden bg-[#f4f3f3] dark:bg-[#1a1c1c]">
              <img
                src={item.imageUrl}
                alt={item.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>

            <div className="p-3 flex-1 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start gap-1">
                  <h3 className="font-heading font-semibold text-base leading-tight text-[#1a1c1c] dark:text-[#faf9f9] truncate">
                    {item.name}
                  </h3>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shrink-0 ${getBadgeStyle(
                      item.status
                    )}`}
                  >
                    {item.status}
                  </span>
                </div>
                <p className="text-[#3f4a3c] dark:text-[#becab9] text-xs mt-1">
                  {item.quantity} {item.unit} • {item.location}
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold">
                  {getStatusIcon(item.status)}
                  <span
                    className={
                      item.status === 'urgente'
                        ? 'text-[#ba1a1a] dark:text-[#ff8a80]'
                        : item.status === 'pronto'
                        ? 'text-[#8b5000] dark:text-[#ffb74d]'
                        : item.status === 'seguro'
                        ? 'text-[#006e1c] dark:text-[#4caf50]'
                        : 'text-[#6f7a6b] dark:text-[#d7f9df]'
                    }
                  >
                    {item.expiryLabel}
                  </span>
                </div>

                <Edit2 className="w-3.5 h-3.5 text-[#6f7a6b] dark:text-[#a0aca0] opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Floating Action Button (FAB) for Barcode Scanner */}
      <button
        onClick={onOpenScanner}
        title="Escanear código de barras"
        className="fixed bottom-24 right-6 w-14 h-14 bg-[#006e1c] hover:bg-[#4caf50] text-white rounded-full shadow-lg flex items-center justify-center active:scale-90 transition-transform z-40"
      >
        <QrCode className="w-7 h-7" />
      </button>

      {/* Quick Edit Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#232623] text-[#1a1c1c] dark:text-[#faf9f9] rounded-2xl w-full max-w-md p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 border border-transparent dark:border-[#2f3131]">
            <button
              onClick={() => setEditingItem(null)}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-[#6f7a6b] dark:text-[#becab9]"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <img
                src={editingItem.imageUrl}
                alt={editingItem.name}
                className="w-16 h-16 rounded-xl object-cover"
              />
              <div>
                <h3 className="font-heading font-bold text-lg text-[#1a1c1c] dark:text-[#faf9f9]">
                  {editingItem.name}
                </h3>
                <span
                  className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider mt-1 ${getBadgeStyle(
                    editingItem.status
                  )}`}
                >
                  {editingItem.status}
                </span>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex items-center justify-between text-sm py-1 border-b border-[#becab9]/20 dark:border-[#2f3131]">
                <span className="text-[#3f4a3c] dark:text-[#becab9] flex items-center gap-1">
                  <MapPin className="w-4 h-4 text-[#006e1c] dark:text-[#4caf50]" /> Ubicación
                </span>
                <span className="font-semibold">{editingItem.location}</span>
              </div>

              <div className="flex items-center justify-between text-sm py-1 border-b border-[#becab9]/20 dark:border-[#2f3131]">
                <span className="text-[#3f4a3c] dark:text-[#becab9] flex items-center gap-1">
                  <Calendar className="w-4 h-4 text-[#006e1c] dark:text-[#4caf50]" /> Caducidad
                </span>
                <span className="font-semibold">{editingItem.expiryLabel} ({editingItem.expiryDate})</span>
              </div>

              <div className="flex items-center justify-between text-sm py-1 border-b border-[#becab9]/20 dark:border-[#2f3131]">
                <span className="text-[#3f4a3c] dark:text-[#becab9] flex items-center gap-1">
                  <Tag className="w-4 h-4 text-[#006e1c] dark:text-[#4caf50]" /> Categoría
                </span>
                <span className="font-semibold">{editingItem.category}</span>
              </div>

              {/* Quantity Adjustment */}
              <div className="flex items-center justify-between text-sm pt-2">
                <span className="text-[#3f4a3c] dark:text-[#becab9] font-medium">Cantidad disponible:</span>
                <div className="flex items-center gap-3 bg-[#faf9f9] dark:bg-[#121413] border border-[#becab9]/40 dark:border-[#3f4a3c] rounded-lg p-1">
                  <button
                    onClick={() => {
                      if (editingItem.quantity > 1) {
                        const updated = { ...editingItem, quantity: editingItem.quantity - 1 };
                        setEditingItem(updated);
                        onUpdateItem(updated);
                      }
                    }}
                    className="w-8 h-8 bg-white dark:bg-[#2e332e] text-[#1a1c1c] dark:text-[#faf9f9] rounded-md flex items-center justify-center font-bold text-lg shadow-xs hover:bg-[#f4f3f3] dark:hover:bg-[#383d38]"
                  >
                    -
                  </button>
                  <span className="font-bold text-base w-12 text-center text-[#1a1c1c] dark:text-[#faf9f9]">
                    {editingItem.quantity} {editingItem.unit}
                  </span>
                  <button
                    onClick={() => {
                      const updated = { ...editingItem, quantity: editingItem.quantity + 1 };
                      setEditingItem(updated);
                      onUpdateItem(updated);
                    }}
                    className="w-8 h-8 bg-white dark:bg-[#2e332e] text-[#1a1c1c] dark:text-[#faf9f9] rounded-md flex items-center justify-center font-bold text-lg shadow-xs hover:bg-[#f4f3f3] dark:hover:bg-[#383d38]"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  onDeleteItem(editingItem.id);
                  setEditingItem(null);
                }}
                className="flex-1 border border-[#ba1a1a] text-[#ba1a1a] dark:text-[#ff8a80] hover:bg-[#ffdad6]/20 py-2.5 rounded-full text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-4 h-4" /> Consumido / Borrar
              </button>

              <button
                onClick={() => setEditingItem(null)}
                className="flex-1 bg-[#006e1c] text-white py-2.5 rounded-full text-xs font-bold hover:brightness-105 shadow-sm"
              >
                Listo
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};
