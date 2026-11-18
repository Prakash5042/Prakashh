import '@testing-library/jest-dom/vitest';

if (typeof window !== 'undefined') {
  window.scrollTo = () => {};
  if (!URL.createObjectURL) URL.createObjectURL = () => 'blob:mock-url';
  if (!URL.revokeObjectURL) URL.revokeObjectURL = () => {};
  if (!window.matchMedia) {
    window.matchMedia = (query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    });
  }
}
