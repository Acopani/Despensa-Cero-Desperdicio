import React, { useState } from 'react';
import { Package, ArrowRight, User } from 'lucide-react';

interface LoginScreenProps {
  onLogin: (userName: string) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [name, setName] = useState('Usuario');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onLogin(name.trim());
    }
  };

  return (
    <div className="min-h-screen bg-[#faf9f9] dark:bg-[#121413] text-[#1a1c1c] dark:text-[#faf9f9] flex flex-col items-center justify-center p-4 relative overflow-hidden transition-colors">
      {/* Main Container */}
      <main className="w-full max-w-[400px] z-10 flex flex-col items-center">
        {/* Header Branding */}
        <header className="text-center mb-8">
          <div className="flex items-center justify-center mb-3">
            <div className="w-16 h-16 rounded-2xl bg-[#006e1c]/10 dark:bg-[#006e1c]/25 flex items-center justify-center text-[#006e1c] dark:text-[#4caf50] shadow-sm">
              <Package className="w-10 h-10" />
            </div>
          </div>
          <h1 className="font-heading font-bold text-3xl text-[#006e1c] dark:text-[#4caf50] tracking-tight">
            Despensa Cero
          </h1>
          <p className="text-[#3f4a3c] dark:text-[#becab9] text-sm mt-1 max-w-[280px] mx-auto leading-relaxed">
            Gestiona tu cocina con inteligencia y sostenibilidad.
          </p>
        </header>

        {/* Login Form Card */}
        <section className="w-full bg-white dark:bg-[#232623] rounded-2xl p-6 shadow-[0px_4px_16px_rgba(0,0,0,0.06)] border border-[#e3e2e2] dark:border-[#2f3131] flex flex-col gap-4">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="name" className="text-xs font-bold uppercase tracking-wider text-[#3f4a3c] dark:text-[#becab9] ml-1">
                Nombre
              </label>
              <div className="flex items-center border border-[#becab9]/60 dark:border-[#3f4a3c] rounded-xl px-3.5 h-12 bg-[#faf9f9] dark:bg-[#121413] focus-within:border-[#4caf50] focus-within:ring-2 focus-within:ring-[#4caf50]/20 transition-all">
                <User className="w-5 h-5 text-[#6f7a6b] dark:text-[#a0aca0] mr-2 shrink-0" />
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Tu nombre"
                  className="bg-transparent border-none focus:outline-none w-full text-sm text-[#1a1c1c] dark:text-[#faf9f9]"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="bg-[#4caf50] text-white h-12 rounded-full font-heading font-semibold text-base flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-md hover:brightness-105 mt-2"
            >
              <span>Iniciar Sesión</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </form>
        </section>

        {/* Decorative Kitchen Image Preview */}
        <div className="mt-8 w-full rounded-2xl overflow-hidden h-36 relative shadow-md">
          <img
            src="https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&q=80&w=600"
            alt="Cocina organizada sostenible"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent flex items-end p-4">
            <span className="text-white text-xs font-medium tracking-wide drop-shadow-sm">
              Alimentos frescos • Cero desperdicio
            </span>
          </div>
        </div>
      </main>
    </div>
  );
};
