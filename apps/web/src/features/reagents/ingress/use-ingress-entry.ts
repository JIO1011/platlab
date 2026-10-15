import type { StockedProduct } from '@platlab/contracts';
import { toDecimalInput } from '@platlab/ui';
import { useState } from 'react';
import { useProduct } from '../queries';
import { emptyBottles, emptyDraft, type BottlesForm, type Draft, type Errors } from './model';

const densityInput = (product: StockedProduct | undefined | null) => (product?.density ? toDecimalInput(product.density) : '');

/**
 * Lo que se escribe y se elige en el ingreso: el reactivo del catálogo (o el nuevo, en `draft`), los datos de los
 * frascos (`form`) y lo que respondió el servidor (nombre o código ocupado, ubicación no creada), que se borra
 * al cambiar los datos. De ahí salen también la unidad, el nombre y la densidad que valen para el ingreso.
 */
export function useIngressEntry(workspaceId: string, productId: string | undefined) {
  // La ficha ya cargó su reactivo: suele venir de la caché, así que está desde la primera vista.
  const preset = useProduct(workspaceId, productId ?? '', productId !== undefined).data;
  const [initial] = useState(preset);
  const [existing, setExisting] = useState<StockedProduct | null>(initial ?? null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [form, setForm] = useState<BottlesForm>(() => ({ ...emptyBottles, density: densityInput(initial) }));
  const [serverErrors, setServerErrors] = useState<Errors>({});
  // Si no estaba en caché, se elige al llegar, salvo que ya se haya escrito o elegido otro.
  const [presetPending, setPresetPending] = useState(productId !== undefined && initial === undefined);
  if (presetPending && preset) {
    setPresetPending(false);
    if (!existing && draft.name === '') {
      setExisting(preset);
      setForm((previous) => ({ ...previous, code: null, density: densityInput(preset) }));
    }
  }

  const patch = (next: Partial<BottlesForm>) => {
    setForm((previous) => ({ ...previous, ...next }));
    setServerErrors({});
  };
  const patchDraft = (next: Partial<Draft>) => setDraft((previous) => ({ ...previous, ...next }));

  const choose = (product: StockedProduct) => {
    setExisting(product);
    patch({ code: null, density: densityInput(product) });
  };
  const changeName = (text: string) => {
    setExisting(null);
    patchDraft({ name: text });
    setServerErrors({});
  };
  // La densidad de un reactivo nuevo va a su ficha; la de uno existente, solo a estos frascos.
  const setDensity = (density: string) => (existing ? patch({ density }) : patchDraft({ density }));

  return {
    /** El reactivo que ya venía elegido (desde la ficha), si estaba en caché. */
    initial,
    existing,
    draft,
    form,
    serverErrors,
    setServerErrors,
    patch,
    patchDraft,
    choose,
    changeName,
    setDensity,
    unit: existing ? existing.baseUnit : draft.unit,
    name: existing ? existing.name : draft.name.trim(),
    density: existing ? form.density : draft.density,
  };
}

export type IngressEntry = ReturnType<typeof useIngressEntry>;
