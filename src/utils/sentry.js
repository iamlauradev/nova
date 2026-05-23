import * as Sentry from '@sentry/react-native';

const DSN = process.env.SENTRY_DSN || '';

export function initSentry() {
  if (!DSN) return;
  Sentry.init({
    dsn: DSN,
    environment: __DEV__ ? 'development' : 'production',
    tracesSampleRate: __DEV__ ? 1.0 : 0.2,
    enabled: !__DEV__,
  });
}

export { Sentry };
