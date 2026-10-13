// Prototipo R-01D: solo interfaz
import { Input, cn } from '@platlab/ui';
import { Plus } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode, type RefObject } from 'react';
import { filled } from './filled';
import { fold } from './wizard-model';

export interface ComboOption {
  id: string;
  label: string;
  /** Texto extra que también busca (código, CAS…). */
  keywords?: string;
  /** Dato secundario bajo el nombre. */
  detail?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
}

const MAX_RESULTS = 6;
const MIN_CHARS = 2;

/** El texto de la opción con lo que coincide en negrita (sin tildes ni mayúsculas). */
function Highlight({ text, needle }: { text: string; needle: string }) {
  const folded = fold(text);
  const at = needle && folded.length === text.length ? folded.indexOf(needle) : -1;
  if (at < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      <strong className="font-bold">{text.slice(at, at + needle.length)}</strong>
      {text.slice(at + needle.length)}
    </>
  );
}

/**
 * Campo de texto con sugerencias. El menú solo aparece al escribir (desde 2 letras) o con la flecha
 * abajo, con 6 resultados como máximo; la última opción, «+ Crear «texto»», conserva lo escrito.
 * Esc y el clic fuera lo cierran. Enter elige la opción activa y nunca envía el formulario.
 */
export function Combobox({
  value,
  onChange,
  options,
  onPick,
  canCreate = false,
  onCreate,
  placeholder,
  inputRef,
  readOnly = false,
  className,
}: {
  value: string;
  onChange: (text: string) => void;
  options: ComboOption[];
  onPick: (option: ComboOption) => void;
  /** Ofrece «+ Crear «texto»» como última opción. */
  canCreate?: boolean;
  onCreate?: (text: string) => void;
  placeholder?: string;
  inputRef?: RefObject<HTMLInputElement | null>;
  readOnly?: boolean;
  className?: string;
}) {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [forced, setForced] = useState(false);
  const [active, setActive] = useState(0);
  const text = value.trim();
  const needle = fold(text);
  const asked = text.length >= MIN_CHARS || forced;

  const matches = useMemo(() => {
    if (!asked) return [];
    const found = text.length >= MIN_CHARS ? options.filter((option) => fold(`${option.label} ${option.keywords ?? ''}`).includes(needle)) : options;
    return found.slice(0, MAX_RESULTS);
  }, [asked, options, needle, text.length]);
  const offerNew = canCreate && text !== '' && !options.some((option) => fold(option.label) === needle);
  const total = matches.length + (offerNew ? 1 : 0);
  const visible = open && asked && !readOnly;
  const activeIndex = Math.min(active, Math.max(total - 1, 0));

  useEffect(() => {
    if (!visible) return undefined;
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [visible]);

  const choose = (index: number) => {
    const option = matches[index];
    if (option) onPick(option);
    else if (offerNew) onCreate?.(text);
    setOpen(false);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!visible) {
        setOpen(true);
        setForced(true);
        setActive(0);
      } else if (total > 0) setActive((activeIndex + (event.key === 'ArrowDown' ? 1 : -1) + total) % total);
    } else if (event.key === 'Enter') {
      // Enter elige; dentro del formulario no debe enviar nada.
      event.preventDefault();
      if (visible && total > 0) choose(activeIndex);
    } else if (event.key === 'Escape' && visible) {
      event.preventDefault();
      setOpen(false);
    } else if (event.key === 'Tab') setOpen(false);
  };

  const row = 'flex min-h-[44px] cursor-pointer items-center gap-2 rounded-[8px] px-2.5 py-1 text-sm sm:min-h-[36px]';
  return (
    <div ref={root} data-no-submit="" className="relative">
      <Input
        ref={inputRef}
        role="combobox"
        aria-expanded={visible}
        aria-controls={`${id}-list`}
        aria-autocomplete="list"
        aria-activedescendant={visible && total > 0 ? `${id}-${activeIndex}` : undefined}
        autoComplete="off"
        spellCheck={false}
        readOnly={readOnly}
        placeholder={placeholder}
        className={cn(filled, className)}
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
          setForced(false);
          setActive(0);
        }}
        onKeyDown={onKeyDown}
      />
      {visible ? (
        <ul
          id={`${id}-list`}
          role="listbox"
          className="absolute inset-x-0 top-full z-30 mt-1 max-h-72 overflow-y-auto rounded-control border border-line bg-surface p-1 shadow-overlay motion-safe:animate-pop-in"
        >
          {matches.map((option, index) => (
            <li
              key={option.id}
              id={`${id}-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              onMouseDown={(event) => event.preventDefault()}
              onMouseMove={() => setActive(index)}
              onClick={() => choose(index)}
              className={cn(row, index === activeIndex && 'bg-action-soft')}
            >
              {option.leading}
              <span className="min-w-0 flex-1">
                <span className="block break-words text-ink">
                  <Highlight text={option.label} needle={needle} />
                </span>
                {option.detail ? <span className="block text-[13px] text-ink-muted">{option.detail}</span> : null}
              </span>
              {option.trailing}
            </li>
          ))}
          {offerNew ? (
            <li
              id={`${id}-${matches.length}`}
              role="option"
              aria-selected={matches.length === activeIndex}
              onMouseDown={(event) => event.preventDefault()}
              onMouseMove={() => setActive(matches.length)}
              onClick={() => choose(matches.length)}
              className={cn(row, 'font-medium text-action', matches.length === activeIndex && 'bg-action-soft')}
            >
              <Plus className="size-4 shrink-0" aria-hidden />
              <span className="min-w-0 break-words">Crear «{text}»</span>
            </li>
          ) : null}
          {total === 0 ? <li role="presentation" className="px-2.5 py-2 text-[13px] text-ink-muted">Sin coincidencias</li> : null}
        </ul>
      ) : null}
      <p className="sr-only" role="status">
        {visible ? `${matches.length} ${matches.length === 1 ? 'resultado' : 'resultados'}` : ''}
      </p>
    </div>
  );
}
