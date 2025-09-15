import { getRequestConfig } from 'next-intl/server';

const locales = ['es', 'en'] as const;

export default getRequestConfig(async ({ requestLocale }) => {
  // This typically corresponds to the `[locale]` segment
  let locale = await requestLocale;

  // Ensure that a valid locale is used
  if (!locale || !locales.includes(locale as any)) {
    locale = 'es';
  }

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
