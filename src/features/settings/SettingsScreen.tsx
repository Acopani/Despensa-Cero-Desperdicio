import React, { useState } from 'react';
import {
  Bell,
  Clock,
  Hourglass,
  Moon,
  Ruler,
  Globe,
  RefreshCw,
  Trash2,
  HelpCircle,
  FileText,
  LogOut,
  Edit2,
  CheckCircle2,
} from 'lucide-react';
import { EditNameDialog } from './EditNameDialog';
import { AppPermissionState, PermissionDialog } from '@/shared/components/PermissionDialog';
import { getNotificationPermissionState, requestNotificationPermission } from '@/shared/services/notifications';
import { UserProfile } from '@/types';

interface SettingsScreenProps {
  user: UserProfile;
  onUpdateUser: (updatedUser: UserProfile) => void;
  onClearCache: () => void;
  onRefreshData: () => void;
  onLogout: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  user,
  onUpdateUser,
  onClearCache,
  onRefreshData,
  onLogout,
}) => {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isNameDialogOpen, setIsNameDialogOpen] = useState(false);
  const [pendingNotificationSetting, setPendingNotificationSetting] = useState<'alerts' | 'daily' | null>(null);
  const [permissionDialogState, setPermissionDialogState] = useState<AppPermissionState>('prompt');
  const [permissionPending, setPermissionPending] = useState(false);

  const showNotification = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const updateNotificationSetting = (setting: 'alerts' | 'daily', enabled: boolean) => {
    onUpdateUser({
      ...user,
      notificationsAlerts: setting === 'alerts' ? enabled : user.notificationsAlerts,
      notificationsDaily: setting === 'daily' ? enabled : user.notificationsDaily,
    });
    const label = setting === 'alerts' ? 'Alertas de caducidad' : 'Resumen diario';
    showNotification(`${label} ${enabled ? 'activado' : 'desactivado'}`);
  };

  const toggleNotificationSetting = (setting: 'alerts' | 'daily') => {
    const currentlyEnabled = setting === 'alerts' ? user.notificationsAlerts : user.notificationsDaily;
    if (currentlyEnabled) {
      updateNotificationSetting(setting, false);
      return;
    }

    const state = getNotificationPermissionState();
    if (state === 'granted') {
      updateNotificationSetting(setting, true);
      return;
    }

    setPendingNotificationSetting(setting);
    setPermissionDialogState(state);
  };

  const confirmNotificationPermission = async () => {
    if (!pendingNotificationSetting || permissionPending) return;
    setPermissionPending(true);
    try {
      if (await requestNotificationPermission()) {
        updateNotificationSetting(pendingNotificationSetting, true);
        setPendingNotificationSetting(null);
      } else {
        const nextState = getNotificationPermissionState();
        if (nextState === 'granted') {
          updateNotificationSetting(pendingNotificationSetting, true);
          setPendingNotificationSetting(null);
        } else {
          setPermissionDialogState(nextState);
        }
      }
    } finally {
      setPermissionPending(false);
    }
  };

  const dismissNotificationPermission = () => {
    if (permissionPending) return;
    setPendingNotificationSetting(null);
  };

  const toggleAlerts = () => toggleNotificationSetting('alerts');
  const toggleDaily = () => toggleNotificationSetting('daily');

  const openNameDialog = () => setIsNameDialogOpen(true);

  const saveName = (name: string) => {
    onUpdateUser({ ...user, name });
    setIsNameDialogOpen(false);
    showNotification('Nombre actualizado');
  };

  const toggleDarkMode = () => {
    const updated = { ...user, darkMode: !user.darkMode };
    onUpdateUser(updated);
    if (updated.darkMode) {
      document.documentElement.classList.add('dark');
      showNotification('Modo oscuro activado');
    } else {
      document.documentElement.classList.remove('dark');
      showNotification('Modo claro activado');
    }
  };

  return (
    <main className="pt-20 pb-28 px-4 max-w-[800px] mx-auto min-h-screen space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-[#006e1c] text-white px-4 py-2 rounded-full shadow-lg text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      <PermissionDialog
        open={pendingNotificationSetting !== null}
        kind="notifications"
        state={permissionDialogState}
        pending={permissionPending}
        onConfirm={() => void confirmNotificationPermission()}
        onCancel={dismissNotificationPermission}
      />

      <EditNameDialog
        open={isNameDialogOpen}
        currentName={user.name}
        onSave={saveName}
        onClose={() => setIsNameDialogOpen(false)}
      />

      {/* Section: Perfil */}
      <section>
        <div className="bg-white dark:bg-[#232623] card-shadow rounded-2xl p-4 flex items-center gap-4 border-l-[4px] border-[#006e1c] border-t border-r border-b border-[#becab9]/20 dark:border-[#2f3131]">
          <div className="w-16 h-16 rounded-full bg-[#e3e2e2] dark:bg-[#3f4a3c] overflow-hidden shrink-0">
            <img
              src={user.avatarUrl}
              alt={user.name}
              className="w-full h-full object-cover"
            />
          </div>

          <div className="flex-1 min-w-0">
            <h2 className="font-heading font-semibold text-lg text-[#1a1c1c] dark:text-[#faf9f9] truncate">
              {user.name}
            </h2>
          </div>

          <button
            type="button"
            onClick={openNameDialog}
            aria-label="Editar nombre"
            className="text-[#006e1c] dark:text-[#4caf50] p-2 hover:bg-[#006e1c]/10 dark:hover:bg-[#006e1c]/20 rounded-full transition-colors"
          >
            <Edit2 className="w-5 h-5" />
          </button>
        </div>
      </section>

      {/* Section: Notificaciones */}
      <section className="space-y-2">
        <h3 className="text-xs font-bold tracking-wider uppercase text-[#3f4a3c] dark:text-[#becab9] px-1">
          NOTIFICACIONES
        </h3>

        <div className="bg-white dark:bg-[#232623] card-shadow rounded-2xl overflow-hidden divide-y divide-[#becab9]/20 dark:divide-[#2f3131] border border-[#becab9]/30 dark:border-[#2f3131]">
          {/* Toggle 1 */}
          <div className="flex items-center justify-between p-4 h-16">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-[#3f4a3c] dark:text-[#becab9]" />
              <span className="text-sm font-medium text-[#1a1c1c] dark:text-[#faf9f9]">Alertas de Caducidad</span>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={user.notificationsAlerts}
                onChange={toggleAlerts}
                disabled={permissionPending}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-[#e3e2e2] dark:bg-[#3f4a3c] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#4caf50]" />
            </label>
          </div>

          {/* Toggle 2 */}
          <div className="flex items-center justify-between p-4 h-16">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-[#3f4a3c] dark:text-[#becab9]" />
              <span className="text-sm font-medium text-[#1a1c1c] dark:text-[#faf9f9]">Resumen diario al abrir</span>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={user.notificationsDaily}
                onChange={toggleDaily}
                disabled={permissionPending}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-[#e3e2e2] dark:bg-[#3f4a3c] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#4caf50]" />
            </label>
          </div>

          {/* Dropdown */}
          <div className="flex items-center justify-between p-4 h-16">
            <div className="flex items-center gap-3">
              <Hourglass className="w-5 h-5 text-[#3f4a3c] dark:text-[#becab9]" />
              <span className="text-sm font-medium text-[#1a1c1c] dark:text-[#faf9f9]">Tiempo de Antelación</span>
            </div>

            <select
              value={user.advanceDays}
              onChange={(e) => {
                const days = Number(e.target.value);
                onUpdateUser({ ...user, advanceDays: days });
                showNotification(`Antelación cambiada a ${days} días`);
              }}
              className="bg-[#f4f3f3] dark:bg-[#121413] border-none rounded-lg font-bold text-xs text-[#006e1c] dark:text-[#4caf50] h-9 px-3 outline-none focus:ring-1 focus:ring-[#006e1c]"
            >
              <option value={1}>1 día</option>
              <option value={3}>3 días</option>
              <option value={5}>5 días</option>
            </select>
          </div>
        </div>
      </section>

      {/* Section: Preferencias */}
      <section className="space-y-2">
        <h3 className="text-xs font-bold tracking-wider uppercase text-[#3f4a3c] dark:text-[#becab9] px-1">
          PREFERENCIAS
        </h3>

        <div className="bg-white dark:bg-[#232623] card-shadow rounded-2xl overflow-hidden divide-y divide-[#becab9]/20 dark:divide-[#2f3131] border border-[#becab9]/30 dark:border-[#2f3131]">
          <div className="flex items-center justify-between p-4 h-16">
            <div className="flex items-center gap-3">
              <Moon className="w-5 h-5 text-[#3f4a3c] dark:text-[#becab9]" />
              <span className="text-sm font-medium text-[#1a1c1c] dark:text-[#faf9f9]">Modo Oscuro</span>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={user.darkMode}
                onChange={toggleDarkMode}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-[#e3e2e2] dark:bg-[#3f4a3c] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#4caf50]" />
            </label>
          </div>

          <div className="flex items-center justify-between p-4 h-16">
            <div className="flex items-center gap-3">
              <Ruler className="w-5 h-5 text-[#3f4a3c] dark:text-[#becab9]" />
              <span className="text-sm font-medium text-[#1a1c1c] dark:text-[#faf9f9]">Sistema de Unidades</span>
            </div>
            <span className="text-xs font-bold text-[#006e1c] dark:text-[#4caf50]">{user.unitSystem}</span>
          </div>

          <div className="flex items-center justify-between p-4 h-16">
            <div className="flex items-center gap-3">
              <Globe className="w-5 h-5 text-[#3f4a3c] dark:text-[#becab9]" />
              <span className="text-sm font-medium text-[#1a1c1c] dark:text-[#faf9f9]">Idioma</span>
            </div>
            <span className="text-xs font-bold text-[#006e1c] dark:text-[#4caf50]">{user.language}</span>
          </div>
        </div>
      </section>

      {/* Section: Aplicación (PWA) */}
      <section className="space-y-3">
        <h3 className="text-xs font-bold tracking-wider uppercase text-[#3f4a3c] dark:text-[#becab9] px-1">
          APLICACIÓN (PWA)
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={() => {
              onRefreshData();
              showNotification('Caducidades actualizadas');
            }}
            className="bg-[#006e1c] hover:bg-[#4caf50] text-white h-12 rounded-full font-bold text-xs flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Actualizar Datos</span>
          </button>

          <button
            onClick={() => {
              if (confirm('¿Eliminar la caché de productos consultados y recetas generadas? Tu inventario se conservará.')) {
                onClearCache();
                showNotification('Caché eliminada; el inventario se conservó');
              }
            }}
            className="bg-white dark:bg-[#232623] border-2 border-[#006e1c] text-[#006e1c] dark:text-[#4caf50] hover:bg-[#006e1c]/5 dark:hover:bg-[#006e1c]/20 h-12 rounded-full font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all"
          >
            <Trash2 className="w-4 h-4" />
            <span>Borrar Caché</span>
          </button>
        </div>

        <p className="text-center text-xs font-bold text-[#3f4a3c] dark:text-[#becab9] py-2">Versión 1.0.0</p>
      </section>

      {/* Section: Ayuda y Legal */}
      <section className="space-y-2">
        <h3 className="text-xs font-bold tracking-wider uppercase text-[#3f4a3c] dark:text-[#becab9] px-1">
          AYUDA Y LEGAL
        </h3>

        <div className="bg-white dark:bg-[#232623] card-shadow rounded-2xl overflow-hidden divide-y divide-[#becab9]/20 dark:divide-[#2f3131] border border-[#becab9]/30 dark:border-[#2f3131]">
          <button
            onClick={() => alert('Centro de Ayuda Despensa Cero: escanea códigos, gestiona caducidades y crea recetas sin desperdicio.')}
            className="flex items-center justify-between w-full p-4 h-16 text-left hover:bg-[#f4f3f3] dark:hover:bg-[#2e332e] transition-colors"
          >
            <div className="flex items-center gap-3">
              <HelpCircle className="w-5 h-5 text-[#3f4a3c] dark:text-[#becab9]" />
              <span className="text-sm font-medium text-[#1a1c1c] dark:text-[#faf9f9]">Centro de Ayuda</span>
            </div>
          </button>

          <button
            onClick={() => alert('Despensa Cero respeta tu privacidad y promueve el consumo responsable de alimentos.')}
            className="flex items-center justify-between w-full p-4 h-16 text-left hover:bg-[#f4f3f3] dark:hover:bg-[#2e332e] transition-colors"
          >
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-[#3f4a3c] dark:text-[#becab9]" />
              <span className="text-sm font-medium text-[#1a1c1c] dark:text-[#faf9f9]">Términos y Condiciones</span>
            </div>
          </button>

          <button
            onClick={onLogout}
            className="flex items-center justify-between w-full p-4 h-16 text-left hover:bg-[#ffdad6]/20 transition-colors group"
          >
            <div className="flex items-center gap-3 text-[#ba1a1a] dark:text-[#ff8a80]">
              <LogOut className="w-5 h-5" />
              <span className="text-sm font-bold">Cerrar Sesión</span>
            </div>
          </button>
        </div>
      </section>
    </main>
  );
};
