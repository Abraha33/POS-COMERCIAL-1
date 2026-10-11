import { createContext, useContext, useMemo, useRef, type ReactNode } from 'react';
import { Toast } from 'primereact/toast';

type NotifyInput = { severity: 'success' | 'info' | 'warn' | 'error'; summary: string; detail?: string };
type Notify = (input: NotifyInput) => void;

const ToastContext = createContext<Notify | null>(null);

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const toastRef = useRef<Toast>(null);
  const notify = useMemo<Notify>(() => (input) => toastRef.current?.show({ life: 4000, ...input }), []);
  return (
    <ToastContext.Provider value={notify}>
      <Toast ref={toastRef} position="top-right" />
      {children}
    </ToastContext.Provider>
  );
};

export const useNotify = (): Notify => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useNotify debe usarse dentro de ToastProvider');
  return ctx;
};
