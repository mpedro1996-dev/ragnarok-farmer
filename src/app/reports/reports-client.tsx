"use client";

import Image from "next/image";
import Link from "next/link";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import { startTransition, useState } from "react";

import { formatZenny } from "@/features/items/item-schema";

type CharacterOption = {
  id: number;
  name: string;
  level: number;
  classId: number;
  classLabel: string;
};

type InstanceOption = {
  id: number;
  name: string;
  minimumLevel: number;
};

type ReportRow = {
  itemId: number;
  itemName: string;
  divinePrideId: number | null;
  averageZenny: number;
  isSoldToNpc: boolean;
  totalQuantity: number;
  totalValue: number;
  overchargeTotalValue: number | null;
};

type ReportFiltersResponse = {
  characters: CharacterOption[];
  instances: InstanceOption[];
};

type AppliedFilters = {
  dateMode: "daily" | "range";
  day: string | null;
  startDate: string;
  endDate: string;
  characterIds: number[];
  instanceIds: number[];
};

type ReportTotals = {
  totalItemTypes: number;
  totalQuantity: number;
  totalValue: number;
  totalOverchargeValue: number;
};

type FarmReportResponse = {
  filters: ReportFiltersResponse;
  appliedFilters: AppliedFilters;
  rows: ReportRow[];
  totals: ReportTotals;
};

type ApiErrorPayload = {
  message?: string;
};

type FeedbackState =
  | {
      tone: "success" | "error";
      text: string;
    }
  | null;

type ReportFilterState = {
  dateMode: "daily" | "range";
  day: string;
  startDate: string;
  endDate: string;
  characterIds: number[];
  instanceIds: number[];
};

const emptyTotals: ReportTotals = {
  totalItemTypes: 0,
  totalQuantity: 0,
  totalValue: 0,
  totalOverchargeValue: 0,
};

async function requestFarmReport(filters?: Partial<ReportFilterState>) {
  const params = new URLSearchParams();

  if (filters?.dateMode) {
    params.set("dateMode", filters.dateMode);
  }

  if (filters?.dateMode === "daily") {
    if (filters.day) {
      params.set("day", filters.day);
    }
  } else if (filters?.dateMode === "range") {
    if (filters.startDate) {
      params.set("startDate", filters.startDate);
    }

    if (filters.endDate) {
      params.set("endDate", filters.endDate);
    }
  }

  if (filters?.characterIds) {
    params.set("characterIds", filters.characterIds.join(","));
  }

  if (filters?.instanceIds) {
    params.set("instanceIds", filters.instanceIds.join(","));
  }

  const url = params.size > 0 ? `/api/reports/farm?${params.toString()}` : "/api/reports/farm";
  const response = await fetch(url);
  const payload = (await response.json()) as FarmReportResponse | ApiErrorPayload;

  if (!response.ok) {
    throw new Error(
      getApiErrorMessage(payload as ApiErrorPayload, "Não foi possível carregar o relatório."),
    );
  }

  return payload as FarmReportResponse;
}

