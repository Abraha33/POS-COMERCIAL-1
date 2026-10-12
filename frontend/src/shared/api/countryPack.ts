import { useQuery } from '@tanstack/react-query';
import { countryPackSchema, type CountryPack } from '@/shared/contracts';
import { api, type ApiError } from './client';

/** Paquete de país (v0.7.0, PROPUESTA): canales de pago, tipos de documento, denominaciones y moneda. */
export const useCountryPack = (countryCode?: string) =>
  useQuery<CountryPack, ApiError>({
    queryKey: ['country-pack', countryCode ?? null],
    queryFn: () =>
      api.get(`/pos/country-pack${countryCode ? `?countryCode=${encodeURIComponent(countryCode)}` : ''}`, countryPackSchema),
    staleTime: Infinity,
  });
