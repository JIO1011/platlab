import { FORM_LOGO_MAX_BYTES, FORM_MAX_HEADER_LINES } from '@platlab/contracts';
import { Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, cn } from '@platlab/ui';
import { ImagePlus, Plus, Trash2, Upload, X } from 'lucide-react';
import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { labsErrorMessage } from './commands';
import type { Draft, FormIssues } from './form-draft';
import { LOGO_ACCEPT, checkLogo, type LogoFile } from './form-logo';
import { Cell, EditableText, Ghost, reveal, sheetGrid } from './form-parts';

/** Lo que el membrete necesita para editarse: subir el logo (devuelve su dirección) y aplicar un cambio al borrador. */
export interface MastheadDesign {
  issues: FormIssues;
  set: (patch: Partial<Draft>) => void;
  uploadLogo: (logo: LogoFile) => Promise<string>;
}

/** Un bloque del encabezado: una tira de color con su rótulo arriba y, debajo, su contenido. */
function MastheadBlock({ head, headClassName, children }: { head: string; headClassName?: string; children: ReactNode }) {
  return (
    <div className={cn(sheetGrid, 'grid-rows-[auto_minmax(0,1fr)]')}>
      <Cell kind="head" className={cn('py-0 text-center text-[11px] print:text-[7pt] print:leading-[3.5mm]', headClassName)}>
        {head}
      </Cell>
      {children}
    </div>
  );
}

/** El membrete en la hoja de solo lectura: el logo (a la altura de la franja al imprimir) y sus líneas; sin ninguno, el nombre del espacio. */
function BrandView({ draft, workspaceName }: { draft: Draft; workspaceName: string }) {
  const { logoUrl, lines } = draft.header;
  const shown = lines.filter((line) => line.trim() !== '');
  return (
    <Cell className="flex items-center justify-center gap-2 p-1 text-center print:overflow-hidden print:py-0">
      {logoUrl ? <img src={logoUrl} alt={shown.length > 0 ? '' : 'Logo del membrete'} className="max-h-12 w-auto max-w-[45%] shrink-0 object-contain print:max-h-[12mm]" /> : null}
      {shown.length > 0 ? (
        <div className="min-w-0 text-[10px] leading-tight print:text-[7pt]">
          {shown.map((line, at) => (
            <p key={at} className={cn('break-words', at === 0 && 'font-semibold')}>
              {line}
            </p>
          ))}
        </div>
      ) : logoUrl ? null : (
        <span className="text-[12px] font-semibold print:text-[9pt]">{workspaceName}</span>
      )}
    </Cell>
  );
}

/**
 * La celda del logo al editar: un cuadro con la vista previa (o «Agregar logo») que abre un menú con Subir o Cambiar y
 * Quitar. Valida tipo y peso antes de subir; el archivo sube al elegirlo y, mientras, se ve su vista previa local.
 */
