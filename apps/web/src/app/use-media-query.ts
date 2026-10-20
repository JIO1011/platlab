import { useEffect, useState, useSyncExternalStore } from 'react';

/** Sigue una media query del navegador (p. ej., si la pantalla es ancha). */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (notify) => {
      const list = window.matchMedia(query);
      list.addEventListener('change', notify);
      return () => list.removeEventListener('change', notify);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** Valor que se actualiza `ms` después del último cambio: para no pedir al servidor en cada tecla. */
export function useDebouncedValue<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), ms);
    return () => window.clearTimeout(timer);
  }, [value, ms]);
  return debounced;
}

/**
 * Preferencia de este navegador (p. ej., el panel plegado). `localStorage` puede faltar o fallar
 * (ventana privada, datos bloqueados): la pantalla funciona igual, sin recordarla.
 */
export function useStoredFlag(key: string, initial: boolean): [boolean, (value: boolean) => void] {
  const [value, setValue] = useState(() => {
    try {
      const stored = window.localStorage.getItem(key);
      return stored === null ? initial : stored === '1';
    } catch {
      return initial;
    }
  });
  return [
    value,
    (next) => {
      setValue(next);
      try {
        window.localStorage.setItem(key, next ? '1' : '0');
      } catch {
        // Sin almacenamiento: se queda solo en esta visita.
      }
    },
  ];
}
