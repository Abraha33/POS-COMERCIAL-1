import { useEffect, useState } from 'react';

const QUERY = '(max-width: 767px)';

const read = (): boolean => (typeof window.matchMedia === 'function' ? window.matchMedia(QUERY).matches : false);

/** `true` a ≤ 767 px: las tablas pasan a tarjetas (F-10). En jsdom `matchMedia` devuelve false → tabla. */
export const useIsMobile = (): boolean => {
  const [mobile, setMobile] = useState(read);
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return undefined;
    const media = window.matchMedia(QUERY);
    const onChange = () => setMobile(media.matches);
    onChange();
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);
  return mobile;
};
