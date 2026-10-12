import { useMemo } from 'react';
import { useSession } from '@/app/providers/SessionProvider';
import { useCountryPack } from '@/shared/api/countryPack';
import { channelsFromCountryPack, type PaymentChannel } from './channels';

/** Canales de cobro de la empresa activa, desde su CountryPack. Vacío mientras carga. */
export const usePosChannels = (): PaymentChannel[] => {
  const { session } = useSession();
  const pack = useCountryPack(session.regional?.countryCode);
  return useMemo(() => channelsFromCountryPack(pack.data), [pack.data]);
};
