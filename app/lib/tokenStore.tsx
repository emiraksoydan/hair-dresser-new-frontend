let accessToken: string | null = null;
let refreshToken: string | null = null;

export const tokenStore = {
  get access() { return accessToken; },
  get refresh() { return refreshToken; },
  set(tokens: { accessToken: string; refreshToken: string }) {
    accessToken = tokens.accessToken;
    refreshToken = tokens.refreshToken;
  },
  clear() {
    accessToken = null;
    refreshToken = null;
  }
};
