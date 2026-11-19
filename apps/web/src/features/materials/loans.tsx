import { Button, Input, Skeleton, StatePanel } from '@platlab/ui';
import { HandHelping, Plus, Search, SearchX } from 'lucide-react';
import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { FilterPill } from '../../app/filter-pill';
import { todayInZone } from '../../app/format';
import { SectionHeader } from '../../app/section-header';
import { QueryErrorState } from '../../app/states';
import { useMaterials } from './context';
import { LoanDetailSheet } from './loan-detail';
import { LoanColumnHeads, LoanRow } from './loan-row';
import { LoanSheet } from './loan-sheet';
import { useLoanPage, useMaterialsSummary } from './queries';
import { loanFilterLabels, type LoanFilter } from './text';

const filters = ['open', 'overdue', 'closed', 'all'] as const;
const parseFilter = (value: string | null): LoanFilter => (value === 'overdue' || value === 'closed' || value === 'all' ? value : 'open');

const emptyTitles: Record<LoanFilter, string> = {
  open: 'No hay préstamos abiertos',
  overdue: 'Ningún préstamo atrasado',
  closed: 'Aún no hay préstamos cerrados',
  all: 'Aún no hay préstamos',
};

/**
 * Préstamos (ADR 0025), el mostrador: los vales en una lista con columnas (vale y prestatario, piezas, plazo y estado), del
 * más nuevo al más viejo, con pestañas por estado y su número, un buscador por vale, persona o material, y «Nuevo
 * préstamo». Tocar un vale abre su detalle, donde se registra la devolución. `?filtro=` elige la pestaña, `?vale=` abre un
 * vale y `?nuevo=1` abre la hoja de préstamo (los enlaces del Resumen).
 */
export function MaterialsLoansPage() {
  const { workspaceId, canLend, me } = useMaterials();
  const timeZone = me.workspace.timeZone;
  const today = todayInZone(timeZone);
  const summary = useMaterialsSummary(workspaceId).data;
  const counts: Record<LoanFilter, number | undefined> = {
    open: summary?.openLoans,
    overdue: summary?.overdueLoans,
    closed: summary?.closedLoans,
    all: summary ? summary.openLoans + summary.closedLoans : undefined,
  };
  const [params, setParams] = useSearchParams();
  const filter = parseFilter(params.get('filtro'));
  const [search, setSearch] = useState('');
  const searching = search.trim().length >= 2;
  const loans = useLoanPage(workspaceId, filter, search);
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
      <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Estado del préstamo">
          {filters.map((value) => (
            <FilterPill key={value} label={loanFilterLabels[value]} count={counts[value]} active={filter === value} onToggle={() => setFilter(value)} />
          ))}
        </div>
        <div className="relative w-full md:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-subtle" aria-hidden />
          <Input
            type="search"
            aria-label="Buscar vale, persona o material"
            placeholder="Buscar vale, persona o material"
            autoComplete="off"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="h-11 pl-9 sm:h-10"
          />
        </div>
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
            {searching ? (
              <StatePanel icon={SearchX} title="Ningún vale coincide" description="Busca por número (P-0043), por quien se lo llevó o por el material." />
            ) : (
              <StatePanel
                icon={HandHelping}
                title={emptyTitles[filter]}
                description={
                  filter === 'open' && canLend
                    ? 'Cuando prestes material a alguien, el vale aparece aquí hasta que lo devuelva.'
                    : 'Los vales se muestran del más nuevo al más viejo.'
                }
                action={filter === 'open' ? (lend ?? undefined) : undefined}
              />
            )}
          </div>
        ) : (
          <>
            <div className={`overflow-hidden rounded-card bg-surface shadow-raised transition-opacity duration-200 ${loans.isPlaceholderData ? 'opacity-60' : ''}`}>
              <LoanColumnHeads />
              <ul className="divide-y divide-line">
                {items.map((loan) => (
                  <LoanRow key={loan.id} loan={loan} today={today} timeZone={timeZone} onOpen={() => setDetail({ id: loan.id, open: true })} />
                ))}
              </ul>
            </div>
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
