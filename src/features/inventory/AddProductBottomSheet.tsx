import { FormEvent, useEffect, useState } from 'react';
import { InventoryItem, ItemLocation } from '@/types';
import { ProductLookupResult } from '@/features/scanner/productLookup';
import { getExpiryPresentation, normalizeItem } from './inventoryRepository';

interface AddProductBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveProduct: (product: InventoryItem) => void;
  initialProduct?: Partial<ProductLookupResult>;
}

const defaultExpiry = () => new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);

function suggestedLocation(category: string): ItemLocation {
  if (['Lácteos', 'Huevos', 'Carnes', 'Pescados', 'Embutidos'].includes(category)) return 'Nevera';
  if (category === 'Congelados') return 'Congelador';
  if (category === 'Frutas') return 'Frutas';
  if (category === 'Verduras') return 'Verduras';
  return 'Despensa';
}

export function AddProductBottomSheet({ isOpen, onClose, onSaveProduct, initialProduct }: AddProductBottomSheetProps) {
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState('uds');
  const [category, setCategory] = useState('Otros');
  const [location, setLocation] = useState<ItemLocation>('Despensa');
  const [expiryDate, setExpiryDate] = useState(defaultExpiry);
  const [barcode, setBarcode] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setName(initialProduct?.name || '');
    setQuantity(1);
    setUnit(initialProduct?.unit || 'uds');
    setCategory(initialProduct?.category || 'Otros');
    setLocation(initialProduct?.location || 'Despensa');
    setExpiryDate(defaultExpiry());
    setBarcode(initialProduct?.barcode || '');
    setNotes(initialProduct?.notes || '');
  }, [isOpen, initialProduct]);

  if (!isOpen) return null;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const presentation = getExpiryPresentation(expiryDate);
    onSaveProduct(normalizeItem({
      id: `item-${Date.now()}`,
      name: name.trim(), quantity, unit, category, location, expiryDate, barcode: barcode.trim() || undefined,
      notes: notes.trim() || undefined, imageUrl: initialProduct?.imageUrl, ...presentation,
    }));
    onClose();
  };

  const fieldClass = 'w-full px-3.5 py-2.5 rounded-lg border border-[#becab9] dark:border-[#3f4a3c] bg-white dark:bg-[#232623] text-[#1a1c1c] dark:text-[#faf9f9] font-medium text-sm focus:border-[#006e1c] focus:ring-1 focus:ring-[#006e1c] outline-none';

  return (
    <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-xs flex items-end justify-center" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="bg-[#faf9f9] dark:bg-[#1e211e] text-[#1a1c1c] dark:text-[#faf9f9] w-full max-w-[800px] rounded-t-2xl shadow-2xl max-h-[90vh] overflow-hidden border-t dark:border-[#2f3131]">
        <div className="w-full flex justify-center py-3"><div className="w-12 h-1.5 bg-[#becab9] dark:bg-[#3f4a3c] rounded-full" /></div>
        <div className="px-6 pb-8 overflow-y-auto max-h-[calc(90vh-30px)]">
          <h2 className="font-heading font-bold text-xl mb-1">{initialProduct?.name ? 'Confirma el producto' : 'Añadir producto'}</h2>
          <p className="text-xs text-[#6f7a6b] dark:text-[#becab9] mb-5">Completa los datos para controlar su caducidad.</p>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-xs font-bold text-[#3f4a3c] dark:text-[#becab9]">
            <label className="flex flex-col gap-1 uppercase tracking-wider">Nombre del producto<input autoFocus type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Leche entera" className={fieldClass} required /></label>
            <div className="flex gap-3">
              <label className="flex-1 flex flex-col gap-1 uppercase tracking-wider">Cantidad<input type="number" min="0.01" step="any" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} className={fieldClass} required /></label>
              <label className="w-1/3 flex flex-col gap-1 uppercase tracking-wider">Unidad<select value={unit} onChange={(e) => setUnit(e.target.value)} className={fieldClass}><option>uds</option><option>kg</option><option>g</option><option>L</option><option>ml</option></select></label>
            </div>
            <label className="flex flex-col gap-1 uppercase tracking-wider">Categoría<select value={category} onChange={(e) => { const value = e.target.value; setCategory(value); setLocation(suggestedLocation(value)); }} className={fieldClass}>{['Lácteos','Despensa','Frutas','Verduras','Huevos','Carnes','Embutidos','Pescados','Panadería','Bebidas','Congelados','Otros'].map((value) => <option key={value}>{value}</option>)}</select></label>
            <label className="flex flex-col gap-1 uppercase tracking-wider">Ubicación<select value={location} onChange={(e) => setLocation(e.target.value as ItemLocation)} className={fieldClass}>{['Nevera','Despensa','Congelador','Frutas','Verduras','Lácteos','Otros'].map((value) => <option key={value}>{value}</option>)}</select></label>
            <label className="flex flex-col gap-1 uppercase tracking-wider">Fecha de caducidad<input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className={fieldClass} required /></label>
            <label className="flex flex-col gap-1 uppercase tracking-wider">Código de barras<input inputMode="numeric" type="text" value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder="Opcional" className={fieldClass} /></label>
            <label className="flex flex-col gap-1 uppercase tracking-wider">Notas<textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Marca, formato u otros detalles" rows={2} className={`${fieldClass} resize-none`} /></label>
            <div className="flex gap-3 mt-3">
              <button type="button" onClick={onClose} className="px-5 border border-[#becab9] dark:border-[#3f4a3c] rounded-full font-bold">Cancelar</button>
              <button type="submit" className="flex-1 bg-[#006e1c] text-white py-3.5 rounded-full font-heading font-bold uppercase tracking-wider shadow-lg active:scale-95">Guardar producto</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
