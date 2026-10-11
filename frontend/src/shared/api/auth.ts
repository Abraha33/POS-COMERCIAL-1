import { useMutation } from '@tanstack/react-query';
import { authSessionSchema, type AuthSession, type Login } from '@/shared/contracts';
import { api, setAccessToken, type ApiError } from './client';

/** Inicia sesión y deja el token listo para las siguientes peticiones. */
export const useLogin = () =>
  useMutation<AuthSession, ApiError, Login>({
    mutationFn: (input) => api.post('/auth/login', input, authSessionSchema),
    onSuccess: (auth) => setAccessToken(auth.accessToken),
  });
