import { describe, it, expect } from 'vitest';
import { USER_TRANSLATIONS, KIOSK_TRANSLATIONS, ADMIN_TRANSLATIONS, CUSTOMER_LOCALES } from './translations';

describe('Localization Integrity Verification', () => {
  it('should ensure all languages have the same translation keys in USER_TRANSLATIONS', () => {
    const englishKeys = Object.keys(USER_TRANSLATIONS.en);
    const languages = Object.keys(CUSTOMER_LOCALES) as Array<keyof typeof CUSTOMER_LOCALES>;

    languages.forEach(lang => {
      const currentKeys = Object.keys(USER_TRANSLATIONS[lang]);
      expect(currentKeys.length).toEqual(englishKeys.length);
      
      englishKeys.forEach(key => {
        expect(USER_TRANSLATIONS[lang]).toHaveProperty(key);
        expect(USER_TRANSLATIONS[lang][key]).toBeDefined();
        expect(USER_TRANSLATIONS[lang][key]).not.toBeNull();
      });
    });
  });

  it('should ensure all languages have the same keys in KIOSK_TRANSLATIONS', () => {
    const englishKeys = Object.keys(KIOSK_TRANSLATIONS.en);
    const kioskLanguages = Object.keys(KIOSK_TRANSLATIONS) as Array<keyof typeof KIOSK_TRANSLATIONS>;

    kioskLanguages.forEach(lang => {
      const currentKeys = Object.keys(KIOSK_TRANSLATIONS[lang]);
      expect(currentKeys.length).toEqual(englishKeys.length);
      
      englishKeys.forEach(key => {
        expect(KIOSK_TRANSLATIONS[lang]).toHaveProperty(key);
        expect(KIOSK_TRANSLATIONS[lang][key]).toBeDefined();
      });
    });
  });

  it('should ensure all languages have the same keys in ADMIN_TRANSLATIONS', () => {
    const englishKeys = Object.keys(ADMIN_TRANSLATIONS.en);
    const adminLanguages = Object.keys(ADMIN_TRANSLATIONS) as Array<keyof typeof ADMIN_TRANSLATIONS>;

    adminLanguages.forEach(lang => {
      const currentKeys = Object.keys(ADMIN_TRANSLATIONS[lang]);
      expect(currentKeys.length).toEqual(englishKeys.length);
      
      englishKeys.forEach(key => {
        expect(ADMIN_TRANSLATIONS[lang]).toHaveProperty(key);
        expect(ADMIN_TRANSLATIONS[lang][key]).toBeDefined();
      });
    });
  });
});