function LogoPicker({ header, design, onStatus }: { header: Draft['header']; design: MastheadDesign; onStatus: (status: Status) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  // El borrador vigente al terminar la subida, que puede tardar: no el de cuando se eligió el archivo.
  const latest = useRef({ header, design });
  latest.current = { header, design };
  const url = header.logoUrl;
  const shown = preview ?? url;

  // La vista previa local se libera al reemplazarla o al cerrar la hoja.
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );

  const choose = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Vacío el campo para poder elegir otra vez el mismo archivo.
    event.target.value = '';
    if (!file) return;
    const checked = checkLogo(file);
    if ('error' in checked) {
      onStatus({ busy: false, error: checked.error });
      return;
    }
    onStatus({ busy: true, error: null });
    setPreview(URL.createObjectURL(file));
    try {
      const logoUrl = await design.uploadLogo(checked.logo);
      latest.current.design.set({ header: { ...latest.current.header, logoUrl } });
      onStatus({ busy: false, error: null });
    } catch (failure) {
      onStatus({ busy: false, error: labsErrorMessage(failure) });
    } finally {
      setPreview(null);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={shown ? 'Logo del membrete: cambiar o quitar' : 'Logo del membrete: agregar'}
          className={cn(
            'group/edit relative h-14 w-24 shrink-0 overflow-hidden rounded-control border bg-white text-ink-subtle transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action',
            shown ? 'border-line-strong' : 'border-dashed border-ink-subtle hover:bg-action-soft hover:text-ink-muted',
          )}
        >
          {shown ? (
            <>
              <img src={shown} alt="Vista previa del logo" className="size-full object-contain p-0.5" />
              <span aria-hidden className={cn('absolute inset-x-0 bottom-0 bg-ink/70 py-0.5 text-center text-[10px] font-medium text-white', reveal)}>
                Cambiar
              </span>
            </>
          ) : (
            <span aria-hidden className="grid size-full place-content-center justify-items-center gap-0.5 text-[10px] font-medium">
              <ImagePlus className="size-5" />
              Agregar logo
            </span>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-44">
          <DropdownMenuItem onSelect={() => input.current?.click()}>
            <Upload aria-hidden />
            {url ? 'Cambiar logo' : 'Subir logo'}
          </DropdownMenuItem>
          {url ? (
            <DropdownMenuItem
              onSelect={() => {
                onStatus({ busy: false, error: null });
                design.set({ header: { ...header, logoUrl: null } });
              }}
            >
              <Trash2 aria-hidden />
              Quitar logo
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
      <input ref={input} type="file" accept={LOGO_ACCEPT} hidden tabIndex={-1} onChange={(event) => void choose(event)} />
    </>
  );
}

interface Status {
  busy: boolean;
  error: string | null;
}

/** Qué escribir en cada línea del membrete, de arriba abajo. */
const lineHints = ['Institución', 'Facultad', 'Área o carrera'];

/** El membrete en edición: el logo a la izquierda y, a su lado, hasta tres líneas de texto que se escriben, agregan y quitan. */
function BrandDesign({ draft, workspaceName, design }: { draft: Draft; workspaceName: string; design: MastheadDesign }) {
  const [status, setStatus] = useState<Status>({ busy: false, error: null });
  const { header } = draft;
  const setLines = (lines: string[]) => design.set({ header: { ...header, lines } });
  return (
    <Cell className="grid content-center gap-1 p-1.5">
      <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
        <LogoPicker header={header} design={design} onStatus={setStatus} />
        <div className="grid min-w-0 flex-1 gap-0.5">
          {header.lines.map((line, at) => (
            <div key={at} className="group/edit flex items-center gap-0.5">
              <EditableText
                label={`Línea ${at + 1} del membrete`}
                value={line}
                maxLength={120}
                placeholder={lineHints[at] ?? 'Texto'}
                className="text-[11px] sm:min-h-5 sm:py-0"
                onChange={(value) => setLines(header.lines.map((item, index) => (index === at ? value : item)))}
              />
              <Button variant="ghost" size="icon" className={cn('size-11 shrink-0 sm:size-6', reveal)} aria-label={`Quitar la línea ${at + 1} del membrete`} onClick={() => setLines(header.lines.filter((_, index) => index !== at))}>
                <X aria-hidden />
              </Button>
            </div>
          ))}
          {header.lines.length === 0 ? <Ghost note className="px-1.5 text-[11px] leading-tight">Sin líneas, la hoja muestra «{workspaceName}».</Ghost> : null}
          {header.lines.length < FORM_MAX_HEADER_LINES ? (
            <Button className="h-11 justify-self-start sm:h-6" onClick={() => setLines([...header.lines, ''])}>
              <Plus aria-hidden />
              Agregar línea de texto
            </Button>
          ) : null}
        </div>
      </div>
      {status.busy ? (
        <p role="status" className="text-[11px] text-ink-muted">
          Subiendo el logo…
        </p>
      ) : status.error ? (
        <p role="alert" className="text-[11.5px] font-medium text-danger">
          {status.error}
        </p>
      ) : header.logoUrl ? null : (
        <Ghost note className="text-[11px] leading-tight">
          Logo en JPEG, PNG o WebP de hasta {FORM_LOGO_MAX_BYTES / 1024} KiB.
        </Ghost>
      )}
    </Cell>
  );
}

/** El encabezado en franja, de una sola fila: el membrete (logo y líneas), la revisión con el título y el código. */
export function Masthead({ draft, workspaceName, revision, design }: { draft: Draft; workspaceName: string; revision: number; design?: MastheadDesign }) {
  const code = draft.documentCode.trim();
  const issues = design?.issues;
  return (
    <header className={cn(sheetGrid, 'sm:grid-cols-[minmax(0,1.7fr)_minmax(0,2.6fr)_minmax(0,1.2fr)] print:h-[14mm]')}>
      {design ? <BrandDesign draft={draft} workspaceName={workspaceName} design={design} /> : <BrandView draft={draft} workspaceName={workspaceName} />}
      <MastheadBlock head={revision > 0 ? `Revisión ${revision}` : 'Sin publicar'} headClassName="italic">
        <Cell kind="label" className={cn('flex flex-col justify-center text-center text-[15px] font-bold tracking-normal print:overflow-hidden print:whitespace-nowrap print:py-0 print:text-[12pt] print:leading-tight', design && 'p-0.5')}>
          {design ? (
            <EditableText
              label="Título del formato"
              value={draft.title}
              maxLength={120}
              placeholder="Título del formato"
              error={issues?.title}
              className="text-center uppercase placeholder:normal-case sm:min-h-6 sm:py-0"
              onChange={(title) => design.set({ title })}
            />
          ) : (
            draft.title.trim() || 'Formato sin título'
          )}
        </Cell>
      </MastheadBlock>
      <MastheadBlock head="Código" headClassName="text-[11px]">
        <Cell className={cn('grid content-center gap-0.5 text-center print:py-0', design && 'p-0.5')}>
          {design ? (
            <EditableText
              label="Código del documento"
              value={draft.documentCode}
              maxLength={40}
              placeholder="Código"
              error={issues?.documentCode}
              className="text-center font-bold sm:min-h-5 sm:py-0"
              onChange={(documentCode) => design.set({ documentCode })}
            />
          ) : code ? (
            <span className="font-bold print:text-[9pt]">{code}</span>
          ) : null}
          <Ghost note className="text-[11px] leading-tight">
            Lo pone el sistema al programar
          </Ghost>
        </Cell>
      </MastheadBlock>
    </header>
  );
}
