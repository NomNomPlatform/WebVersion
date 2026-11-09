const RAW_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "").trim();

/** Google OAuth 2.0 client id injected by Vite at build/dev time. */
export const GOOGLE_CLIENT_ID = RAW_ID;

export const isGoogleLoginConfigured = GOOGLE_CLIENT_ID.length > 0;
