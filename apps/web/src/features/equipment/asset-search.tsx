import { Input } from '@platlab/ui';
import { Search } from 'lucide-react';
import { useState } from 'react';
import { useDebouncedValue } from '../../app/use-media-query';

const SEARCH_DELAY_MS = 250;

/**
 * Lo escrito en un buscador de equipos y el término que ya vale: se pide al servidor 250 ms después de la
 * última tecla y desde 2 letras (una sola aún no es búsqueda).
 */
export function useAssetSearch() {
  const [text, setText] = useState('');
  const term = useDebouncedValue(text.trim(), SEARCH_DELAY_MS);
  return { text, setText, term: term.length >= 2 ? term.slice(0, 100) : '' };
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
