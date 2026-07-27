import React from 'react';
import { RefreshCw, Package, ArrowLeft } from 'lucide-react';
import { TabType } from '@/types';

interface HeaderProps {
  currentTab: TabType;
  userName?: string;
  onRefresh?: () => void;
  onBack?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ currentTab, onRefresh, onBack }) => {
  const getTitle = () => {
    switch (currentTab) {
      case 'inventory':
        return 'Despensa Cero';
      case 'recipes':
        return 'Recetas';
      case 'scanner':
        return 'Escáner de Productos';
      case 'settings':
        return 'Ajustes';
      default:
        return 'Despensa Cero';
    }
  };

  if (currentTab === 'scanner') {
    // Scanner uses its own toolbar inside ScannerScreen
    return null;
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-[#faf9f9]/90 dark:bg-[#121413]/90 backdrop-blur-md border-b border-[#e3e2e2] dark:border-[#2f3131] h-16 flex items-center justify-center transition-colors">
      <div className="flex items-center justify-between px-4 w-full max-w-[800px] mx-auto">
        <div className="flex items-center gap-2">
          {onBack ? (
            <button
              onClick={onBack}
              className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 transition-all text-[#006e1c] dark:text-[#4caf50]"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          ) : (
            <div className="w-9 h-9 rounded-xl bg-[#006e1c]/10 dark:bg-[#006e1c]/25 flex items-center justify-center text-[#006e1c] dark:text-[#4caf50]">
              <Package className="w-5 h-5" />
            </div>
          )}
          <h1 className="font-heading font-bold text-xl text-[#006e1c] dark:text-[#4caf50] tracking-tight">
            {getTitle()}
          </h1>
        </div>

        {onRefresh && (
          <button
            onClick={onRefresh}
            title="Sincronizar datos"
            className="p-2 rounded-full text-[#3f4a3c] dark:text-[#becab9] hover:bg-black/5 dark:hover:bg-white/10 active:rotate-180 transition-all duration-300"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        )}
      </div>
    </header>
  );
};
