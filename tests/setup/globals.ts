import '@testing-library/jest-dom';
import { vi } from 'vitest';

type ElectronNamespace = Record<string, unknown>;

const createThrowingProxy = () => {
  const target: Record<string, unknown> = {};
  return new Proxy(target, {
    get: (_, prop: string | symbol) => {
      if (prop in target) {
        return target[prop as keyof typeof target];
      }
      return vi.fn(() => {
        throw new Error(`window.electronAPI.${String(prop)} not mocked`);
      });
    },
  });
};

if (typeof window === 'undefined') {
  (globalThis as any).window = {};
}

if (!(window as any).electronAPI) {
  (window as any).electronAPI = createThrowingProxy();
}

if (!(globalThis as any).electronAPI) {
  (globalThis as any).electronAPI = (window as any).electronAPI;
}

export const setElectronNamespace = <T extends ElectronNamespace>(namespace: string, implementation: T) => {
  (window as any).electronAPI[namespace] = implementation;
  return () => {
    delete (window as any).electronAPI[namespace];
  };
};
