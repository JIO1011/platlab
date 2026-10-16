import { Input, cn } from '@platlab/ui';
import { Plus } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState, type ComponentProps, type KeyboardEvent, type ReactNode, type RefObject } from 'react';
import { filled } from './filled';
import { fold } from './fold';

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

const addButton =
  'absolute inset-y-0 right-0 flex w-[44px] items-center justify-center rounded-r-control text-action transition-colors duration-150 hover:bg-action-soft focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-action sm:w-[36px]';

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
 *
 * Con `inlineCreate`, crear es un botón «+» dentro del campo, a la derecha, que aparece cuando lo
 * escrito no coincide con ninguna opción; Enter también crea, salvo que se haya movido la selección
 * con las flechas o el ratón. `openOnFocus` abre las sugerencias al enfocar, desde la primera letra.
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
  inlineCreate = false,
  openOnFocus = false,
  menuClassName,
  inputProps,
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
  inlineCreate?: boolean;
  openOnFocus?: boolean;
  menuClassName?: string;
  /** Atributos extra del campo (nombre accesible, `id`, `aria-invalid`…). */
  inputProps?: Omit<ComponentProps<typeof Input>, 'value' | 'onChange' | 'ref'>;
}) {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [forced, setForced] = useState(false);
  const [active, setActive] = useState(0);
  const [moved, setMoved] = useState(false);
  const text = value.trim();
  const needle = fold(text);
  const minChars = openOnFocus ? 1 : MIN_CHARS;
  const asked = text.length >= minChars || forced;

  const matches = useMemo(() => {
    if (!asked) return [];
    const found = text.length >= minChars ? options.filter((option) => fold(`${option.label} ${option.keywords ?? ''}`).includes(needle)) : options;
    return found.slice(0, MAX_RESULTS);
  }, [asked, options, needle, text.length, minChars]);
  const offerNew = canCreate && text !== '' && !options.some((option) => fold(option.label) === needle);
  const rowNew = offerNew && !inlineCreate;
  const total = matches.length + (rowNew ? 1 : 0);
  // Con «+» en el campo, un texto sin coincidencias no abre un menú vacío; sin texto ni opciones, tampoco.
  const visible = open && asked && !readOnly && !(inlineCreate && offerNew && matches.length === 0) && (total > 0 || text !== '');
  const activeIndex = Math.min(active, Math.max(total - 1, 0));
  // Con Enter creando, no se resalta una coincidencia que Enter no va a elegir.
  const highlighted = (index: number) => index === activeIndex && (moved || !(inlineCreate && offerNew));

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
    else if (rowNew) onCreate?.(text);
    setOpen(false);
  };

  const create = () => {
    onCreate?.(text);
    setOpen(false);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!visible) {
        setOpen(true);
        setForced(true);
        setActive(0);
      } else if (total > 0) {
        setMoved(true);
        setActive((activeIndex + (event.key === 'ArrowDown' ? 1 : -1) + total) % total);
      }
    } else if (event.key === 'Enter') {
      // Enter elige; dentro del formulario no debe enviar nada.
      event.preventDefault();
      if (inlineCreate && offerNew && !moved) create();
      else if (visible && total > 0) choose(activeIndex);
    } else if (event.key === 'Escape' && visible) {
      event.preventDefault();
      setOpen(false);
    } else if (event.key === 'Tab') setOpen(false);
  };

  const row = 'flex min-h-[44px] cursor-pointer items-center gap-2 rounded-[8px] px-2.5 py-1 text-sm sm:min-h-[36px]';
  return (
    <div ref={root} className="relative">
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
        {...inputProps}
        className={cn(filled, inlineCreate && offerNew && 'pr-11 sm:pr-10', className)}
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
          setForced(false);
          setActive(0);
          setMoved(false);
        }}
        onFocus={() => {
          if (!openOnFocus || readOnly) return;
          setOpen(true);
          setForced(true);
          setActive(0);
          setMoved(false);
        }}
        onKeyDown={onKeyDown}
      />
      {inlineCreate && offerNew && !readOnly ? (
        <button type="button" tabIndex={-1} aria-label={`Crear «${text}»`} title={`Crear «${text}»`} onMouseDown={(event) => event.preventDefault()} onClick={create} className={addButton}>
          <Plus className="size-4" aria-hidden />
        </button>
      ) : null}
      {visible ? (
        <ul
          id={`${id}-list`}
          role="listbox"
          className={cn('absolute inset-x-0 top-full z-30 mt-1 max-h-72 overflow-y-auto rounded-control border border-line bg-surface p-1 shadow-overlay motion-safe:animate-pop-in', menuClassName)}
        >
          {matches.map((option, index) => (
            <li
              key={option.id}
              id={`${id}-${index}`}
              role="option"
              aria-selected={highlighted(index)}
              onMouseDown={(event) => event.preventDefault()}
              onMouseMove={() => {
                setMoved(true);
                setActive(index);
              }}
              onClick={() => choose(index)}
              className={cn(row, highlighted(index) && 'bg-action-soft')}
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
          {rowNew ? (
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
          {total === 0 ? (
            <li role="option" aria-disabled="true" aria-selected={false} className="px-2.5 py-2 text-[13px] text-ink-muted">
              Sin coincidencias
            </li>
          ) : null}
        </ul>
      ) : null}
      <p className="sr-only" role="status">
        {visible ? `${matches.length} ${matches.length === 1 ? 'resultado' : 'resultados'}` : ''}
      </p>
    </div>
  );
}
