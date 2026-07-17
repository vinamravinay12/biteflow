import { useEffect } from 'react';

// Languages written right-to-left. Arabic is the one RTL locale BiteFlow ships.
const RTL_LANGUAGES = new Set(['ar']);

export const isRtl = (lang: string): boolean => RTL_LANGUAGES.has(lang);

/**
 * Keeps the document's <html lang> and <html dir> attributes in sync with the
 * currently selected UI language. This is an accessibility requirement, not
 * cosmetic: screen readers switch pronunciation/voice off `lang`, and `dir`
 * gives assistive tech and the browser the correct reading order for Arabic.
 */
export function useDocumentLanguage(lang: string): void {
  useEffect(() => {
    const root = document.documentElement;
    const previousLang = root.lang;
    const previousDir = root.getAttribute('dir');

    root.lang = lang;
    root.dir = isRtl(lang) ? 'rtl' : 'ltr';

    return () => {
      root.lang = previousLang;
      if (previousDir) root.setAttribute('dir', previousDir);
      else root.removeAttribute('dir');
    };
  }, [lang]);
}
