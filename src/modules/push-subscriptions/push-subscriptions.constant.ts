export const ALLOWED_PUSH_ENDPOINT_HOSTS = [
  'fcm.googleapis.com',
  'updates.push.services.mozilla.com',
  'push.services.mozilla.com',
  'web.push.apple.com',
] as const;

export const ALLOWED_PUSH_ENDPOINT_SUFFIXES = ['.notify.windows.com'] as const;
