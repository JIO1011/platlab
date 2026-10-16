import { SAFETY_SHEET_MAX_BYTES } from '@platlab/contracts';
import { describe, expect, it } from 'vitest';
import {
  casRequired,
  catalogFields,
  draftOf,
  emptyBottles,
  emptyDraft,
  lastSuffix,
  receiptTare,
  sdsFileOf,
  seriesOf,
  validateBottles,
  validateDraft,
} from './model';

describe('datos de catálogo', () => {
  it('exige el CAS salvo con estado físico «Mezcla», con la regla del contrato', () => {
    const base = { ...emptyDraft, name: 'Reactivo', state: 'liquid' as const };
    expect(validateDraft(base).cas).toBeDefined();
    expect(validateDraft({ ...base, state: 'mixture' }).cas).toBeUndefined();
    expect(casRequired('mixture')).toBe(false);
    expect(casRequired('')).toBe(true);
    expect(validateDraft({ ...base, state: 'mixture', cas: '64-17-4' }).cas).toBeDefined();
    expect(validateDraft({ ...base, cas: '64-17-5' })).toEqual({});
    // Al editar una ficha sin CAS, solo se exige si cambian el CAS o el estado.
    expect(validateDraft(base, { cas: false }).cas).toBeUndefined();
  });

  it('pide nombre y estado, y revisa el enlace y la densidad solo donde cuentan', () => {
    expect(Object.keys(validateDraft(emptyDraft)).sort()).toEqual(['cas', 'name', 'state']);
    const named = { ...emptyDraft, name: 'Etanol', state: 'liquid' as const, cas: '64-17-5' };
    expect(validateDraft({ ...named, sds: 'digital', sdsUrl: 'ficha.pdf' }).sdsUrl).toBeDefined();
    expect(validateDraft({ ...named, sds: 'physical', sdsUrl: 'ficha.pdf' }).sdsUrl).toBeUndefined();
    expect(validateDraft({ ...named, unit: 'mL', density: '0' }).density).toBeDefined();
    expect(validateDraft({ ...named, unit: 'g', density: '0' }).density).toBeUndefined();
  });

  it('envía el enlace solo con ficha digital y la densidad solo en volumen, como cadena decimal', () => {
    const draft = { ...emptyDraft, name: ' Etanol ', state: 'liquid' as const, cas: '64-17-5', sds: 'physical' as const, sdsUrl: 'https://x.y', density: '0,789' };
    expect(catalogFields(draft)).toMatchObject({ name: 'Etanol', sdsKind: 'physical', sdsUrl: null, density: null });
    expect(catalogFields({ ...draft, unit: 'mL', sds: 'digital' })).toMatchObject({ sdsUrl: 'https://x.y', density: '0.789' });
  });

  it('la ficha en PDF solo admite PDF de hasta 6 MiB, y solo cuenta con ficha digital en modo PDF', () => {
    const named = { ...emptyDraft, name: 'Etanol', state: 'liquid' as const, cas: '64-17-5', sds: 'digital' as const, sdsSource: 'pdf' as const };
    const pdf = (bytes: number, type = 'application/pdf') => new File([new Uint8Array(bytes)], 'ficha.pdf', { type });
    expect(validateDraft({ ...named, sdsFile: pdf(1024) })).toEqual({});
    expect(validateDraft({ ...named, sdsFile: pdf(1024, 'image/png') }).sdsFile).toBe('Solo se admite PDF');
    expect(validateDraft({ ...named, sdsFile: pdf(SAFETY_SHEET_MAX_BYTES) })).toEqual({});
    expect(validateDraft({ ...named, sdsFile: pdf(SAFETY_SHEET_MAX_BYTES + 1) }).sdsFile).toBe('El PDF supera 6 MiB');
    // Con el enlace, o sin ficha digital, el archivo se ignora; y con PDF el enlace escrito, también.
    expect(validateDraft({ ...named, sdsSource: 'link', sdsFile: pdf(1024, 'image/png') }).sdsFile).toBeUndefined();
    expect(sdsFileOf({ ...named, sds: 'physical', sdsFile: pdf(1024) })).toBeNull();
    expect(validateDraft({ ...named, sdsUrl: 'ficha.pdf' }).sdsUrl).toBeUndefined();
  });

  it('con un PDF elegido o vigente no envía enlace: el servidor conserva el PDF vigente', () => {
    const draft = { ...emptyDraft, name: 'Etanol', state: 'liquid' as const, cas: '64-17-5', sds: 'digital' as const, sdsSource: 'pdf' as const, sdsUrl: 'https://x.y' };
    const file = new File(['%PDF'], 'ficha.pdf', { type: 'application/pdf' });
    expect(catalogFields({ ...draft, sdsFile: file })).toMatchObject({ sdsKind: 'digital', sdsUrl: null });
    expect(catalogFields(draft)).toMatchObject({ sdsKind: 'digital', sdsUrl: null });
  });

  it('draftOf no precarga el enlace con el PDF vigente y lo deja en modo PDF', () => {
    const withPdf = {
      id: '00000000-0000-4000-8000-000000000002',
      code: 'ETOH',
      name: 'Etanol',
      baseUnit: 'mL',
      casNumber: '64-17-5',
      physicalState: 'liquid' as const,
      minimum: null,
      hazards: [],
      controlled: false,
      sdsKind: 'digital' as const,
      sdsUrl: null,
      sdsFileUrl: 'https://storage.test/safety-sheets/etanol.pdf',
      density: '0.789',
    };
    expect(draftOf(withPdf)).toMatchObject({ sds: 'digital', sdsSource: 'pdf', sdsUrl: '', sdsFile: null });
    expect(draftOf({ ...withPdf, sdsUrl: 'https://x.y', sdsFileUrl: null })).toMatchObject({ sdsSource: 'link', sdsUrl: 'https://x.y' });
  });

  it('al editar conserva la unidad del reactivo aunque no esté en la lista: cambiar otro dato no la toca', () => {
    const legacy = {
      id: '00000000-0000-4000-8000-000000000001',
      code: 'AZUL',
      name: 'Azul de metileno',
      baseUnit: 'mg',
      casNumber: '61-73-4',
      physicalState: 'solid' as const,
      minimum: null,
      hazards: [],
      controlled: false,
      sdsKind: null,
      sdsUrl: null,
      sdsFileUrl: null,
      density: null,
    };
    const draft = draftOf(legacy);
    expect(draft.unit).toBe('mg');
    // La hoja envía solo lo que difiere de la ficha: con otro nombre, la unidad sigue igual y no se envía.
    expect(catalogFields({ ...draft, name: 'Azul de metileno 1 %' }).baseUnit).toBe(catalogFields(draft).baseUnit);
    expect(draftOf({ ...legacy, baseUnit: 'u' }).unit).toBe('u');
  });
});

