import { newAsset, updateAssetRequest, type Asset } from '@platlab/contracts';
import { cn, toast } from '@platlab/ui';
import { Microscope, Pencil } from 'lucide-react';
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router';
import { isApiError } from '../../../app/api';
import { FormSheet, validate, type SheetBaseProps } from '../../../app/form-sheet';
import { equipmentErrorMessage, useCreateAsset, useUpdateAsset, useUploadAssetPhoto } from '../commands';
import { useAssetTypes } from '../queries';
import {
  changedFields,
  createPayload,
  emptyForm,
  formOfAsset,
  hasPendingChanges,
  normalizeForm,
  type AssetForm,
  type AssetFormErrors,
} from './asset-form';
import { PhotoField, useChosenPhoto } from './asset-photo';
import { OwnerSection, PlaceSection, StatusSection } from './asset-place';
import { IdentitySection, PurchaseSection, typeIdOf } from './asset-sections';

const hasPurchaseData = (asset: Asset) =>
  Boolean(asset.supplier || asset.acquiredOn || asset.warrantyUntil || asset.usefulLifeYears !== null || asset.replacementValue !== null);

/**
 * «Registrar equipo» y «Editar ficha» (ADR 0019, E-01a): la misma hoja en dos modos. Al registrar pide la
 * identificación, dónde está y quién responde, el estado con el que nace y, opcional y plegada, la compra y
 * la garantía, en una sola vista a 1440×900 (Compra y garantía plegada); al editar (con `asset`) parte de la ficha, no ofrece ubicación ni estado (tienen su hoja) y
 * envía solo lo que cambió, con vacío como «borrar el dato». El servidor numera el código si se deja vacío
 * y decide los conflictos; la ventana no anticipa nada y avisa después de que él confirmó.
 */
