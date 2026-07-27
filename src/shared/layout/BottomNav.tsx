import React from 'react';
import { Package, Utensils, QrCode, Settings } from 'lucide-react';
import { TabType } from '@/types';

interface BottomNavProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onSelectTab }) => {
  const navItems = [
    { id: 'inventory' as TabType, label: 'Inventario', icon: Package },
    { id: 'recipes' as TabType, label: 'Recetas', icon: Utensils },
    { id: 'scanner' as TabType, label: 'Escáner', icon: QrCode },
    { id: 'settings' as TabType, label: 'Ajustes', icon: Settings },
  ];

  if (currentTab === 'scanner') {
    // Suppress bottom nav on camera scanner screen for focused immersive view, per design rules
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#faf9f9]/95 dark:bg-[#1e211e]/95 backdrop-blur-md border-t border-[#becab9]/30 dark:border-[#2f3131] h-20 shadow-[0px_-4px_12px_rgba(0,0,0,0.05)] rounded-t-2xl max-w-[800px] mx-auto transition-colors">
      <div className="flex justify-around items-center h-full px-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`flex flex-col items-center justify-center transition-all duration-200 ${
                isActive
                  ? 'bg-[#ff9800] text-white px-4 py-1.5 rounded-full shadow-sm scale-100 font-semibold'
                  : 'text-[#3f4a3c] dark:text-[#becab9] hover:text-[#006e1c] dark:hover:text-[#4caf50] px-3 py-1 scale-95 hover:scale-100'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-white' : ''}`} />
              <span className="text-[11px] font-medium tracking-wide mt-0.5">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
