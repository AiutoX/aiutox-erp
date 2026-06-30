/**
 * Mock para virtual:pwa-register/react
 * Usado en tests unitarios para evitar dependencia del Service Worker real
 */
export const useRegisterSW = () => ({
  needRefresh: [false, () => {}],
  offlineReady: [false, () => {}],
  updateServiceWorker: () => Promise.resolve(),
});
