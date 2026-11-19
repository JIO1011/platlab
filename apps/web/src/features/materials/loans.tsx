import { Button, Skeleton, StatePanel } from '@platlab/ui';
import { HandHelping, Plus } from 'lucide-react';
import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { FilterPill } from '../../app/filter-pill';
import { todayInZone } from '../../app/format';
import { SectionHeader } from '../../app/section-header';
import { QueryErrorState } from '../../app/states';
import { useMaterials } from './context';
import { LoanCard } from './loan-card';
import { LoanDetailSheet } from './loan-detail';
import { LoanSheet } from './loan-sheet';
import { useLoanPage, useMaterialsSummary } from './queries';
import { loanFilterLabels, type LoanFilter } from './text';

const parseFilter = (value: string | null): LoanFilter => (value === 'overdue' || value === 'closed' ? value : 'open');

/**
 * Préstamos (ADR 0025), el mostrador: los vales abiertos, atrasados o cerrados, del más nuevo al más viejo, y «Nuevo
 * préstamo». Tocar un vale abre su detalle, donde se registra la devolución. `?filtro=` elige la lista, `?vale=` abre un
 * vale y `?nuevo=1` abre la hoja de préstamo (los enlaces del Resumen).
 */
export function MaterialsLoansPage() {
  const { workspaceId, canLend, me } = useMaterials();
  const timeZone = me.workspace.timeZone;
  const today = todayInZone(timeZone);
  const summary = useMaterialsSummary(workspaceId).data;
  const counts: Partial<Record<LoanFilter, number | undefined>> = { open: summary?.openLoans, overdue: summary?.overdueLoans };
  const [params, setParams] = useSearchParams();
  const filter = parseFilter(params.get('filtro'));
  const loans = useLoanPage(workspaceId, filter);
  const [form, setForm] = useState<{ n: number; open: boolean } | null>(() => (params.get('nuevo') === '1' && canLend ? { n: 1, open: true } : null));
  const [detail, setDetail] = useState<{ id: string; open: boolean } | null>(() => {
    const id = params.get('vale');
    return id ? { id, open: true } : null;
  });
  const items = loans.data?.pages.flatMap((page) => page.items) ?? [];

  const setFilter = (next: LoanFilter) => setParams(next === 'open' ? {} : { filtro: next }, { replace: true });
  const lend = canLend ? (
    <Button variant="primary" className="h-12 sm:h-10" aria-haspopup="dialog" onClick={() => setForm({ n: (form?.n ?? 0) + 1, open: true })}>
      <Plus aria-hidden />
      Nuevo préstamo
    </Button>
  ) : null;

  return (
    <>
      <SectionHeader title="Préstamos" updatedAt={loans.dataUpdatedAt} actions={lend} />
      <div className="mt-6 flex flex-wrap items-center gap-2" role="group" aria-label="Estado del préstamo">
        {(['open', 'overdue', 'closed'] as const).map((value) => (
          <FilterPill key={value} label={loanFilterLabels[value]} count={counts[value]} active={filter === value} onToggle={() => setFilter(value)} />
        ))}
      </div>
      <div className="mt-4">
        {loans.isPending ? (
          <div aria-busy="true">
            <Skeleton className="h-64 rounded-card" />
          </div>
        ) : loans.isError ? (
          <div className="rounded-card bg-surface shadow-raised">
            <QueryErrorState error={loans.error} onRetry={() => void loans.refetch()} />
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-card bg-surface shadow-raised">
            <StatePanel
              icon={HandHelping}
              title={filter === 'open' ? 'No hay préstamos abiertos' : filter === 'overdue' ? 'Ningún préstamo atrasado' : 'Aún no hay préstamos cerrados'}
              description={
                filter === 'open' && canLend
                  ? 'Cuando prestes material a alguien, el vale aparece aquí hasta que lo devuelva.'
                  : 'Los vales se muestran del más nuevo al más viejo.'
              }
              action={filter === 'open' ? (lend ?? undefined) : undefined}
            />
          </div>
        ) : (
          <>
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((loan) => (
                <LoanCard key={loan.id} loan={loan} today={today} timeZone={timeZone} onOpen={() => setDetail({ id: loan.id, open: true })} />
              ))}
            </ul>
            {loans.hasNextPage ? (
              <div className="mt-4 flex justify-center">
                <Button className="h-11 sm:h-10" onClick={() => void loans.fetchNextPage()} disabled={loans.isFetchingNextPage}>
                  {loans.isFetchingNextPage ? 'Cargando…' : 'Ver más'}
                </Button>
              </div>
            ) : null}
          </>
        )}
      </div>
      {detail ? (
        <LoanDetailSheet
          key={detail.id}
          loanId={detail.id}
          open={detail.open}
          onOpenChange={(open) => setDetail((current) => (current ? { ...current, open } : current))}
        />
      ) : null}
      {form ? (
        <LoanSheet
          key={form.n}
          workspaceId={workspaceId}
          open={form.open}
          onOpenChange={(open) => setForm((current) => (current ? { ...current, open } : current))}
          onCreated={(id) => setDetail({ id, open: true })}
        />
      ) : null}
    </>
  );
}
