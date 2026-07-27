import { useEffect, useRef } from 'react';
import { BellRing, Camera, Loader2, ShieldAlert, X } from 'lucide-react';

export type PermissionKind = 'camera' | 'notifications';
export type AppPermissionState = 'prompt' | 'denied' | 'unsupported';

interface PermissionDialogProps {
  open: boolean;
  kind: PermissionKind;
  state?: AppPermissionState;
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const CONTENT = {
  camera: {
    promptTitle: 'Activa la cámara',
    promptDescription: 'Permite el acceso para escanear códigos de barras y registrar tus productos más rápido.',
    deniedDescription: 'El acceso a la cámara está bloqueado. Habilítalo desde los permisos del sitio en tu navegador.',
    unsupportedDescription: 'Este navegador no permite utilizar la cámara desde la aplicación.',
    note: 'La cámara solo se utiliza mientras el escáner está abierto.',
  },
  notifications: {
    promptTitle: 'Activa las notificaciones',
    promptDescription: 'Recibe alertas antes de que tus productos caduquen y mantén tu despensa bajo control.',
    deniedDescription: 'Las notificaciones están bloqueadas. Habilítalas desde los permisos del sitio en tu navegador.',
    unsupportedDescription: 'Este navegador no admite notificaciones del sistema.',
    note: 'Puedes cambiar este permiso desde los ajustes del navegador.',
  },
} as const;

export function PermissionDialog({
  open,
  kind,
  state = 'prompt',
  pending = false,
  onConfirm,
  onCancel,
}: PermissionDialogProps) {
  const primaryButtonRef = useRef<HTMLButtonElement>(null);
  const content = CONTENT[kind];
  const isBlocked = state === 'denied';
  const isUnsupported = state === 'unsupported';
  const isActionable = state === 'prompt';
  const title = isBlocked ? 'Permiso bloqueado' : isUnsupported ? 'Función no disponible' : content.promptTitle;
  const description = isBlocked
    ? content.deniedDescription
    : isUnsupported
      ? content.unsupportedDescription
      : content.promptDescription;

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const focusTimer = window.setTimeout(() => primaryButtonRef.current?.focus(), 0);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !pending) onCancel();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', handleKeyDown);
      previousFocus?.focus();
    };
  }, [open, pending, onCancel]);

  if (!open) return null;

  const Icon = isActionable ? (kind === 'camera' ? Camera : BellRing) : ShieldAlert;

  return (
    <div className="fixed inset-0 z-[100] bg-black/55 backdrop-blur-sm flex items-center justify-center p-5" onMouseDown={(event) => event.target === event.currentTarget && !pending && onCancel()}>
      <section role="dialog" aria-modal="true" aria-labelledby={`${kind}-permission-title`} aria-describedby={`${kind}-permission-description`} className="relative w-full max-w-sm rounded-3xl bg-white dark:bg-[#232623] text-[#1a1c1c] dark:text-[#faf9f9] px-6 py-7 shadow-2xl border border-black/5 dark:border-white/10 animate-in fade-in zoom-in-95 duration-200">
        <button type="button" onClick={onCancel} disabled={pending} aria-label="Cerrar" className="absolute right-4 top-4 w-8 h-8 rounded-full flex items-center justify-center text-[#6f7a6b] dark:text-[#becab9] hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-40">
          <X className="w-4 h-4" />
        </button>

        <div className={`mx-auto mb-5 w-16 h-16 rounded-full flex items-center justify-center ${isActionable ? 'bg-[#e6f6e9] dark:bg-[#16451f] text-[#006e1c] dark:text-[#81c784]' : 'bg-[#fff3e0] dark:bg-[#4a2d0a] text-[#a85b00] dark:text-[#ffcc80]'}`}>
          <Icon className="w-7 h-7" aria-hidden="true" />
        </div>

        <div className="text-center">
          <h2 id={`${kind}-permission-title`} className="font-heading text-xl font-bold tracking-tight">{title}</h2>
          <p id={`${kind}-permission-description`} className="mt-2 text-sm leading-relaxed text-[#52604f] dark:text-[#becab9]">{description}</p>
        </div>

        <div className="mt-6 flex flex-col gap-2.5">
          <button ref={primaryButtonRef} type="button" onClick={isActionable ? onConfirm : onCancel} disabled={pending} className="h-12 rounded-full bg-[#007d22] hover:bg-[#006e1c] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-wait">
            {pending && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{pending ? 'Solicitando permiso…' : isActionable ? 'Permitir' : 'Entendido'}</span>
          </button>
          {isActionable && (
            <button type="button" onClick={onCancel} disabled={pending} className="h-10 rounded-full text-[#007d22] dark:text-[#81c784] font-semibold text-sm hover:bg-[#007d22]/5 dark:hover:bg-[#81c784]/10 disabled:opacity-40">
              Quizás luego
            </button>
          )}
        </div>

        <p className="mt-5 text-center text-[10px] leading-relaxed text-[#6f7a6b] dark:text-[#a0aca0]">{content.note}</p>
      </section>
    </div>
  );
}
