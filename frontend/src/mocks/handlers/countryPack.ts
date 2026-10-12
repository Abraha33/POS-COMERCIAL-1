import { http, HttpResponse } from 'msw';
import { db } from '../db';
import { authenticate, notFound, unauthorized } from '../http';

export const countryPackHandlers = [
  // v0.7.0 (PROPUESTA): paquete de país. Cualquier usuario autenticado lo lee (es dato de referencia).
  http.get('/api/v1/pos/country-pack', ({ request }) => {
    const user = authenticate(request);
    if (!user) return unauthorized();
    const code = new URL(request.url).searchParams.get('countryCode');
    if (code && code.toUpperCase() !== db.countryPack.countryCode) return notFound('Paquete de país');
    return HttpResponse.json(db.countryPack);
  }),
];
