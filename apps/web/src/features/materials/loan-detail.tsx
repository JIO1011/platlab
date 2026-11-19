import { Badge, Button, Quantity, Sheet, Skeleton, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, sectionLabel } from '@platlab/ui';
import { HandHelping, PackageCheck } from 'lucide-react';
import { useState } from 'react';
import { CodeTag } from '../../app/code-tag';
import { formatDateTime } from '../../app/format';
import { QueryErrorState } from '../../app/states';
import { useMaterials } from './context';
import { useLoan } from './queries';
import { ReturnSheet } from './return-sheet';
import { dueText } from './text';

/**
 * El vale de un préstamo (ADR 0025): quién se llevó el material y cuándo debe volver, y por línea lo prestado, lo
 * devuelto, lo dañado, lo perdido y lo que falta. Quien devuelve registra la devolución desde aquí, parcial o total.
 */
export function LoanDetailSheet({ loanId, open, onOpenChange }: { loanId: string; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { workspaceId, me, canReturn } = useMaterials();
  const loan = useLoan(workspaceId, loanId);
  const [giving, setGiving] = useState<{ n: number; open: boolean } | null>(null);
  const data = loan.data;
  const timeZone = me.workspace.timeZone;

  return (
    <>
      <Sheet
        open={open}
        onOpenChange={onOpenChange}
        title={data ? `Préstamo ${data.code}` : 'Préstamo'}
        description={data ? data.borrower.name : undefined}
        icon={HandHelping}
        wide
        footer={
          data && data.status === 'open' && canReturn ? (
            <Button variant="primary" className="h-11 sm:h-10" aria-haspopup="dialog" onClick={() => setGiving({ n: (giving?.n ?? 0) + 1, open: true })}>
              <PackageCheck aria-hidden />
              Registrar devolución
            </Button>
          ) : undefined
        }
      >
        {loan.isPending ? (
          <Skeleton className="h-48 rounded-card" />
        ) : loan.isError || !data ? (
          <QueryErrorState error={loan.error} onRetry={() => void loan.refetch()} />
        ) : (
          <div className="grid gap-6">
            <ul className="flex flex-wrap items-center gap-1.5">
              <li>
                <Badge tone={data.status === 'closed' ? 'success' : 'info'} className="px-2.5">
                  {data.status === 'closed' ? 'Cerrado' : 'Abierto'}
                </Badge>
              </li>
              {data.overdue ? (
                <li>
                  <Badge tone="danger" className="px-2.5">Atrasado</Badge>
                </li>
              ) : null}
              {data.hasDebt ? (
                <li>
                  <Badge tone="warning" className="px-2.5">Con baja</Badge>
                </li>
              ) : null}
            </ul>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-ink-muted">Prestó</dt>
                <dd className="font-medium text-ink">{data.lentBy.name}</dd>
              </div>
              <div>
                <dt className="text-ink-muted">Fecha</dt>
                <dd className="font-medium text-ink">{formatDateTime(data.lentAt, timeZone)}</dd>
              </div>
              <div>
                <dt className="text-ink-muted">Plazo</dt>
                <dd className="font-medium text-ink">{dueText(data)}</dd>
              </div>
              {data.notes ? (
                <div>
                  <dt className="text-ink-muted">Notas</dt>
                  <dd className="break-words font-medium text-ink">{data.notes}</dd>
                </div>
              ) : null}
            </dl>
            <section aria-labelledby="loan-lines-title">
              <h3 id="loan-lines-title" className={sectionLabel}>
                Material
              </h3>
              <div className="mt-2 overflow-x-auto">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableHeader>Material</TableHeader>
                      <TableHeader numeric>Prestado</TableHeader>
                      <TableHeader numeric>Devuelto</TableHeader>
                      <TableHeader numeric>Dañado</TableHeader>
                      <TableHeader numeric>Perdido</TableHeader>
                      <TableHeader numeric>Falta</TableHeader>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.lines.map((line) => (
                      <TableRow key={line.line}>
                        <TableCell>
                          <span className="break-words font-medium text-ink">{line.productName}</span> <CodeTag>{line.productCode}</CodeTag>
                        </TableCell>
                        {[line.quantity, line.returned, line.damaged, line.lost, line.outstanding].map((value, column) => (
                          <TableCell key={column} numeric>
                            <Quantity value={value} unit={line.unit} />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </section>
          </div>
        )}
      </Sheet>
      {data && giving ? (
        <ReturnSheet
          key={`${giving.n}-${data.version}`}
          workspaceId={workspaceId}
          open={giving.open}
          onOpenChange={(next) => setGiving((current) => (current ? { ...current, open: next } : current))}
          loan={data}
        />
      ) : null}
    </>
  );
}