export function ReportsClient({ initialData }: { initialData: FarmReportResponse }) {
  const [characters, setCharacters] = useState<CharacterOption[]>(
    initialData.filters.characters,
  );
  const [instances, setInstances] = useState<InstanceOption[]>(
    initialData.filters.instances,
  );
  const [filters, setFilters] = useState<ReportFilterState>({
    dateMode: initialData.appliedFilters.dateMode,
    day: initialData.appliedFilters.day ?? initialData.appliedFilters.startDate,
    startDate: initialData.appliedFilters.startDate,
    endDate: initialData.appliedFilters.endDate,
    characterIds: initialData.appliedFilters.characterIds,
    instanceIds: initialData.appliedFilters.instanceIds,
  });
  const [rows, setRows] = useState<ReportRow[]>(initialData.rows);
  const [totals, setTotals] = useState<ReportTotals>(initialData.totals ?? emptyTotals);
  const [appliedFilters, setAppliedFilters] = useState<AppliedFilters | null>(
    initialData.appliedFilters,
  );
  const isLoading = false;
  const [isApplying, setIsApplying] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  async function handleApplyFilters() {
    setFeedback(null);

    if (filters.characterIds.length === 0) {
      setFeedback({
        tone: "error",
        text: "Selecione ao menos um personagem para gerar o relatório.",
      });
      return;
    }

    if (filters.instanceIds.length === 0) {
      setFeedback({
        tone: "error",
        text: "Selecione ao menos uma instância para gerar o relatório.",
      });
      return;
    }

    if (
      filters.dateMode === "range" &&
      filters.startDate &&
      filters.endDate &&
      filters.startDate > filters.endDate
    ) {
      setFeedback({
        tone: "error",
        text: "A data inicial não pode ser maior que a data final.",
      });
      return;
    }

    setIsApplying(true);

    try {
      const payload = await requestFarmReport(filters);

      startTransition(() => {
        syncResponseState(payload, {
          setCharacters,
          setInstances,
          setRows,
          setTotals,
          setAppliedFilters,
          setFilters,
        });
      });
      setFeedback({
        tone: "success",
        text: "Relatório atualizado com sucesso.",
      });
    } catch (error) {
      setFeedback({
        tone: "error",
        text: error instanceof Error ? error.message : "Não foi possível carregar o relatório.",
      });
    } finally {
      setIsApplying(false);
    }
  }

  const hasCharacters = characters.length > 0;
  const hasInstances = instances.length > 0;
  const selectedCharacterCount = filters.characterIds.length;
  const selectedInstanceCount = filters.instanceIds.length;

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-6">
        <section className="overflow-hidden rounded-[32px] border border-[var(--border-subtle)] bg-[var(--surface-elevated)] shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
          <div className="border-b border-[var(--border-subtle)] bg-gradient-to-r from-slate-950 via-indigo-950 to-cyan-900 px-6 py-8 text-white sm:px-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl space-y-3">
                <Link
                  href="/"
                  className="inline-flex w-fit rounded-full border border-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-100 transition hover:bg-white/10"
                >
                  Ragnarok Farmer
                </Link>
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                    Relatórios de farm
                  </h1>
                  <p className="max-w-2xl text-sm leading-6 text-slate-200 sm:text-base">
                    Consulte o valor diário ou por período a partir dos registros operacionais
                    já salvos, com agregação por item e totalizadores consolidados.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <MetricCard label="Itens no filtro" value={String(rows.length)} />
                <MetricCard label="Quantidade" value={formatZenny(totals.totalQuantity)} />
                <MetricCard label="Valor total" value={formatZenny(totals.totalValue)} />
                <MetricCard
                  label="Com superfaturar"
                  value={formatZenny(totals.totalOverchargeValue)}
                />
              </div>
            </div>
          </div>

          <div className="bg-white px-6 py-6 sm:px-8">
            <section className="rounded-[28px] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-5 shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700">
                    Painel de filtros do relatório
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
                    Recorte operacional
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
                    O relatório usa o dia operacional do farm, respeitando a virada fixa às
                    04:00 em America/Sao_Paulo.
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => resetFilters(characters, instances, appliedFilters, setFilters)}
                    disabled={isLoading || isApplying}
                    className="inline-flex h-12 items-center justify-center rounded-full border border-[var(--border-default)] px-5 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[var(--surface-subtle)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Restaurar padrão
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyFilters}
                    disabled={isLoading || isApplying || !hasCharacters || !hasInstances}
                    className="inline-flex h-12 items-center justify-center rounded-full bg-[var(--action-primary)] px-5 text-sm font-semibold text-[var(--text-on-brand)] transition hover:bg-[var(--action-primary-hover)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isApplying ? "Atualizando..." : "Gerar relatório"}
                  </button>
                </div>
              </div>

              <div className="mt-6 grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)_minmax(0,1fr)]">
                <section className="rounded-[24px] border border-[var(--border-subtle)] bg-[var(--surface-section)] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                    Modo da data
                  </p>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <DateModeButton
                      label="Diário"
                      active={filters.dateMode === "daily"}
                      onClick={() =>
                        setFilters((current) => ({
                          ...current,
                          dateMode: "daily",
                        }))
                      }
                    />
                    <DateModeButton
                      label="Período"
                      active={filters.dateMode === "range"}
                      onClick={() =>
                        setFilters((current) => ({
                          ...current,
                          dateMode: "range",
                        }))
                      }
                    />
                  </div>

                  {filters.dateMode === "daily" ? (
                    <label className="mt-4 flex flex-col gap-2 text-sm font-medium text-[var(--text-primary)]">
                      Dia operacional
                      <input
                        type="date"
                        value={filters.day}
                        onChange={(event) =>
                          setFilters((current) => ({
                            ...current,
                            day: event.target.value,
                          }))
                        }
                        className="h-12 rounded-2xl border border-[var(--border-default)] bg-white px-4 text-[var(--text-primary)] outline-none transition focus:border-[var(--border-focus)] focus:ring-4 focus:ring-cyan-100"
                      />
                    </label>
                  ) : (
                    <div className="mt-4 grid gap-4">
                      <label className="flex flex-col gap-2 text-sm font-medium text-[var(--text-primary)]">
                        Data inicial
                        <input
                          type="date"
                          value={filters.startDate}
                          onChange={(event) =>
                            setFilters((current) => ({
                              ...current,
                              startDate: event.target.value,
                            }))
                          }
                          className="h-12 rounded-2xl border border-[var(--border-default)] bg-white px-4 text-[var(--text-primary)] outline-none transition focus:border-[var(--border-focus)] focus:ring-4 focus:ring-cyan-100"
                        />
                      </label>
                      <label className="flex flex-col gap-2 text-sm font-medium text-[var(--text-primary)]">
                        Data final
                        <input
                          type="date"
                          value={filters.endDate}
                          onChange={(event) =>
                            setFilters((current) => ({
                              ...current,
                              endDate: event.target.value,
                            }))
                          }
                          className="h-12 rounded-2xl border border-[var(--border-default)] bg-white px-4 text-[var(--text-primary)] outline-none transition focus:border-[var(--border-focus)] focus:ring-4 focus:ring-cyan-100"
                        />
                      </label>
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2">
                    <FilterSummaryChip
                      label={
                        filters.dateMode === "daily"
                          ? filters.day || "Dia não informado"
                          : `${filters.startDate || "?"} até ${filters.endDate || "?"}`
                      }
                    />
                  </div>
                </section>

                <ChecklistFilter
                  title="Personagens"
                  summary={`${selectedCharacterCount} selecionado(s)`}
                  disabled={!hasCharacters}
                  onSelectAll={() =>
                    setFilters((current) => ({
                      ...current,
                      characterIds: characters.map((character) => character.id),
                    }))
                  }
                  onClear={() =>
                    setFilters((current) => ({
                      ...current,
                      characterIds: [],
                    }))
                  }
                >
                  {hasCharacters ? (
                    characters.map((character) => (
                      <ChecklistRow
                        key={character.id}
                        checked={filters.characterIds.includes(character.id)}
                        label={character.name}
                        description={`Nv. ${character.level} • ${character.classLabel}`}
                        onChange={() =>
                          toggleIdInFilter(character.id, "characterIds", setFilters)
                        }
                      />
                    ))
                  ) : (
                    <ChecklistEmptyState
                      title="Nenhum personagem cadastrado"
                      href="/admin/characters"
                      linkLabel="/admin/characters"
                    />
                  )}
                </ChecklistFilter>

                <ChecklistFilter
                  title="Instâncias"
                  summary={`${selectedInstanceCount} selecionada(s)`}
                  disabled={!hasInstances}
                  onSelectAll={() =>
                    setFilters((current) => ({
                      ...current,
                      instanceIds: instances.map((instance) => instance.id),
                    }))
                  }
                  onClear={() =>
                    setFilters((current) => ({
                      ...current,
                      instanceIds: [],
                    }))
                  }
                >
                  {hasInstances ? (
                    instances.map((instance) => (
                      <ChecklistRow
                        key={instance.id}
                        checked={filters.instanceIds.includes(instance.id)}
                        label={instance.name}
                        description={`Nível mínimo ${instance.minimumLevel}`}
                        onChange={() => toggleIdInFilter(instance.id, "instanceIds", setFilters)}
                      />
                    ))
                  ) : (
                    <ChecklistEmptyState
                      title="Nenhuma instância cadastrada"
                      href="/admin/instances"
                      linkLabel="/admin/instances"
                    />
                  )}
                </ChecklistFilter>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <FilterSummaryChip label={`${selectedCharacterCount} personagem(ns)`} />
                <FilterSummaryChip label={`${selectedInstanceCount} instância(s)`} />
                <FilterSummaryChip label={describeAppliedMode(filters)} />
              </div>
            </section>
          </div>
        </section>

        {feedback ? (
          <div
            className={`rounded-[24px] border px-4 py-3 text-sm font-medium shadow-sm ${
              feedback.tone === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-rose-200 bg-rose-50 text-rose-800"
            }`}
          >
            {feedback.text}
          </div>
        ) : null}

        <section className="rounded-[32px] border border-[var(--border-subtle)] bg-[var(--surface-card)] shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
          <header className="flex flex-col gap-4 border-b border-[var(--border-subtle)] px-6 py-4 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                Resultado agregado por item
              </h2>
              <p className="text-sm text-[var(--text-secondary)]">
                Consolidado por item com base nos drops registrados no farm operacional.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <HeaderBadge label={`${rows.length} itens`} />
              <HeaderBadge label={`${totals.totalQuantity} quantidade`} />
              <HeaderBadge label={describePeriod(appliedFilters)} />
            </div>
          </header>

          {isLoading ? (
            <LoadingTable />
          ) : !hasCharacters ? (
            <SectionEmptyState
              title="Cadastre personagens antes do relatório"
              description="A página precisa de personagens para aplicar o filtro operacional."
              href="/admin/characters"
              linkLabel="/admin/characters"
            />
          ) : !hasInstances ? (
            <SectionEmptyState
              title="Cadastre instâncias antes do relatório"
              description="A página precisa de instâncias para consultar o farm já registrado."
              href="/admin/instances"
              linkLabel="/admin/instances"
            />
          ) : rows.length === 0 ? (
            <SectionEmptyState
              title="Nenhum registro encontrado"
              description="Ajuste os filtros de personagens, data ou instâncias para encontrar dados de farm."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse">
                <thead className="bg-[var(--surface-section)]">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--text-primary)]">
                      Item
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--text-primary)]">
                      Valor médio em zenny
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--text-primary)]">
                      Quantidade farmada
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--text-primary)]">
                      Valor total
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--text-primary)]">
                      Valor total com superfaturar
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr
                      key={row.itemId}
                      className={
                        index % 2 === 0 ? "bg-white" : "bg-[var(--surface-subtle)]/65"
                      }
                    >
                      <td className="px-6 py-4">
                        <ReportItemCell row={row} />
                      </td>
                      <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">
                        {formatZenny(row.averageZenny)}
                      </td>
                      <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">
                        {formatZenny(row.totalQuantity)}
                      </td>
                      <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">
                        {formatZenny(row.totalValue)}
                      </td>
                      <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">
                        {row.overchargeTotalValue === null
                          ? "-"
                          : formatZenny(row.overchargeTotalValue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t border-[var(--border-subtle)] bg-[var(--surface-section)]">
                  <tr>
                    <td className="px-6 py-4 text-sm font-semibold text-[var(--text-primary)]">
                      Total geral
                    </td>
                    <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">
                      {formatZenny(totals.totalItemTypes)} tipo(s)
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-[var(--text-primary)]">
                      {formatZenny(totals.totalQuantity)}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-[var(--text-primary)]">
                      {formatZenny(totals.totalValue)}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-[var(--text-primary)]">
                      {formatZenny(totals.totalOverchargeValue)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function ChecklistFilter({
  title,
  summary,
  disabled,
  onSelectAll,
  onClear,
  children,
}: {
  title: string;
  summary: string;
  disabled: boolean;
  onSelectAll: () => void;
  onClear: () => void;
  children: ReactNode;
}) {
  return (
    <details
      open
      className="rounded-[24px] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-4"
    >
      <summary className="cursor-pointer list-none">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-base font-semibold text-[var(--text-primary)]">{title}</p>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">{summary}</p>
          </div>
          <span className="rounded-full bg-[var(--surface-subtle)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">
            Filtro
          </span>
        </div>
      </summary>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={onSelectAll}
          disabled={disabled}
          className="rounded-full border border-[var(--border-default)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] transition hover:bg-[var(--surface-subtle)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          Selecionar todos
        </button>
        <button
          type="button"
          onClick={onClear}
          disabled={disabled}
          className="rounded-full border border-[var(--border-default)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] transition hover:bg-[var(--surface-subtle)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          Limpar
        </button>
      </div>

      <div className="mt-4 max-h-72 space-y-2 overflow-y-auto pr-1">{children}</div>
    </details>
  );
}

function ChecklistRow({
  checked,
  label,
  description,
  onChange,
}: {
  checked: boolean;
  label: string;
  description: string;
  onChange: () => void;
}) {
  return (
    <label className="flex items-start gap-3 rounded-[20px] border border-[var(--border-subtle)] bg-[var(--surface-section)] px-4 py-3 text-sm text-[var(--text-primary)] transition hover:bg-[var(--surface-subtle)]">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="mt-0.5 h-4 w-4 rounded border-[var(--border-default)] text-[var(--action-primary)] focus:ring-4 focus:ring-cyan-100"
      />
      <span className="min-w-0">
        <span className="block font-semibold">{label}</span>
        <span className="mt-1 block text-xs text-[var(--text-secondary)]">{description}</span>
      </span>
    </label>
  );
}

function ChecklistEmptyState({
  title,
  href,
  linkLabel,
}: {
  title: string;
  href: string;
  linkLabel: string;
}) {
  return (
    <div className="rounded-[20px] border border-dashed border-[var(--border-default)] bg-[var(--surface-subtle)] px-4 py-5 text-sm text-[var(--text-secondary)]">
      {title}. Cadastre em{" "}
      <Link href={href} className="font-semibold text-[var(--action-primary)] hover:underline">
        {linkLabel}
      </Link>
      .
    </div>
  );
}

function ReportItemCell({ row }: { row: ReportRow }) {
  const content = (
    <>
      <ItemIcon item={{ name: row.itemName, divinePrideId: row.divinePrideId }} size={44} />
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-[var(--text-primary)] sm:text-base">
          {row.itemName}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--text-secondary)]">
          <span>
            {row.divinePrideId
              ? `Divine Pride #${row.divinePrideId}`
              : "Fallback visual ativo"}
          </span>
          {row.isSoldToNpc ? (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-800">
              Venda NPC
            </span>
          ) : null}
        </div>
      </div>
    </>
  );

  if (!row.divinePrideId) {
    return <div className="flex min-w-0 items-center gap-4">{content}</div>;
  }

  return (
    <a
      href={`https://www.divine-pride.net/database/item/${row.divinePrideId}`}
      target="_blank"
      rel="noreferrer"
      className="group flex min-w-0 items-center gap-4 rounded-[20px] p-2 -m-2 transition hover:bg-[var(--surface-subtle)]"
      title={`Abrir ${row.itemName} no Divine Pride`}
    >
      {content}
    </a>
  );
}

function ItemIcon({
  item,
  size,
}: {
  item: {
    name: string;
    divinePrideId: number | null;
  };
  size: number;
}) {
  const [hasError, setHasError] = useState(false);

  if (!item.divinePrideId || hasError) {
    return (
      <div
        className="flex items-center justify-center rounded-2xl border border-dashed border-[var(--border-default)] bg-[var(--surface-subtle)] text-sm font-semibold text-[var(--text-muted)]"
        style={{ width: size, height: size }}
      >
        ?
      </div>
    );
  }

  return (
    <div
      className="overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-white shadow-sm"
      style={{ width: size, height: size }}
    >
      <Image
        src={`https://static.divine-pride.net/images/items/item/${item.divinePrideId}.png`}
        alt={`Ícone do item ${item.name}`}
        width={size}
        height={size}
        className="h-full w-full object-contain p-1"
        onError={() => setHasError(true)}
      />
    </div>
  );
}

function SectionEmptyState({
  title,
  description,
  href,
  linkLabel,
}: {
  title: string;
  description: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--surface-subtle)] text-2xl text-[var(--text-muted)]">
        ?
      </div>
      <div className="space-y-2">
        <h3 className="text-xl font-semibold text-[var(--text-primary)]">{title}</h3>
        <p className="max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
          {description}{" "}
          {href && linkLabel ? (
            <Link href={href} className="font-semibold text-[var(--action-primary)] hover:underline">
              {linkLabel}
            </Link>
          ) : null}
        </p>
      </div>
    </div>
  );
}

