import { useSyncExternalStore } from 'react';

const subscribe = (notify: () => void) => {
  window.addEventListener('online', notify);
  window.addEventListener('offline', notify);
  return () => {
    window.removeEventListener('online', notify);
    window.removeEventListener('offline', notify);
  };
};

/** Estado de conectividad del navegador (`navigator.onLine`). No prueba el backend: solo la red del dispositivo. */
export const useOnlineStatus = (): boolean => useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
