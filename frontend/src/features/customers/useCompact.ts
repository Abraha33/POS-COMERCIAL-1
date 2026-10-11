import { useEffect, useState } from 'react';

const COMPACT_QUERY = '(max-width: 768px)';

/** true en pantallas ≤ 768 px: las tablas pasan a tarjetas (sin desborde horizontal). */
export const useCompact = (query: string = COMPACT_QUERY): boolean => {
  const [compact, setCompact] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const list = window.matchMedia(query);
    const update = () => setCompact(list.matches);
    update();
    list.addEventListener('change', update);
    return () => list.removeEventListener('change', update);
  }, [query]);
  return compact;
};
