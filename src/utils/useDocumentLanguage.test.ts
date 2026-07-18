import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

let latestCleanup: any = null;

// Mock react to capture and run useEffect callback and cleanup
vi.mock('react', () => ({
  useEffect: (cb: any) => {
    latestCleanup = cb();
  },
}));

import { isRtl, useDocumentLanguage } from './useDocumentLanguage';

describe('isRtl helper function', () => {
  it('correctly identifies Arabic as RTL', () => {
    expect(isRtl('ar')).toBe(true);
  });

  it('correctly identifies other languages as LTR', () => {
    expect(isRtl('en')).toBe(false);
    expect(isRtl('es')).toBe(false);
    expect(isRtl('nl')).toBe(false);
  });
});

describe('useDocumentLanguage hook effect logic', () => {
  let mockHtmlElement: any;

  beforeEach(() => {
    latestCleanup = null;
    mockHtmlElement = {
      lang: 'en',
      dir: 'ltr',
      getAttribute: vi.fn().mockReturnValue(null),
      setAttribute: vi.fn(),
      removeAttribute: vi.fn(),
    };
    vi.stubGlobal('document', {
      documentElement: mockHtmlElement,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sets document lang and dir attributes correctly for LTR language', () => {
    useDocumentLanguage('fr');
    expect(document.documentElement.lang).toBe('fr');
    expect(document.documentElement.dir).toBe('ltr');
  });

  it('sets document lang and dir attributes correctly for RTL language (Arabic)', () => {
    useDocumentLanguage('ar');
    expect(document.documentElement.lang).toBe('ar');
    expect(document.documentElement.dir).toBe('rtl');
  });

  it('correctly cleans up document attributes on unmount', () => {
    useDocumentLanguage('ar');
    expect(document.documentElement.lang).toBe('ar');

    // Trigger cleanup function
    if (latestCleanup) latestCleanup();

    expect(document.documentElement.lang).toBe('en');
    expect(mockHtmlElement.removeAttribute).toHaveBeenCalledWith('dir');
  });
});
