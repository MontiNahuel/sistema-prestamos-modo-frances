const PARAMETROS_TOKEN_SSO = ['token', 'access_token', 'auth', 't'] as const;
const DEFAULT_SISTEMA_CENTRAL_URL = 'https://test.coopya.com.ar';

function normalizarToken(valor: string | null): string | null {
  const limpio = (valor || '').replace(/^Bearer\s+/i, '').trim();
  if (!limpio || limpio === 'null' || limpio === 'undefined') return null;
  return limpio;
}

export function extraerTokenSsoDeUrl(
  search: string,
  hash: string,
  pathname = '/'
): { token: string | null; nuevaUrl: string | null } {
  const queryParams = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const hashRaw = hash.startsWith('#') ? hash.slice(1) : hash;
  const hashEsQuery = hashRaw.includes('=');
  const hashParams = new URLSearchParams(hashEsQuery ? hashRaw : '');

  let tokenEncontrado: string | null = null;
  let modificado = false;

  for (const clave of PARAMETROS_TOKEN_SSO) {
    const valQuery = normalizarToken(queryParams.get(clave));
    if (queryParams.has(clave)) {
      if (!tokenEncontrado && valQuery) tokenEncontrado = valQuery;
      queryParams.delete(clave);
      modificado = true;
    }
    if (hashParams.has(clave)) {
      const valHash = normalizarToken(hashParams.get(clave));
      if (!tokenEncontrado && valHash) tokenEncontrado = valHash;
      hashParams.delete(clave);
      modificado = true;
    }
  }

  if (!modificado) {
    return { token: null, nuevaUrl: null };
  }

  const queryFinal = queryParams.toString();
  const hashFinal = hashEsQuery ? hashParams.toString() : hashRaw;
  const nuevaUrl =
    `${pathname || '/'}` +
    `${queryFinal ? `?${queryFinal}` : ''}` +
    `${hashFinal ? `#${hashFinal}` : ''}`;

  return { token: tokenEncontrado, nuevaUrl };
}

export function armarUrlSistemaCentral(baseUrl?: string | null, token?: string | null): string {
  const baseLimpia = (baseUrl || DEFAULT_SISTEMA_CENTRAL_URL).trim().replace(/\/+$/, '');
  const tokenLimpio = normalizarToken(token || null);
  if (!tokenLimpio) return `${baseLimpia}/`;
  return `${baseLimpia}/Principal/Inicio/${encodeURIComponent(tokenLimpio)}`;
}
