import { practiceIncidentRequest, type FaultType } from '@platlab/contracts';
import { Field, Textarea, toast } from '@platlab/ui';
import { TriangleAlert } from 'lucide-react';
import { useState } from 'react';
import { FormSheet, type SheetBaseProps } from '../../app/form-sheet';
import { PillField } from '../../app/pills';
import { labsErrorMessage } from './commands';
import { blockAssets } from './practice-assets';
import { useRefreshEquipment, useReportPracticeIncident } from './practice-commands';
import type { RequestView } from './request-draft';
import { shortDateText } from './schedule-placement';

const DESCRIPTION_MAX = 2000;

/** Los tipos de falla con los mismos textos que Equipos (ADR 0019); cada módulo es dueño de los suyos. */
const faultTypes: ReadonlyArray<{ value: FaultType; label: string }> = [
  { value: 'electrical', label: 'Eléctrica' },
  { value: 'mechanical', label: 'Mecánica' },
  { value: 'spare_part', label: 'Requiere repuesto' },
  { value: 'other', label: 'Otra' },
];

const empty = { assetId: '', faultType: '' as FaultType | '', description: '', usable: '' as 'yes' | 'no' | '' };
type Errors = Partial<Record<keyof typeof empty, string>>;

/**
 * «Reportar incidencia» desde un bloque en curso o cerrado (L-01e, ADR 0023): el equipo apartado en el bloque, el tipo de
 * falla, qué pasa y si se puede seguir usando. El incidente nace en Equipos, con el vínculo a la práctica; si no se puede
 * seguir usando, el equipo pasa a Fuera de servicio. Elegir si se puede usar es obligatorio, como en Equipos.
 */
export function PracticeIncidentSheet({
  workspaceId,
  open,
  onOpenChange,
  request,
  block,
}: SheetBaseProps & {
  request: RequestView;
  block: RequestView['blocks'][number];
}) {
  const report = useReportPracticeIncident(workspaceId, block.activityId);
  const refreshEquipment = useRefreshEquipment(workspaceId);
  const assets = blockAssets(request.lines, block);
  const [values, setValues] = useState(empty);
  const [errors, setErrors] = useState<Errors>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Con un solo equipo apartado no hay nada que elegir.
  const assetId = values.assetId || (assets.length === 1 ? (assets[0]?.id ?? '') : '');
  const change = (patch: Partial<typeof empty>) => {
    setValues((current) => ({ ...current, ...patch }));
    setErrors((current) => ({ ...current, ...Object.fromEntries(Object.keys(patch).map((key) => [key, undefined])) }));
    setGeneralError(null);
  };

  const dismiss = () => {
    onOpenChange(false);
    setValues(empty);
    setErrors({});
    setGeneralError(null);
  };

  const submit = async () => {
    if (report.isPending) return;
    const found: Errors = {};
    if (!assetId) found.assetId = 'Elige el equipo con el incidente.';
    if (!values.faultType) found.faultType = 'Elige el tipo de falla.';
    if (!values.description.trim()) found.description = 'Describe qué le pasa al equipo.';
    if (!values.usable) found.usable = 'Indica si el equipo se puede seguir usando.';
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    const payload = practiceIncidentRequest.safeParse({ assetId, faultType: values.faultType, description: values.description.trim(), usable: values.usable === 'yes' });
    if (!payload.success) {
      setGeneralError('Revisa lo escrito: la descripción admite hasta 2000 caracteres.');
      return;
    }
    setGeneralError(null);
    try {
      await report.mutateAsync(payload.data);
      void refreshEquipment();
      const code = assets.find((asset) => asset.id === assetId)?.code;
      toast.success('Incidencia reportada', {
        description: `${code ?? 'El equipo'} · ${payload.data.usable ? 'sigue disponible.' : 'pasó a Fuera de servicio.'}`,
      });
      dismiss();
    } catch (error) {
      setGeneralError(labsErrorMessage(error));
    }
  };

  return (
    <FormSheet
      icon={TriangleAlert}
      title="Reportar incidencia"
      description={`${block.code} · ${shortDateText(block.date)}. Quien atiende los equipos la verá en Equipos, con el vínculo a esta práctica.`}
      open={open}
      onOpenChange={(next) => (next ? onOpenChange(true) : dismiss())}
      submitLabel="Reportar incidencia"
      pending={report.isPending}
      generalError={generalError}
      onSubmit={() => void submit()}
      dirty={values.faultType !== '' || values.description !== '' || values.usable !== '' || values.assetId !== ''}
      focusFirst
      pendingText="Reportando la incidencia…"
    >
      <PillField
        label="Equipo"
        required
        size="sm"
        value={assetId}
        options={assets.map((asset) => ({ value: asset.id, label: `${asset.code} · ${asset.lineName}` }))}
        onChange={(value) => change({ assetId: value })}
        error={errors.assetId}
      />
      <PillField
        label="Tipo de falla"
        required
        value={values.faultType}
        options={faultTypes}
        onChange={(value) => change({ faultType: value })}
        error={errors.faultType}
      />
      <Field
        label="Qué le pasa"
        required
        hint={`Qué viste, cuándo empezó y qué estabas haciendo. Hasta ${DESCRIPTION_MAX} caracteres.`}
        error={errors.description}
      >
        <Textarea rows={4} maxLength={DESCRIPTION_MAX} value={values.description} onChange={(event) => change({ description: event.target.value })} />
      </Field>
      <PillField
        label="¿Se puede seguir usando?"
        required
        size="sm"
        value={values.usable}
        options={[
          { value: 'yes', label: 'Sí' },
          { value: 'no', label: 'No' },
        ]}
        onChange={(value) => change({ usable: value })}
        hint={values.usable === 'no' ? 'El equipo pasará a Fuera de servicio.' : undefined}
        error={errors.usable}
      />
    </FormSheet>
  );
}