describe('frascos', () => {
  it('numera la serie como el servidor y muestra dónde termina', () => {
    expect(seriesOf('ACE-001', 3)).toEqual(['ACE-001', 'ACE-002', 'ACE-003']);
    expect(seriesOf('LAB', 2)).toEqual(['LAB-1', 'LAB-2']);
    expect(seriesOf('LAB', null)).toEqual([]);
    expect(lastSuffix(seriesOf('ACE-001', 4))).toBe('004');
    expect(lastSuffix(seriesOf('ACE-001', 1))).toBeNull();
  });

  it('pide cantidad, frascos, código válido y ubicación', () => {
    expect(Object.keys(validateBottles(emptyBottles, '')).sort()).toEqual(['code', 'placeId', 'quantity']);
    const ready = { ...emptyBottles, quantity: '2,5', count: '3', placeId: 'x' };
    expect(validateBottles(ready, 'ACE-001')).toEqual({});
    expect(validateBottles({ ...ready, quantity: '0' }, 'ACE-001').quantity).toBeDefined();
    expect(validateBottles({ ...ready, count: '51' }, 'ACE-001').count).toBeDefined();
    expect(validateBottles(ready, 'ACE 001').code).toBeDefined();
  });
});

describe('tara del ingreso', () => {
  const base = { unit: 'mL', quantity: '500', grossWeight: '', density: '' };

  it('no pide nada mientras el peso está vacío', () => {
    expect(receiptTare(base)).toEqual({ tare: null, errors: {} });
  });

  it('en volumen pide la densidad y calcula la tara con ella', () => {
    expect(receiptTare({ ...base, grossWeight: '640' }).errors.density).toBeDefined();
    expect(receiptTare({ ...base, grossWeight: '534.5', density: '0.789' }).tare).toBe('140');
  });

  it('avisa cuando el frasco lleno no pesa más que su contenido', () => {
    expect(receiptTare({ ...base, grossWeight: '300', density: '0.789' }).errors.weight).toMatch(/394,5 g/);
  });

  it('en masa no necesita densidad', () => {
    expect(receiptTare({ unit: 'g', quantity: '500', grossWeight: '640', density: '' })).toEqual({ tare: '140', errors: {} });
  });
});
