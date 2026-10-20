import { Input } from '@platlab/ui';
import { Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { useDebouncedValue } from '../../app/use-media-query';

const SEARCH_DELAY_MS = 250;
const SEARCH_PARAM = 'q';

/**
 * Lo escrito en un buscador de equipos y el término que ya vale: se pide al servidor 250 ms después de la
 * última tecla y desde 2 letras (una sola aún no es búsqueda). El término vive en la URL como `?q=`, con
 * `replace` (no suma entradas al historial): al volver de una ficha con «←», la búsqueda sigue ahí (U-01, ADR 0021).
 */
export function useAssetSearch() {
  const [params, setParams] = useSearchParams();
  const inUrl = params.get(SEARCH_PARAM) ?? '';
  const [text, setText] = useState(inUrl);
  const term = useDebouncedValue(text.trim(), SEARCH_DELAY_MS);
  const valid = term.length >= 2 ? term.slice(0, 100) : '';
  useEffect(() => {
    if (inUrl === valid) return;
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (valid) next.set(SEARCH_PARAM, valid);
        else next.delete(SEARCH_PARAM);
        return next;
      },
      { replace: true },
    );
  }, [inUrl, valid, setParams]);
  return { text, setText, term: valid };
}

/** Campo de búsqueda del Inventario; con una sola letra avisa que hacen falta dos. */
export function AssetSearch({
  label,
  placeholder,
  text,
  onChange,
}: {
  label: string;
  placeholder: string;
  text: string;
  onChange: (text: string) => void;
}) {
  return (
    <div className="grid w-full gap-1 sm:w-80">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-subtle" aria-hidden />
        <Input
          type="search"
          aria-label={label}
          placeholder={placeholder}
          className="h-[44px] pl-9 sm:h-10"
          value={text}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
      {text.trim().length === 1 ? <p className="px-1 text-[13px] text-ink-muted">Escribe al menos 2 letras para buscar.</p> : null}
    </div>
  );
}
