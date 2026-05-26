import React, { createContext, useContext, useState, useCallback } from 'react';
import type { Toast, ToastType } from '../types';

interface ToastContextType {
  toasts: Toast[];
  showToast: (message: string, type?: ToastType) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => removeToast(id), 4000);
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
};

function ToastContainer({ toasts, removeToast }: { toasts: Toast[]; removeToast: (id: string) => void }) {
  if (!toasts.length) return null;
  return (
    <div className="fixed bottom-6 right-6 z-[999] flex flex-col gap-3 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          onClick={() => removeToast(toast.id)}
          className={`pointer-events-auto flex items-center gap-3 px-5 py-3 rounded-xl shadow-xl text-sm font-bold cursor-pointer transition-all animate-slide-up ${
            toast.type === 'success' ? 'bg-green-600 text-white'
            : toast.type === 'error' ? 'bg-red-600 text-white'
            : toast.type === 'warning' ? 'bg-amber-500 text-white'
            : 'bg-navy text-white'
          }`}
        >
          <span>{toast.message}</span>
        </div>
      ))}
    </div>
  );
}

export const useToast = (): ToastContextType => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};
