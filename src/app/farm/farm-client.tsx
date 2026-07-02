"use client";

import Image from "next/image";
import Link from "next/link";
import {
  startTransition,
  useDeferredValue,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from "react";

type CharacterRecord = {
  id: number;
  name: string;
  level: number;
  classId: number;
  classLabel: string;
};

type FarmItemRecord = {
  itemId: number;
  itemName: string;
  divinePrideId: number | null;
};

type FarmInstanceStatus = "available" | "blocked-level" | "cooldown";

type FarmInstanceRecord = {
  instanceId: number;
  instanceName: string;
  minimumLevel: number;
  characterLevel: number;
  eligibleByLevel: boolean;
  cooldownDays: number;
  isOnCooldown: boolean;
  nextAvailableAt: string | null;
  status: FarmInstanceStatus;
  items: FarmItemRecord[];
};

type FarmHistoryRecord = {
  id: number;
  instanceId: number;
  instanceName: string;
  executedAt: string;
  operationalDate: string;
  nextAvailableAt: string | null;
  drops: Array<{
    itemId: number;
    itemName: string;
    divinePrideId: number | null;
    quantity: number;
  }>;
  totalDropTypes: number;
  totalQuantity: number;
};

type FarmResponse = {
  characters: CharacterRecord[];
  selectedCharacter: CharacterRecord | null;
  instances: FarmInstanceRecord[];
};

type FarmHistoryResponse = {
  runs: FarmHistoryRecord[];
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

type DropMap = Record<number, number>;
type DropValuesByInstance = Record<number, DropMap>;

async function requestFarmData(characterId: number | null, search: string) {
  const params = new URLSearchParams();

  if (characterId) {
    params.set("characterId", String(characterId));
  }

  if (search.trim()) {
    params.set("search", search.trim());
  }

  const response = await fetch(`/api/farm?${params.toString()}`);
  const payload = (await response.json()) as FarmResponse | ApiErrorPayload;

  if (!response.ok) {
    throw new Error(
      getApiErrorMessage(payload as ApiErrorPayload, "Não foi possível carregar a operação."),
    );
  }

  return payload as FarmResponse;
}

async function requestFarmHistory(characterId: number) {
  const response = await fetch(`/api/farm/runs?characterId=${characterId}`);
  const payload = (await response.json()) as FarmHistoryResponse | ApiErrorPayload;

  if (!response.ok) {
    throw new Error(
      getApiErrorMessage(payload as ApiErrorPayload, "Não foi possível carregar o histórico."),
    );
  }

  return (payload as FarmHistoryResponse).runs;
}

export function FarmClient() {
  const [characters, setCharacters] = useState<CharacterRecord[]>([]);
  const [selectedCharacterId, setSelectedCharacterId] = useState<number | null>(null);
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterRecord | null>(null);
  const [instances, setInstances] = useState<FarmInstanceRecord[]>([]);
  const [history, setHistory] = useState<FarmHistoryRecord[]>([]);
  const [dropValues, setDropValues] = useState<DropValuesByInstance>({});
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [savingInstanceId, setSavingInstanceId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const firstLoadRef = useRef(true);

  async function refreshFarmData(isInitialLoad: boolean) {
    if (isInitialLoad) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }

    try {
      const payload = await requestFarmData(selectedCharacterId, deferredSearch);

      startTransition(() => {
        setCharacters(payload.characters);
        setSelectedCharacter(payload.selectedCharacter);
        setInstances(payload.instances);
        setDropValues((current) => syncDropValues(current, payload.instances));
      });
    } catch (error) {
      setFeedback({
        tone: "error",
        text:
          error instanceof Error ? error.message : "Não foi possível carregar a operação.",
      });
    } finally {
      if (isInitialLoad) {
        setIsLoading(false);
      } else {
        setIsRefreshing(false);
      }
    }
  }

  async function refreshHistory(characterId: number | null) {
    if (!characterId) {
      setHistory([]);
      return;
    }

    setIsHistoryLoading(true);

    try {
      const runs = await requestFarmHistory(characterId);
      startTransition(() => {
        setHistory(runs);
      });
    } catch (error) {
      setFeedback({
        tone: "error",
        text:
          error instanceof Error ? error.message : "Não foi possível carregar o histórico.",
      });
    } finally {
      setIsHistoryLoading(false);
    }
  }

  const loadDataEffect = useEffectEvent(async (isInitialLoad: boolean) => {
    await refreshFarmData(isInitialLoad);
    await refreshHistory(selectedCharacterId);
  });

  useEffect(() => {
    const isInitialLoad = firstLoadRef.current;
    firstLoadRef.current = false;
    void loadDataEffect(isInitialLoad);
  }, [deferredSearch, selectedCharacterId]);

  const selectedCharacterOption =
    selectedCharacter ??
    characters.find((character) => character.id === selectedCharacterId) ??
    null;

  async function handleRegister(instance: FarmInstanceRecord) {
    if (!selectedCharacterId) {
      setFeedback({
        tone: "error",
        text: "Selecione um personagem antes de registrar uma execução.",
      });
      return;
    }

    setSavingInstanceId(instance.instanceId);
    setFeedback(null);

    try {
      const drops = instance.items.map((item) => ({
        itemId: item.itemId,
        quantity: dropValues[instance.instanceId]?.[item.itemId] ?? 0,
      }));

      const response = await fetch("/api/farm/runs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          characterId: selectedCharacterId,
          instanceId: instance.instanceId,
          drops,
        }),
      });

      const payload = (await response.json().catch(() => null)) as ApiErrorPayload | null;

      if (!response.ok) {
        throw new Error(
          getApiErrorMessage(payload, "Não foi possível registrar a execução da instância."),
        );
      }

      setDropValues((current) => ({
        ...current,
        [instance.instanceId]: {},
      }));
      setFeedback({
        tone: "success",
        text: `Execução registrada para ${instance.instanceName}.`,
      });

      await Promise.all([refreshFarmData(false), refreshHistory(selectedCharacterId)]);
    } catch (error) {
      setFeedback({
        tone: "error",
        text:
          error instanceof Error
            ? error.message
            : "Não foi possível registrar a execução da instância.",
      });
    } finally {
      setSavingInstanceId(null);
    }
  }

  function updateQuantity(instanceId: number, itemId: number, nextValue: number) {
    setDropValues((current) => ({
      ...current,
      [instanceId]: {
        ...(current[instanceId] ?? {}),
        [itemId]: Math.max(0, nextValue),
      },
    }));
  }

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-6">
        <section className="overflow-hidden rounded-[32px] border border-[var(--border-subtle)] bg-[var(--surface-elevated)] shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
          <div className="border-b border-[var(--border-subtle)] bg-gradient-to-r from-slate-950 via-blue-950 to-cyan-900 px-6 py-8 text-white sm:px-8">
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
                    Operação de farm
                  </h1>
                  <p className="max-w-2xl text-sm leading-6 text-slate-200 sm:text-base">
                    Selecione um personagem, acompanhe elegibilidade por nível e
                    cooldown e registre cada execução individual das instâncias.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <MetricCard label="Personagens" value={String(characters.length)} />
                <MetricCard label="Instâncias" value={String(instances.length)} />
                <MetricCard
                  label="Histórico"
                  value={selectedCharacterId ? String(history.length) : "-"}
                />
              </div>
            </div>
          </div>

          <div className="bg-white px-6 py-6 sm:px-8">
            <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
              <section className="rounded-[28px] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-5 shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700">
                    Seletor operacional de personagem
                  </p>
                  <div>
                    <h2 className="text-2xl font-semibold text-[var(--text-primary)]">
                      Personagem ativo
                    </h2>
                    <p className="text-sm text-[var(--text-secondary)]">
                      O personagem selecionado define nível mínimo e cooldown da operação.
                    </p>
                  </div>
                </div>

                <label className="flex w-full flex-col gap-2 text-sm font-medium text-[var(--text-primary)] lg:max-w-sm">
                  Selecionar personagem
                  <select
                    value={selectedCharacterId ?? ""}
                    onChange={(event) =>
                      setSelectedCharacterId(
                        event.target.value ? Number(event.target.value) : null,
                      )
                    }
                    className="h-12 rounded-2xl border border-[var(--border-default)] bg-white px-4 text-[var(--text-primary)] outline-none transition focus:border-[var(--border-focus)] focus:ring-4 focus:ring-cyan-100"
                  >
                    <option value="">Selecione um personagem</option>
                    {characters.map((character) => (
                      <option key={character.id} value={character.id}>
                        {character.name} - Nv. {character.level} - {character.classLabel}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="mt-5 rounded-[24px] border border-[var(--border-subtle)] bg-[var(--surface-section)] p-5">
                {selectedCharacterOption ? (
                  <div className="grid gap-4 sm:grid-cols-[1fr_1fr_1.15fr]">
                    <CharacterMeta label="Nome" value={selectedCharacterOption.name} />
                    <CharacterMeta
                      label="Nivel"
                      value={`Nv. ${selectedCharacterOption.level}`}
                    />
                    <CharacterClassMeta
                      label="Classe"
                      classId={selectedCharacterOption.classId}
                      classLabel={selectedCharacterOption.classLabel}
                    />
                  </div>
                ) : characters.length === 0 ? (
                  <EmptyInlineState
                    title="Nenhum personagem cadastrado"
                    description="Crie personagens em"
                    href="/admin/characters"
                    linkLabel="/admin/characters"
                    suffix="para iniciar a operação de farm."
                  />
                ) : (
                  <EmptyInlineState
                    title="Selecione um personagem"
                    description="Escolha um personagem acima para liberar a lista operacional de instâncias e o histórico recente."
                  />
                )}
              </div>
              </section>

              <section className="rounded-[28px] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-5 shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700">
                  Painel de filtro de instância
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
                  Buscar instância
                </h2>
                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                  Filtre pelo nome e acompanhe o estado operacional de cada card.
                </p>

                <label className="mt-5 flex flex-col gap-2 text-sm font-medium text-[var(--text-primary)]">
                  Instância
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Ex.: Palácio das Mágoas"
                    disabled={!selectedCharacterId}
                    className="h-12 rounded-2xl border border-[var(--border-default)] bg-white px-4 text-[var(--text-primary)] outline-none transition focus:border-[var(--border-focus)] focus:ring-4 focus:ring-cyan-100 disabled:cursor-not-allowed disabled:bg-[var(--surface-subtle)] disabled:text-[var(--text-muted)]"
                  />
                </label>

                <div className="mt-4 flex flex-wrap gap-3">
                  <FilterChip label="Disponível" tone="success" />
                  <FilterChip label="Bloqueada por nível" tone="warning" />
                  <FilterChip label="Em cooldown" tone="cooldown" />
                </div>
              </section>
            </div>
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

        <div className="grid gap-6 xl:grid-cols-[1.45fr_0.9fr]">
          <section className="rounded-[32px] border border-[var(--border-subtle)] bg-[var(--surface-card)] shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
            <header className="flex items-center justify-between border-b border-[var(--border-subtle)] px-6 py-4 sm:px-8">
              <div>
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                  Instâncias operacionais
                </h2>
                <p className="text-sm text-[var(--text-secondary)]">
                  Cards com drops, cooldown e ação individual por execução.
                </p>
              </div>

              <span className="rounded-full bg-[var(--surface-subtle)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                {isRefreshing ? "Atualizando" : `${instances.length} cards`}
              </span>
            </header>

            {isLoading ? (
              <LoadingCards />
            ) : !selectedCharacterId ? (
              <SectionEmptyState
                title="Selecione um personagem"
                description="A operação mostra todas as instâncias somente depois da seleção do personagem ativo."
              />
            ) : instances.length === 0 ? (
              <SectionEmptyState
                title="Nenhuma instância encontrada"
                description={
                  search.trim()
                    ? "Ajuste a busca para encontrar outra instância."
                    : "Cadastre instâncias em /admin/instances para começar a operar o farm."
                }
              />
            ) : (
              <div className="grid gap-4 p-4 sm:p-6">
                {instances.map((instance) => (
                  <FarmInstanceCard
                    key={instance.instanceId}
                    instance={instance}
                    quantities={dropValues[instance.instanceId] ?? {}}
                    disabled={savingInstanceId === instance.instanceId}
                    onChangeQuantity={updateQuantity}
                    onRegister={handleRegister}
                  />
                ))}
              </div>
            )}
          </section>

          <section className="rounded-[32px] border border-[var(--border-subtle)] bg-[var(--surface-card)] shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
            <header className="flex items-center justify-between border-b border-[var(--border-subtle)] px-6 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">
                  Histórico operacional
                </p>
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                  Histórico recente
                </h2>
              </div>

              <span className="rounded-full bg-[var(--surface-subtle)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                {selectedCharacterId ? `${history.length} registros` : "Aguardando"}
              </span>
            </header>

            {!selectedCharacterId ? (
              <SectionEmptyState
                title="Sem personagem ativo"
                description="Selecione um personagem para consultar o histórico de execuções."
              />
            ) : isHistoryLoading ? (
              <LoadingHistory />
            ) : history.length === 0 ? (
              <SectionEmptyState
                title="Nenhuma execução registrada"
                description="Os registros individuais de farm aparecerão aqui assim que a primeira instância for salva."
              />
            ) : (
              <div className="flex flex-col divide-y divide-[var(--border-subtle)]">
                {history.map((run) => (
                  <article key={run.id} className="px-6 py-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                          {run.instanceName}
                        </h3>
                        <p className="mt-1 text-xs text-[var(--text-secondary)]">
                          {formatDateTime(run.executedAt)}
                        </p>
                      </div>
                      <span className="rounded-full bg-[var(--surface-subtle)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                        {run.totalQuantity} drop{run.totalQuantity === 1 ? "" : "s"}
                      </span>
                    </div>

                    <div className="mt-4 space-y-2">
                      {run.drops.length > 0 ? (
                        run.drops.map((drop) => (
                          <div key={`${run.id}-${drop.itemId}`} className="flex items-center gap-3">
                            <ItemIcon
                              item={{ name: drop.itemName, divinePrideId: drop.divinePrideId }}
                              size={32}
                            />
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-[var(--text-primary)]">
                                {drop.itemName}
                              </p>
                              <p className="text-xs text-[var(--text-secondary)]">
                                Quantidade: {drop.quantity}
                              </p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-[var(--text-secondary)]">
                          Sem drops registrados nesta execução.
                        </p>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

function FarmInstanceCard({
  instance,
  quantities,
  disabled,
  onChangeQuantity,
  onRegister,
}: {
  instance: FarmInstanceRecord;
  quantities: DropMap;
  disabled: boolean;
  onChangeQuantity: (instanceId: number, itemId: number, nextValue: number) => void;
  onRegister: (instance: FarmInstanceRecord) => void;
}) {
  const isBlocked = instance.status !== "available";
  const isBusy = disabled || isBlocked;

  return (
    <article
      className={`overflow-hidden rounded-[28px] border ${
        instance.status === "available"
          ? "border-emerald-200 bg-white"
          : instance.status === "blocked-level"
            ? "border-amber-200 bg-amber-50/60"
            : "border-sky-200 bg-sky-50/65"
      } shadow-[0_12px_30px_rgba(15,23,42,0.05)]`}
    >
      <div className="flex flex-col gap-4 border-b border-[var(--border-subtle)] px-5 py-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-xl font-semibold text-[var(--text-primary)]">
              {instance.instanceName}
            </h3>
            <StatusBadge status={instance.status} />
          </div>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Nível mínimo {instance.minimumLevel} • Cooldown {instance.cooldownDays} dia
            {instance.cooldownDays === 1 ? "" : "s"}
          </p>
        </div>

        <div className="max-w-full rounded-[18px] bg-white/70 px-4 py-3 text-sm leading-6 text-[var(--text-secondary)] xl:max-w-[320px] xl:text-right">
          <p>{formatStatusMessage(instance)}</p>
          {instance.nextAvailableAt ? (
            <p className="mt-1 font-medium text-[var(--text-primary)]">
              Libera em {formatDateTime(instance.nextAvailableAt)}
            </p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-5 px-5 py-5 lg:grid-cols-[minmax(0,1fr)_280px]">
        <section className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
            Card da instância
          </p>
          <div className="mt-4 space-y-3">
            {instance.items.length > 0 ? (
              instance.items.map((item) => {
                const quantity = quantities[item.itemId] ?? 0;

                return (
                  <div
                    key={item.itemId}
                    className="flex items-center justify-between gap-3 rounded-[20px] border border-[var(--border-subtle)] bg-white/80 px-4 py-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <ItemIcon
                        item={{ name: item.itemName, divinePrideId: item.divinePrideId }}
                        size={40}
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                          {item.itemName}
                        </p>
                        <p className="text-xs text-[var(--text-secondary)]">
                          {item.divinePrideId
                            ? `Divine Pride #${item.divinePrideId}`
                            : "Fallback visual ativo"}
                        </p>
                      </div>
                    </div>

                    <Stepper
                      value={quantity}
                      disabled={isBusy}
                      onDecrease={() =>
                        onChangeQuantity(instance.instanceId, item.itemId, quantity - 1)
                      }
                      onIncrease={() =>
                        onChangeQuantity(instance.instanceId, item.itemId, quantity + 1)
                      }
                    />
                  </div>
                );
              })
            ) : (
              <div className="rounded-[20px] border border-dashed border-[var(--border-default)] bg-[var(--surface-subtle)] px-4 py-6 text-sm text-[var(--text-secondary)]">
                Esta instância não possui itens vinculados. Ainda assim, você pode registrar
                a execução individual do farm.
              </div>
            )}
          </div>
        </section>

        <section className="flex w-full min-w-0 flex-col justify-between rounded-[24px] border border-[var(--border-subtle)] bg-white/75 p-4 lg:w-[280px] lg:justify-self-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
              Resumo operacional
            </p>
            <div className="mt-4 grid gap-3">
              <SummaryRow
                label="Estado"
                value={
                  instance.status === "available"
                    ? "Disponível"
                    : instance.status === "blocked-level"
                      ? "Bloqueada por nível"
                      : "Em cooldown"
                }
              />
              <SummaryRow label="Itens no card" value={String(instance.items.length)} />
              <SummaryRow
                label="Drops preenchidos"
                value={String(
                  Object.values(quantities).reduce((sum, quantity) => sum + quantity, 0),
                )}
              />
            </div>
          </div>

          <button
            type="button"
            disabled={isBusy}
            onClick={() => onRegister(instance)}
            className="mt-5 inline-flex h-12 w-full items-center justify-center rounded-full bg-[var(--action-primary)] px-5 text-sm font-semibold text-[var(--text-on-brand)] transition hover:bg-[var(--action-primary-hover)] whitespace-nowrap disabled:cursor-not-allowed disabled:bg-[var(--surface-subtle)] disabled:text-[var(--text-muted)]"
          >
            {disabled ? "Salvando..." : "Registrar execução"}
          </button>
        </section>
      </div>
    </article>
  );
}

function Stepper({
  value,
  disabled,
  onDecrease,
  onIncrease,
}: {
  value: number;
  disabled: boolean;
  onDecrease: () => void;
  onIncrease: () => void;
}) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-section)] px-2 py-2">
      <button
        type="button"
        onClick={onDecrease}
        disabled={disabled || value === 0}
        className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border-default)] bg-white text-lg font-semibold text-[var(--text-primary)] transition hover:bg-[var(--surface-subtle)] disabled:cursor-not-allowed disabled:border-[var(--border-subtle)] disabled:bg-[var(--surface-subtle)] disabled:text-[var(--text-muted)]"
      >
        -
      </button>
      <div className="min-w-11 rounded-2xl border border-[var(--border-default)] bg-white px-3 py-1 text-center text-sm font-semibold text-[var(--text-primary)]">
        {value}
      </div>
      <button
        type="button"
        onClick={onIncrease}
        disabled={disabled}
        className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border-default)] bg-white text-lg font-semibold text-[var(--text-primary)] transition hover:bg-[var(--surface-subtle)] disabled:cursor-not-allowed disabled:border-[var(--border-subtle)] disabled:bg-[var(--surface-subtle)] disabled:text-[var(--text-muted)]"
      >
        +
      </button>
    </div>
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

function CharacterMeta({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-[20px] border border-white/70 bg-white px-4 py-3 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
        {label}
      </p>
      <p className="mt-2 text-base font-semibold text-[var(--text-primary)]">{value}</p>
    </article>
  );
}

function CharacterClassMeta({
  label,
  classId,
  classLabel,
}: {
  label: string;
  classId: number;
  classLabel: string;
}) {
  const [hasError, setHasError] = useState(false);

  return (
    <article className="rounded-[20px] border border-white/70 bg-white px-4 py-3 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
        {label}
      </p>
      <div className="mt-3 flex items-center gap-3">
        {!hasError ? (
          <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-section)] shadow-sm">
            <Image
              src={`https://static.divine-pride.net/images/skilltree/jobs/${classId}.png`}
        alt={`Ícone da classe ${classLabel}`}
              width={56}
              height={56}
              className="h-full w-full object-contain p-1"
              onError={() => setHasError(true)}
            />
          </div>
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-dashed border-[var(--border-default)] bg-[var(--surface-subtle)] text-sm font-semibold text-[var(--text-muted)]">
            ?
          </div>
        )}
        <div className="min-w-0">
          <p className="text-base font-semibold text-[var(--text-primary)]">{classLabel}</p>
          <p className="text-xs text-[var(--text-secondary)]">
            {hasError ? "Imagem da classe indisponível" : `Classe #${classId}`}
          </p>
        </div>
      </div>
    </article>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-[18px] bg-[var(--surface-section)] px-3 py-2">
      <span className="min-w-0 text-sm text-[var(--text-secondary)]">{label}</span>
      <span className="whitespace-nowrap text-right text-sm font-semibold text-[var(--text-primary)]">
        {value}
      </span>
    </div>
  );
}

function StatusBadge({ status }: { status: FarmInstanceStatus }) {
  const badgeClassName =
    status === "available"
      ? "bg-emerald-100 text-emerald-800"
      : status === "blocked-level"
        ? "bg-amber-100 text-amber-800"
        : "bg-sky-100 text-sky-800";

  const label =
    status === "available"
      ? "Disponível"
      : status === "blocked-level"
        ? "Bloqueada por nível"
        : "Em cooldown";

  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${badgeClassName}`}
    >
      {label}
    </span>
  );
}

function FilterChip({
  label,
  tone,
}: {
  label: string;
  tone: "success" | "warning" | "cooldown";
}) {
  const className =
    tone === "success"
      ? "bg-emerald-50 text-emerald-700"
      : tone === "warning"
        ? "bg-amber-50 text-amber-700"
        : "bg-sky-50 text-sky-700";

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${className}`}
    >
      {label}
    </span>
  );
}

function EmptyInlineState({
  title,
  description,
  href,
  linkLabel,
  suffix,
}: {
  title: string;
  description: string;
  href?: string;
  linkLabel?: string;
  suffix?: string;
}) {
  return (
    <div className="flex flex-col gap-2 text-sm text-[var(--text-secondary)]">
      <h3 className="text-lg font-semibold text-[var(--text-primary)]">{title}</h3>
      <p className="max-w-2xl leading-6">
        {description}{" "}
        {href && linkLabel ? (
          <Link
            href={href}
            className="font-semibold text-[var(--action-primary)] underline underline-offset-4"
          >
            {linkLabel}
          </Link>
        ) : null}{" "}
        {suffix ?? ""}
      </p>
    </div>
  );
}

function SectionEmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center gap-3 px-6 py-12 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--surface-subtle)] text-2xl text-[var(--text-muted)]">
        +
      </div>
      <h3 className="text-xl font-semibold text-[var(--text-primary)]">{title}</h3>
      <p className="max-w-md text-sm leading-6 text-[var(--text-secondary)]">
        {description}
      </p>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-[24px] border border-white/10 bg-white/10 px-4 py-3 backdrop-blur">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-100">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
    </article>
  );
}

