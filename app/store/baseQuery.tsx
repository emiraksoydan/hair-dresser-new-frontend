import { fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { BaseQueryFn, FetchBaseQueryError } from '@reduxjs/toolkit/query';
import { tokenStore } from '../lib/tokenStore';
import { saveTokens, clearStoredTokens, loadTokens } from '../lib/tokenStorage';
import { jwtDecode } from 'jwt-decode';

export const API = 'http://192.168.1.106:5149/api/';

type Decoded = { exp?: number };


function extractTokens(body: any) {
  const wrapped = body && typeof body.success === 'boolean' && 'data' in body;
  const payload = wrapped ? body.data : body;
  const accessToken = payload?.accessToken ?? payload?.token;
  const refreshToken = payload?.refreshToken;
  if (!accessToken || !refreshToken) {
    throw new Error('Invalid refresh payload shape');
  }
  return { accessToken, refreshToken };
}


export const isExpired = (access: string, skewMs = 30_000) => {
  try {
    const { exp } = jwtDecode<Decoded>(access) || {};
    console.log(exp);
    if (!exp) return true;
    return exp * 1000 <= Date.now() + skewMs;
  } catch {
    return true;
  }
};

export const normalizeLoaded = (raw: any) => {
  const access = raw?.access ?? raw?.accessToken ?? raw?.token ?? null;
  const refresh = raw?.refresh ?? raw?.refreshToken ?? null;
  return access && refresh ? { access, refresh } : null;
};

const raw = fetchBaseQuery({
  baseUrl: API,
  prepareHeaders: (h) => {
    if (tokenStore.access) h.set('Authorization', `Bearer ${tokenStore.access}`);
    return h;
  },
});
const rawNoAuth = fetchBaseQuery({ baseUrl: API });

let refreshing: Promise<any> | null = null;

export const baseQueryWithReauth: BaseQueryFn<any, unknown, FetchBaseQueryError> =
  async (args, api, extra) => {
    let res = await raw(args, api, extra);
    if (res.error?.status === 401 || res.error?.status === 403 || res.error?.status === 419 || res.error?.status === 498 && tokenStore.refresh) {
      if (!refreshing) {
        refreshing = (async () => {
          try {
            const r = await rawNoAuth(
              { url: 'Auth/refresh', method: 'POST', body: { refreshToken: tokenStore.refresh } },
              api, extra
            );
            if ((r as any).error) throw new Error('HTTP error');
            const { accessToken, refreshToken } = extractTokens((r as any).data);
            tokenStore.set({ accessToken, refreshToken });
            await saveTokens({ accessToken, refreshToken });
            return true;
          } catch {
            tokenStore.clear();
            await clearStoredTokens();
            return false;
          }
        })();
      }
      const ok = await refreshing.finally(() => (refreshing = null));
      if (ok) res = await raw(args, api, extra);
    }
    return res;
  };


export async function rehydrateTokens() {
  const stored = await loadTokens();
  const norm = normalizeLoaded(stored);
  if (!norm) {
    tokenStore.clear?.();
    await clearStoredTokens();
    return;
  }
  tokenStore.set({ accessToken: norm.access, refreshToken: norm.refresh });
  if (isExpired(norm.access)) {
    try {
      const r = await rawNoAuth(
        { url: 'Auth/refresh', method: 'POST', body: { refreshToken: norm.refresh } },
        { type: 'rehydrate' } as any,
        {} as any
      );
      if ((r as any).error) throw new Error('HTTP error');
      const { accessToken, refreshToken } = extractTokens((r as any).data);
      tokenStore.set({ accessToken, refreshToken });
      await saveTokens({ accessToken, refreshToken });
    } catch {
      tokenStore.clear?.();
      await clearStoredTokens();
    }
  }
}