function LoadingTable() {
  return (
    <div className="grid gap-4 p-4 sm:p-6">
      {[1, 2, 3, 4].map((row) => (
        <div
          key={row}
          className="h-20 animate-pulse rounded-[24px] bg-[var(--surface-subtle)]"
        />
      ))}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-[24px] border border-white/10 bg-white/10 px-4 py-3 backdrop-blur">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-100">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
    </article>
  );
}

function DateModeButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "inline-flex h-11 items-center justify-center rounded-full border px-4 text-sm font-semibold transition",
        active
          ? "border-cyan-300 bg-cyan-50 text-cyan-800"
          : "border-[var(--border-default)] bg-white text-[var(--text-primary)] hover:bg-[var(--surface-subtle)]",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

function FilterSummaryChip({ label }: { label: string }) {
  return (
    <span className="rounded-full bg-[var(--surface-subtle)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">
      {label}
    </span>
  );
}

function HeaderBadge({ label }: { label: string }) {
  return (
    <span className="rounded-full bg-[var(--surface-subtle)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
      {label}
    </span>
  );
}

function toggleIdInFilter(
  id: number,
  key: "characterIds" | "instanceIds",
  setFilters: Dispatch<SetStateAction<ReportFilterState>>,
) {
  setFilters((current) => ({
    ...current,
    [key]: current[key].includes(id)
      ? current[key].filter((currentId) => currentId !== id)
      : [...current[key], id],
  }));
}