function LoadingCards() {
  return (
    <div className="grid gap-4 p-4 sm:p-6">
      {[1, 2, 3].map((item) => (
        <div
          key={item}
          className="h-64 animate-pulse rounded-[28px] bg-[var(--surface-subtle)]"
        />
      ))}
    </div>
  );
}

function LoadingHistory() {
  return (
    <div className="grid gap-4 px-6 py-6">
      {[1, 2, 3].map((item) => (
        <div
          key={item}
          className="h-28 animate-pulse rounded-[24px] bg-[var(--surface-subtle)]"
        />
      ))}
    </div>
  );
}

function syncDropValues(current: DropValuesByInstance, instances: FarmInstanceRecord[]) {
  const nextValues: DropValuesByInstance = {};

  for (const instance of instances) {
    const currentInstanceValues = current[instance.instanceId] ?? {};
    const validItemIds = new Set(instance.items.map((item) => item.itemId));
    const syncedValues: DropMap = {};

    for (const [itemId, quantity] of Object.entries(currentInstanceValues)) {
      const numericItemId = Number(itemId);

      if (validItemIds.has(numericItemId) && quantity > 0) {
        syncedValues[numericItemId] = quantity;
      }
    }

    nextValues[instance.instanceId] = syncedValues;
  }

  return nextValues;
}

function formatStatusMessage(instance: FarmInstanceRecord) {
  if (instance.status === "cooldown" && instance.nextAvailableAt) {
    return "Instância indisponível até o próximo reset válido.";
  }

  if (instance.status === "blocked-level") {
    return `Personagem com nível ${instance.characterLevel}.`;
  }

  return instance.cooldownDays === 0
    ? "Execução liberada sem bloqueio de cooldown."
    : "Execução disponível para o personagem ativo.";
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

function getApiErrorMessage(payload: ApiErrorPayload | null, fallback: string) {
  if (payload?.message) {
    return payload.message;
  }

  return fallback;
}
