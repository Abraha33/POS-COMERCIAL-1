import { useEffect, useState } from 'react';

const QUERY = '(max-width: 640px)';

const read = (): boolean =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(QUERY).matches;

/** Verdadero en móvil (≤ 640 px): las tablas pasan a tarjetas. En entornos sin matchMedia (jsdom) → false. */
export const useIsPhone = (): boolean => {
  const [phone, setPhone] = useState(read);
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return undefined;
    const media = window.matchMedia(QUERY);
    const onChange = () => setPhone(media.matches);
    onChange();
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);
  return phone;
};
