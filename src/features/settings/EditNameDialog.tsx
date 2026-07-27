import { FormEvent, useEffect, useState } from 'react';
import { Edit2 } from 'lucide-react';

interface EditNameDialogProps {
  open: boolean;
  currentName: string;
  onSave: (name: string) => void;
  onClose: () => void;
}

export function EditNameDialog({ open, currentName, onSave, onClose }: EditNameDialogProps) {
  const [name, setName] = useState(currentName);

  useEffect(() => {
    if (!open) return;
    setName(currentName);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [currentName, onClose, open]);

  if (!open) return null;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextName = name.trim();
    if (nextName) onSave(nextName);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/55 backdrop-blur-sm flex items-center justify-center p-5" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <form onSubmit={handleSubmit} role="dialog" aria-modal="true" aria-labelledby="edit-name-title" className="w-full max-w-sm rounded-3xl bg-white dark:bg-[#232623] text-[#1a1c1c] dark:text-[#faf9f9] px-6 py-7 shadow-2xl border border-black/5 dark:border-white/10 animate-in fade-in zoom-in-95 duration-200">
        <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-[#e6f6e9] dark:bg-[#16451f] text-[#006e1c] dark:text-[#81c784] flex items-center justify-center">
          <Edit2 className="w-6 h-6" />
        </div>
        <h2 id="edit-name-title" className="font-heading text-xl font-bold text-center">Editar nombre</h2>
        <p className="mt-2 text-sm text-center text-[#52604f] dark:text-[#becab9]">Escribe el nombre que deseas mostrar en la aplicación.</p>
        <label className="block mt-5 text-xs font-bold uppercase tracking-wider text-[#3f4a3c] dark:text-[#becab9]">
          Nombre de usuario
          <input autoFocus type="text" value={name} onChange={(event) => setName(event.target.value)} maxLength={50} required className="mt-1.5 w-full h-12 px-4 rounded-xl border border-[#becab9] dark:border-[#3f4a3c] bg-white dark:bg-[#121413] text-[#1a1c1c] dark:text-[#faf9f9] normal-case tracking-normal text-sm outline-none focus:border-[#006e1c] focus:ring-2 focus:ring-[#006e1c]/20" />
        </label>
        <div className="mt-6 flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 h-11 rounded-full border border-[#becab9] dark:border-[#3f4a3c] font-bold text-sm text-[#3f4a3c] dark:text-[#becab9]">Cancelar</button>
          <button type="submit" disabled={!name.trim()} className="flex-1 h-11 rounded-full bg-[#007d22] hover:bg-[#006e1c] text-white font-bold text-sm disabled:opacity-50">Guardar</button>
        </div>
      </form>
    </div>
  );
}
