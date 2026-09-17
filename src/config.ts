const configuredApiBaseUrl = (
  import.meta.env?.VITE_API_BASE_URL as string | undefined
)?.trim();

if (import.meta.env?.PROD && !configuredApiBaseUrl) {
  throw new Error('VITE_API_BASE_URL must be configured for production');
}

export const config = {
  apiBaseUrl: configuredApiBaseUrl || 'http://localhost:3000',
  rerollLimit: 3,
  cacheTime: 5 * 60 * 1000,
} as const;