export function AssetFormSheet({
  workspaceId,
  open,
  onOpenChange,
  base,
  canManage,
  asset,
  initialLocationId,
}: SheetBaseProps & {
  /** `/e/:espacio/equipos`, para llevar a la ficha recién registrada. */
  base: string;
  canManage: boolean;
  /** Con ficha, edita; sin ella, registra. */
  asset?: Asset;
  /** Al registrar desde un área: la ubicación con la que abre la hoja. */
  initialLocationId?: string | undefined;
}) {
  const navigate = useNavigate();
  const create = useCreateAsset(workspaceId);
  const update = useUpdateAsset(workspaceId, asset?.id ?? '');
  const uploadPhoto = useUploadAssetPhoto(workspaceId);
  const photo = useChosenPhoto();
  const [saving, setSaving] = useState(false);
  const types = useAssetTypes(workspaceId);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [initial] = useState<AssetForm>(() => (asset ? formOfAsset(asset) : { ...emptyForm, locationId: initialLocationId ?? '' }));
  const [saved] = useState(() => normalizeForm(initial).fields);
  const form = useForm<AssetForm>({ defaultValues: initial });
  const editing = asset !== undefined;

  // Lo escrito en «Tipo» sin elegirlo de la lista vale si coincide con un tipo.
  const withType = (values: AssetForm): AssetForm => ({ ...values, typeId: values.typeId || typeIdOf(types.data?.items ?? [], values.typeName) });
  const current = normalizeForm(withType(form.watch()));
  const dirty = hasPendingChanges(saved, current, photo.chosen !== null);

  const focusFirstInvalid = () =>
    requestAnimationFrame(() => bodyRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());

  const submit = form.handleSubmit(async (raw) => {
    setGeneralError(null);
    const values = withType(raw);
    const { fields, errors } = normalizeForm(values);
    const problems: AssetFormErrors = { ...errors };
    if (!values.typeId) {
      problems.typeId = values.typeName.trim()
        ? `Ese tipo no está en la lista. ${canManage ? 'Agrégalo con el botón + del campo.' : 'Elige uno de la lista.'}`
        : 'Elige el tipo de equipo.';
    }
    if (!editing && !values.locationId) problems.locationId = 'Elige dónde está el equipo.';
    if (editing && !fields.code) problems.code = 'El código no puede quedar vacío.';

    const changes = changedFields(saved, fields);
    const fieldsChanged = Object.keys(changes).length > 0;
    if (editing && !fieldsChanged && !photo.chosen && Object.keys(problems).length === 0) {
      setGeneralError('No cambiaste ningún dato. Edita algo o cancela.');
      return;
    }
    // Al editar solo la foto no hay campos que enviar: el PATCH se omite.
    const parsed = editing
      ? fieldsChanged
        ? validate(updateAssetRequest, changes, form)
        : null
      : validate(newAsset, createPayload(fields, { locationId: values.locationId, condition: values.condition }), form);
    if (form.getFieldState('code').error?.message === 'Código inválido') {
      problems.code = 'Usa letras, números, punto, guion o guion bajo, sin espacios (hasta 64).';
    }
    for (const [field, message] of Object.entries(problems)) form.setError(field as keyof AssetForm, { message });
    if ((!parsed && (!editing || fieldsChanged)) || Object.keys(problems).length > 0) {
      focusFirstInvalid();
      return;
    }

    const chosen = photo.chosen ? { body: photo.chosen.body, type: photo.chosen.type } : null;
    // La foto va después de los datos: si falla, lo ya guardado se queda y se avisa qué faltó.
    const sendPhoto = async (assetId: string): Promise<{ error: unknown } | null> => {
      if (!chosen) return null;
      try {
        await uploadPhoto.mutateAsync({ assetId, photo: chosen });
        return null;
      } catch (error) {
        return { error };
      }
    };
    setSaving(true);
    try {
      if (asset) {
        if (parsed) await update.mutateAsync(parsed);
        const failed = await sendPhoto(asset.id);
        if (failed && !parsed) {
          setGeneralError(equipmentErrorMessage(failed.error));
          return;
        }
        if (failed) {
          toast.warning('Ficha actualizada, pero la foto no se subió: inténtalo de nuevo desde Editar ficha', {
            description: `${asset.code} · ${fields.name}. ${equipmentErrorMessage(failed.error)}`,
          });
        } else {
          toast.success('Ficha actualizada', { description: `${asset.code} · ${fields.name}` });
        }
        onOpenChange(false);
      } else if (parsed) {
        const created = await create.mutateAsync(parsed);
        const seeCard = { label: 'Ver ficha', onClick: () => void navigate(`${base}/inventario/${created.id}`) };
        // El equipo ya quedó registrado: si la foto falla, no se repite el alta ni se deja la hoja abierta.
        const failed = await sendPhoto(created.id);
        if (failed) {
          toast.warning('Equipo registrado, pero la foto no se subió: inténtalo desde Editar ficha', {
            description: `${created.code} · ${created.name}. ${equipmentErrorMessage(failed.error)}`,
            action: seeCard,
          });
        } else {
          toast.success('Equipo registrado', { description: `${created.code} · ${created.name}`, action: seeCard });
        }
        onOpenChange(false);
      }
    } catch (error) {
      if (isApiError(error, 'CODE_TAKEN')) {
        form.setError('code', { message: equipmentErrorMessage(error) });
        focusFirstInvalid();
      } else {
        setGeneralError(equipmentErrorMessage(error));
      }
    } finally {
      setSaving(false);
    }
  });

  return (
    <FormSheet
      flush
      wide="xl"
      icon={editing ? Pencil : Microscope}
      title={editing ? 'Editar ficha' : 'Registrar equipo'}
      description={editing ? 'La ubicación y el estado se cambian con «Trasladar equipo» y «Cambiar estado».' : 'Da de alta un equipo con su ubicación y su estado.'}
      required
      open={open}
      onOpenChange={onOpenChange}
      submitLabel={editing ? 'Guardar cambios' : 'Registrar equipo'}
      status={editing && !dirty ? 'Sin cambios por guardar' : undefined}
      pending={saving || create.isPending || update.isPending || uploadPhoto.isPending}
      generalError={generalError}
      onSubmit={() => void submit()}
    >
      <div ref={bodyRef} className={cn('grid gap-4 px-3 py-4 sm:px-5 sm:py-5 lg:grid-cols-2 lg:gap-5', editing && 'lg:items-start')}>
        <IdentitySection
          form={form}
          workspaceId={workspaceId}
          canManage={canManage}
          creating={!editing}
          photo={<PhotoField photo={photo} currentUrl={asset?.photoUrl ?? null} />}
        />
        {asset ? (
          <OwnerSection form={form} workspaceId={workspaceId} open={open} responsible={asset.responsible} />
        ) : (
          // La columna derecha del alta: la ubicación y el responsable, y debajo el estado, sin hueco entre ellos.
          <div className="grid content-start gap-4 lg:gap-5">
            <PlaceSection form={form} workspaceId={workspaceId} open={open} canManage={canManage} />
            <StatusSection form={form} />
          </div>
        )}
        <PurchaseSection form={form} startOpen={asset ? hasPurchaseData(asset) : false} />
      </div>
    </FormSheet>
  );
}
