import { useEffect, useState } from 'react';

const QUERY = '(max-width: 640px)';

const read = (): boolean => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(QUERY).matches;

/** true en pantallas estrechas (≤ 640 px); en jsdom, sin matchMedia, es false. */
export const useNarrow = (): boolean => {
  const [narrow, setNarrow] = useState(read);
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return undefined;
    const media = window.matchMedia(QUERY);
    const update = () => setNarrow(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  return narrow;
};
