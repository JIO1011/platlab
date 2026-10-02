import { Check, ChevronDown } from 'lucide-react';
import { Select as SelectPrimitive } from 'radix-ui';
import { cn } from '../lib/cn';
import { useFieldControl } from './field';

export interface SelectOption {
  value: string;
  label: string;
  /** Dato secundario alineado a la derecha (saldo, caducidad…). */
  detail?: string;
  disabled?: boolean;
  /** Las opciones con el mismo grupo se muestran juntas bajo su título (p. ej., el reactivo). */
  group?: string;
}

export interface SelectProps {
  value: string | undefined;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  placeholder: string;
  id?: string;
  disabled?: boolean;
}

export function Select({ value, onValueChange, options, placeholder, disabled, ...explicit }: SelectProps) {
  const aria = { ...useFieldControl(), ...explicit };
  return (
    <SelectPrimitive.Root value={value ?? ''} onValueChange={onValueChange} disabled={disabled ?? false}>
      <SelectPrimitive.Trigger
        {...aria}
        className={cn(
          'flex h-10 w-full items-center justify-between gap-2 rounded-control border border-line-strong bg-surface px-3 text-left text-sm text-ink',
          'transition-[border-color,box-shadow] duration-150 hover:border-ink-subtle',
          'focus-visible:border-action focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-action/20',
          'data-[placeholder]:text-ink-subtle aria-[invalid=true]:border-danger disabled:cursor-not-allowed disabled:bg-surface-sunken',
        )}
      >
        <span className="min-w-0 truncate">
          <SelectPrimitive.Value placeholder={placeholder} />
        </span>
        <SelectPrimitive.Icon>
          <ChevronDown className="size-4 text-ink-muted" aria-hidden />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={6}
          className={cn(
            'z-50 max-h-[min(22rem,var(--radix-select-content-available-height))] min-w-[var(--radix-select-trigger-width)] overflow-hidden',
            'rounded-control border border-line bg-surface shadow-overlay',
            'origin-[var(--radix-select-content-transform-origin)] data-[state=open]:animate-pop-in',
          )}
        >
          <SelectPrimitive.Viewport className="p-1">
            {groupOptions(options).map(([group, items]) =>
              group ? (
                <SelectPrimitive.Group key={group}>
                  <SelectPrimitive.Label className="px-2 pb-1 pt-2 text-[12px] font-semibold text-ink-muted">
                    {group}
                  </SelectPrimitive.Label>
                  {items.map(renderItem)}
                </SelectPrimitive.Group>
              ) : (
                items.map(renderItem)
              ),
            )}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}

/**
 * Un solo grupo por nombre, en el orden en que aparece por primera vez, aunque las opciones
 * lleguen salteadas. Las opciones sin grupo quedan sueltas al principio.
 */
function groupOptions(options: SelectOption[]): Array<[string | undefined, SelectOption[]]> {
  const groups = new Map<string | undefined, SelectOption[]>();
  for (const option of options) {
    const list = groups.get(option.group);
    if (list) list.push(option);
    else groups.set(option.group, [option]);
  }
  const ungrouped = groups.get(undefined);
  groups.delete(undefined);
  return [...(ungrouped ? [[undefined, ungrouped] as [undefined, SelectOption[]]] : []), ...groups.entries()];
}

function renderItem(option: SelectOption) {
  return (
    <SelectPrimitive.Item
      key={option.value}
      value={option.value}
      disabled={option.disabled ?? false}
      className={cn(
        'relative flex cursor-default select-none items-center gap-3 rounded-[6px] py-2 pl-8 pr-3 text-sm text-ink outline-none',
        'data-[highlighted]:bg-action-soft data-[disabled]:opacity-50',
      )}
    >
      <SelectPrimitive.ItemIndicator className="absolute left-2 inline-flex">
        <Check className="size-4 text-action" aria-hidden />
      </SelectPrimitive.ItemIndicator>
      <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
      {option.detail ? (
        <span className="ml-auto pl-4 text-[13px] tabular-nums text-ink-muted">{option.detail}</span>
      ) : null}
    </SelectPrimitive.Item>
  );
}
