const DEFAULT_CORS_ORIGINS = ['http://localhost:5173'];

export function parseCorsOrigins(corsOrigins?: string): string[] {
  if (!corsOrigins) {
    return DEFAULT_CORS_ORIGINS;
  }

  const origins = corsOrigins
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  return origins.length > 0 ? origins : DEFAULT_CORS_ORIGINS;
}
