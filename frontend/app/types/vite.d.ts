/// <reference types="vite/client" />

// Virtual modules from Vite plugins
declare module "virtual:pwa-register/react" {
  export interface UseRegisterSWOptions {
    onRegistered?: (
      registration: ServiceWorkerRegistration | undefined
    ) => void;
    onRegisterError?: (error: Error) => void;
    onOfflineReady?: () => void;
    onNeedRefresh?: () => void;
  }

  export interface UseRegisterSWReturn {
    needRefresh: [boolean, (value: boolean) => void];
    offlineReady: [boolean, (value: boolean) => void];
    updateServiceWorker: (reloadPage?: boolean) => Promise<void>;
  }

  export function useRegisterSW(
    options?: UseRegisterSWOptions
  ): UseRegisterSWReturn;
}