function describeAppliedMode(filters: ReportFilterState) {
  return filters.dateMode === "daily" ? "Modo diário" : "Modo período";
}

function describePeriod(appliedFilters: AppliedFilters | null) {
  if (!appliedFilters) {
    return "Carregando período";
  }

  if (appliedFilters.dateMode === "daily") {
    return `Dia ${formatDateLabel(appliedFilters.day ?? appliedFilters.startDate)}`;
  }

  return `${formatDateLabel(appliedFilters.startDate)} até ${formatDateLabel(
    appliedFilters.endDate,
  )}`;
}

function formatDateLabel(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function resetFilters(
  characters: CharacterOption[],
  instances: InstanceOption[],
  appliedFilters: AppliedFilters | null,
  setFilters: Dispatch<SetStateAction<ReportFilterState>>,
) {
  if (!appliedFilters) {
    return;
  }

  const fallbackDay = appliedFilters.day ?? appliedFilters.startDate;

  setFilters({
    dateMode: "daily",
    day: fallbackDay,
    startDate: fallbackDay,
    endDate: fallbackDay,
    characterIds: characters.map((character) => character.id),
    instanceIds: instances.map((instance) => instance.id),
  });
}

function syncResponseState(
  payload: FarmReportResponse,
  setters: {
    setCharacters: Dispatch<SetStateAction<CharacterOption[]>>;
    setInstances: Dispatch<SetStateAction<InstanceOption[]>>;
    setRows: Dispatch<SetStateAction<ReportRow[]>>;
    setTotals: Dispatch<SetStateAction<ReportTotals>>;
    setAppliedFilters: Dispatch<SetStateAction<AppliedFilters | null>>;
    setFilters: Dispatch<SetStateAction<ReportFilterState>>;
  },
) {
  setters.setCharacters(payload.filters.characters);
  setters.setInstances(payload.filters.instances);
  setters.setRows(payload.rows);
  setters.setTotals(payload.totals);
  setters.setAppliedFilters(payload.appliedFilters);
  setters.setFilters({
    dateMode: payload.appliedFilters.dateMode,
    day: payload.appliedFilters.day ?? payload.appliedFilters.startDate,
    startDate: payload.appliedFilters.startDate,
    endDate: payload.appliedFilters.endDate,
    characterIds: payload.appliedFilters.characterIds,
    instanceIds: payload.appliedFilters.instanceIds,
  });
}

function getApiErrorMessage(payload: ApiErrorPayload | null, fallback: string) {
  if (payload?.message) {
    return payload.message;
  }

  return fallback;
}
