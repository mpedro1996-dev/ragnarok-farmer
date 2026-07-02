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
import type { FormEvent, ReactNode } from "react";

import {
  formatZenny,
  itemInputSchema,
  type ItemSortBy,
  type ItemSortOrder,
} from "@/features/items/item-schema";

type ItemRecord = {
  id: number;
  name: string;
  averageZenny: number;
  divinePrideId: number | null;
  isSoldToNpc: boolean;
  createdAt: string;
  updatedAt: string;
};

type ItemPriceHistoryRecord = {
  id: number;
  itemId: number;
  previousAverageZenny: number;
  nextAverageZenny: number;
  createdAt: string;
};

type ItemsResponse = {
  items: ItemRecord[];
};

type ItemDetailResponse = {
  item: ItemRecord;
  priceHistory: ItemPriceHistoryRecord[];
};

type FeedbackState =
  | {
      tone: "success" | "error";
      text: string;
    }
  | null;

type FormValues = {
  name: string;
  averageZenny: string;
  divinePrideId: string;
  isSoldToNpc: boolean;
};

type FormErrors = Partial<Record<keyof FormValues, string>>;

const emptyForm: FormValues = {
  name: "",
  averageZenny: "",
  divinePrideId: "",
  isSoldToNpc: false,
};

async function requestItems(
  search: string,
  sortBy: ItemSortBy,
  sortOrder: ItemSortOrder,
) {
  const params = new URLSearchParams();

  if (search.trim()) {
    params.set("search", search.trim());
  }

  params.set("sortBy", sortBy);
  params.set("sortOrder", sortOrder);

  const response = await fetch(`/api/items?${params.toString()}`);
  const payload = (await response.json()) as ItemsResponse | ApiErrorPayload;

  if (!response.ok) {
    throw new Error(
      getApiErrorMessage(
        payload as ApiErrorPayload,
        "Não foi possível carregar os itens.",
      ),
    );
  }

  return {
    items: (payload as ItemsResponse).items.map(normalizeItemRecord),
  };
}

async function requestItemDetail(itemId: number) {
  const response = await fetch(`/api/items/${itemId}`);
  const payload = (await response.json()) as ItemDetailResponse | ApiErrorPayload;

  if (!response.ok) {
    throw new Error(
      getApiErrorMessage(
        payload as ApiErrorPayload,
        "Não foi possível carregar o histórico do item.",
      ),
    );
  }

  return {
    item: normalizeItemRecord((payload as ItemDetailResponse).item),
    priceHistory: (payload as ItemDetailResponse).priceHistory,
  };
}

export function ItemsAdminClient() {
  const [items, setItems] = useState<ItemRecord[]>([]);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [sortBy, setSortBy] = useState<ItemSortBy>("name");
  const [sortOrder, setSortOrder] = useState<ItemSortOrder>("asc");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingItem, setEditingItem] = useState<ItemRecord | null>(null);
  const [priceHistory, setPriceHistory] = useState<ItemPriceHistoryRecord[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [formValues, setFormValues] = useState<FormValues>(emptyForm);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [itemPendingDelete, setItemPendingDelete] = useState<ItemRecord | null>(
    null,
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const firstLoadRef = useRef(true);
  const itemDetailRequestRef = useRef(0);

  async function refreshItems(isInitialLoad: boolean) {
    if (isInitialLoad) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }

    try {
      const payload = await requestItems(deferredSearch, sortBy, sortOrder);

      startTransition(() => {
        setItems(payload.items);
      });
    } catch (error) {
      setFeedback({
        tone: "error",
        text:
          error instanceof Error
            ? error.message
            : "Não foi possível carregar os itens.",
      });
    } finally {
      if (isInitialLoad) {
        setIsLoading(false);
      } else {
        setIsRefreshing(false);
      }
    }
  }

  const loadItemsEffect = useEffectEvent(async (isInitialLoad: boolean) => {
    await refreshItems(isInitialLoad);
  });

  useEffect(() => {
    const isInitialLoad = firstLoadRef.current;
    firstLoadRef.current = false;

    void loadItemsEffect(isInitialLoad);
  }, [deferredSearch, sortBy, sortOrder]);

  function openCreateModal() {
    itemDetailRequestRef.current += 1;
    setEditingItem(null);
    setPriceHistory([]);
    setIsHistoryLoading(false);
    setFormValues(emptyForm);
    setFormErrors({});
    setIsFormOpen(true);
  }

  async function openEditModal(item: ItemRecord) {
    const requestId = itemDetailRequestRef.current + 1;
    itemDetailRequestRef.current = requestId;

    setEditingItem(item);
    setPriceHistory([]);
    setIsHistoryLoading(true);
    setFormValues({
      name: item.name,
      averageZenny: String(item.averageZenny),
      divinePrideId: item.divinePrideId ? String(item.divinePrideId) : "",
      isSoldToNpc: Boolean(item.isSoldToNpc),
    });
    setFormErrors({});
    setIsFormOpen(true);

    try {
      const detail = await requestItemDetail(item.id);

      if (itemDetailRequestRef.current !== requestId) {
        return;
      }

      setEditingItem(detail.item);
      setPriceHistory(detail.priceHistory);
      setFormValues({
        name: detail.item.name,
        averageZenny: String(detail.item.averageZenny),
        divinePrideId: detail.item.divinePrideId
          ? String(detail.item.divinePrideId)
          : "",
        isSoldToNpc: Boolean(detail.item.isSoldToNpc),
      });
    } catch (error) {
      if (itemDetailRequestRef.current !== requestId) {
        return;
      }

      setFeedback({
        tone: "error",
        text:
          error instanceof Error
            ? error.message
            : "Não foi possível carregar o histórico do item.",
      });
    } finally {
      if (itemDetailRequestRef.current === requestId) {
        setIsHistoryLoading(false);
      }
    }
  }

  function closeFormModal() {
    if (isSaving) {
      return;
    }

    itemDetailRequestRef.current += 1;
    setIsFormOpen(false);
    setEditingItem(null);
    setPriceHistory([]);
    setIsHistoryLoading(false);
    setFormErrors({});
  }

  function updateFormValue<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setFormValues((current) => ({
      ...current,
      [key]: value,
    }));

    if (formErrors[key]) {
      setFormErrors((current) => ({
        ...current,
        [key]: undefined,
      }));
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);

    const parsed = itemInputSchema.safeParse(formValues);

    if (!parsed.success) {
      setFormErrors(flattenFieldErrors(parsed.error.flatten().fieldErrors));
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch(
        editingItem ? `/api/items/${editingItem.id}` : "/api/items",
        {
          method: editingItem ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(parsed.data),
        },
      );

      const payload = (await response.json().catch(() => null)) as
        | ApiErrorPayload
        | { item: ItemRecord }
        | null;

      if (!response.ok) {
        const message = getApiErrorMessage(
          payload as ApiErrorPayload | null,
          "Não foi possível salvar o item.",
        );

        if (response.status === 409) {
          setFormErrors((current) => ({
            ...current,
            name: message,
          }));
          return;
        }

        if ((payload as ApiErrorPayload | null)?.issues?.fieldErrors) {
          setFormErrors(
            flattenFieldErrors(
              (payload as ApiErrorPayload).issues?.fieldErrors ?? {},
            ),
          );
          return;
        }

        throw new Error(message);
      }

      setIsFormOpen(false);
      setEditingItem(null);
      setPriceHistory([]);
      setIsHistoryLoading(false);
      setFormValues(emptyForm);
      setFormErrors({});
      setFeedback({
        tone: "success",
        text: editingItem
          ? "Item atualizado com sucesso."
          : "Item criado com sucesso.",
      });

      await refreshItems(false);
    } catch (error) {
      setFeedback({
        tone: "error",
        text:
          error instanceof Error
            ? error.message
            : "Não foi possível salvar o item.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!itemPendingDelete) {
      return;
    }

    setIsDeleting(true);
    setFeedback(null);

    try {
      const response = await fetch(`/api/items/${itemPendingDelete.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as ApiErrorPayload | null;
        throw new Error(
          getApiErrorMessage(payload, "Não foi possível excluir o item."),
        );
      }

      setItemPendingDelete(null);
      setFeedback({
        tone: "success",
        text: "Item excluído com sucesso.",
      });

      await refreshItems(false);
    } catch (error) {
      setFeedback({
        tone: "error",
        text:
          error instanceof Error
            ? error.message
            : "Não foi possível excluir o item.",
      });
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-6">
        <section className="overflow-hidden rounded-[32px] border border-[var(--border-subtle)] bg-[var(--surface-elevated)] shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
          <div className="border-b border-[var(--border-subtle)] bg-gradient-to-r from-slate-950 via-slate-900 to-blue-900 px-6 py-8 text-white sm:px-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl space-y-3">
                <Link
                  href="/"
                  className="inline-flex w-fit rounded-full border border-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-blue-100 transition hover:bg-white/10"
                >
                  Ragnarok Farmer
                </Link>
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                    Admin de itens
                  </h1>
                  <p className="max-w-xl text-sm leading-6 text-slate-200 sm:text-base">
                    Gerencie o catálogo interno com nome, valor médio em zenny,
                    venda para NPC e vinculação opcional ao Divine Pride.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <MetricCard label="Itens" value={String(items.length)} />
                <MetricCard
                  label="Busca ativa"
                  value={deferredSearch.trim() ? "Sim" : "Não"}
                />
                <MetricCard
                  label="Atualização"
                  value={isRefreshing ? "Em curso" : "Estável"}
                />
              </div>
            </div>
          </div>

          <div className="bg-white px-6 py-6 sm:px-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="grid flex-1 gap-4 sm:grid-cols-3">
                <label className="flex flex-col gap-2 text-sm font-medium text-[var(--text-primary)] sm:col-span-2">
                  Buscar por nome
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Ex.: Jellopy"
                    className="h-12 rounded-2xl border border-[var(--border-default)] bg-white px-4 text-[var(--text-primary)] outline-none transition focus:border-[var(--border-focus)] focus:ring-4 focus:ring-blue-100"
                  />
                </label>

                <div className="grid grid-cols-2 gap-4">
                  <label className="flex flex-col gap-2 text-sm font-medium text-[var(--text-primary)]">
                    Ordenar por
                    <select
                      value={sortBy}
                      onChange={(event) =>
                        setSortBy(event.target.value as ItemSortBy)
                      }
                      className="h-12 rounded-2xl border border-[var(--border-default)] bg-white px-4 text-[var(--text-primary)] outline-none transition focus:border-[var(--border-focus)] focus:ring-4 focus:ring-blue-100"
                    >
                      <option value="name">Nome</option>
                      <option value="averageZenny">Valor</option>
                    </select>
                  </label>

                  <label className="flex flex-col gap-2 text-sm font-medium text-[var(--text-primary)]">
                    Ordem
                    <select
                      value={sortOrder}
                      onChange={(event) =>
                        setSortOrder(event.target.value as ItemSortOrder)
                      }
                      className="h-12 rounded-2xl border border-[var(--border-default)] bg-white px-4 text-[var(--text-primary)] outline-none transition focus:border-[var(--border-focus)] focus:ring-4 focus:ring-blue-100"
                    >
                      <option value="asc">Crescente</option>
                      <option value="desc">Decrescente</option>
                    </select>
                  </label>
                </div>
              </div>

              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex h-12 items-center justify-center rounded-full bg-[var(--action-primary)] px-5 text-sm font-semibold text-[var(--text-on-brand)] transition hover:bg-[var(--action-primary-hover)]"
              >
                Novo item
              </button>
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

        <section className="rounded-[32px] border border-[var(--border-subtle)] bg-[var(--surface-card)] shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
          <header className="flex items-center justify-between border-b border-[var(--border-subtle)] px-6 py-4 sm:px-8">
            <div>
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                Catálogo de itens
              </h2>
              <p className="text-sm text-[var(--text-secondary)]">
                Lista administrativa com integração visual ao Divine Pride.
              </p>
            </div>

            <span className="rounded-full bg-[var(--surface-subtle)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
              {isRefreshing ? "Atualizando" : `${items.length} registros`}
            </span>
          </header>

          {isLoading ? (
            <LoadingState />
          ) : items.length === 0 ? (
            <EmptyState onCreate={openCreateModal} />
          ) : (
            <>
              <div className="grid gap-4 p-4 sm:p-6 md:hidden">
                {items.map((item) => (
                  <article
                    key={item.id}
                    className="rounded-[24px] border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-4 shadow-[0_12px_30px_rgba(15,23,42,0.05)]"
                  >
                    <div className="flex items-start gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <ItemIdentityCell item={item} />
                            <p className="mt-3 text-sm text-[var(--text-secondary)]">
                              Zenny médio: {formatZenny(item.averageZenny)}
                            </p>
                          </div>
                          <span className="rounded-full bg-[var(--surface-subtle)] px-2.5 py-1 text-xs font-semibold text-[var(--text-secondary)]">
                            #{item.id}
                          </span>
                        </div>

                        <div className="mt-4 flex items-center justify-between gap-3">
                          <div className="space-y-1">
                            <p className="text-sm text-[var(--text-secondary)]">
                              Divine Pride:{" "}
                              <span className="font-semibold text-[var(--text-primary)]">
                                {item.divinePrideId ?? "Não informado"}
                              </span>
                            </p>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-[var(--text-secondary)]">
                                Venda NPC:
                              </span>
                              <NpcSaleBadge isSoldToNpc={item.isSoldToNpc} />
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                void openEditModal(item);
                              }}
                              className="rounded-full border border-[var(--border-default)] px-3 py-1.5 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[var(--surface-subtle)]"
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => setItemPendingDelete(item)}
                              className="rounded-full border border-rose-200 px-3 py-1.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
                            >
                              Excluir
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="min-w-full border-collapse">
                  <thead className="bg-[var(--surface-section)]">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--text-primary)]">
                        Item
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--text-primary)]">
                        Zenny médio
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--text-primary)]">
                        Divine Pride ID
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--text-primary)]">
                        Venda NPC
                      </th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-[var(--text-primary)]">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => (
                      <tr
                        key={item.id}
                        className={
                          index % 2 === 0
                            ? "bg-white"
                            : "bg-[var(--surface-subtle)]/65"
                        }
                      >
                        <td className="px-6 py-4">
                          <ItemIdentityCell item={item} />
                        </td>
                        <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">
                          {formatZenny(item.averageZenny)}
                        </td>
                        <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">
                          {item.divinePrideId ?? "Não informado"}
                        </td>
                        <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">
                          <NpcSaleBadge isSoldToNpc={item.isSoldToNpc} />
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                void openEditModal(item);
                              }}
                              className="rounded-full border border-[var(--border-default)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[var(--surface-subtle)]"
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => setItemPendingDelete(item)}
                              className="rounded-full border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
                            >
                              Excluir
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      </div>

      {isFormOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/55 p-4 md:items-center">
          <div
            className={[
              "w-full rounded-[28px] border border-white/60 bg-[var(--surface-elevated)] p-6 shadow-[0_24px_80px_rgba(15,23,42,0.25)]",
              editingItem ? "max-w-[1080px]" : "max-w-xl",
            ].join(" ")}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-[var(--text-primary)]">
                  {editingItem ? "Editar item" : "Novo item"}
                </h2>
                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                  Preencha os dados do item. O ID do Divine Pride é opcional,
                  mas, quando informado, deve ser um número inteiro positivo.
                </p>
              </div>
              <button
                type="button"
                onClick={closeFormModal}
                className="rounded-full border border-[var(--border-default)] px-3 py-1.5 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[var(--surface-subtle)]"
              >
                Fechar
              </button>
            </div>

            <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
              <div
                className={
                  editingItem
                    ? "grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start"
                    : "space-y-5"
                }
              >
              <div className="space-y-5">
              <Field
                label="Nome"
                error={formErrors.name}
                input={
                  <input
                    value={formValues.name}
                    onChange={(event) => updateFormValue("name", event.target.value)}
                    placeholder="Ex.: Jellopy"
                    className={inputClassName(Boolean(formErrors.name))}
                  />
                }
              />

              <Field
                label="Valor médio em zenny"
                error={formErrors.averageZenny}
                input={
                  <input
                    inputMode="numeric"
                    value={formValues.averageZenny}
                    onChange={(event) =>
                      updateFormValue("averageZenny", event.target.value)
                    }
                    placeholder="Ex.: 1500"
                    className={inputClassName(Boolean(formErrors.averageZenny))}
                  />
                }
              />

              <Field
                label="ID Divine Pride"
                help="Opcional. Quando informado, o item exibirá o ícone remoto do Divine Pride."
                error={formErrors.divinePrideId}
                input={
                  <input
                    inputMode="numeric"
                    value={formValues.divinePrideId}
                    onChange={(event) =>
                      updateFormValue("divinePrideId", event.target.value)
                    }
                    placeholder="Ex.: 501"
                    className={inputClassName(Boolean(formErrors.divinePrideId))}
                  />
                }
              />

              <CheckboxField
                label="Venda para NPC"
                help="Marque quando este item for considerado venda direta para NPC."
                error={formErrors.isSoldToNpc}
                checked={formValues.isSoldToNpc}
                onChange={(checked) => updateFormValue("isSoldToNpc", checked)}
              />
                </div>

              {editingItem ? (
                <div className="min-h-0 xl:h-[396px]">
                  <PriceHistoryPanel
                    priceHistory={priceHistory}
                    isLoading={isHistoryLoading}
                  />
                </div>
              ) : null}
              </div>

              <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeFormModal}
                  className="inline-flex h-12 items-center justify-center rounded-full border border-[var(--border-default)] px-5 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[var(--surface-subtle)]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex h-12 items-center justify-center rounded-full bg-[var(--action-primary)] px-5 text-sm font-semibold text-[var(--text-on-brand)] transition hover:bg-[var(--action-primary-hover)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? "Salvando..." : editingItem ? "Salvar alterações" : "Criar item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {itemPendingDelete ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/55 p-4 md:items-center">
          <div className="w-full max-w-lg rounded-[28px] border border-white/60 bg-[var(--surface-elevated)] p-6 shadow-[0_24px_80px_rgba(15,23,42,0.25)]">
            <span className="inline-flex rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-rose-700">
              Exclusão definitiva
            </span>
            <h2 className="mt-4 text-2xl font-semibold text-[var(--text-primary)]">
              Confirmar exclusão?
            </h2>
            <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
              O item{" "}
              <span className="font-semibold text-[var(--text-primary)]">
                {itemPendingDelete.name}
              </span>{" "}
              será removido permanentemente. Esta ação não poderá ser desfeita.
            </p>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setItemPendingDelete(null)}
                className="inline-flex h-12 items-center justify-center rounded-full border border-[var(--border-default)] px-5 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[var(--surface-subtle)]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="inline-flex h-12 items-center justify-center rounded-full bg-[var(--status-error)] px-5 text-sm font-semibold text-white transition hover:bg-[#b91c1c] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isDeleting ? "Excluindo..." : "Excluir item"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function ItemIcon({ item }: { item: ItemRecord }) {
  const [hasError, setHasError] = useState(false);

  if (!item.divinePrideId || hasError) {
    return (
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-dashed border-[var(--border-default)] bg-[var(--surface-subtle)] text-lg font-semibold text-[var(--text-muted)]">
        ?
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-white shadow-sm">
      <Image
        src={`https://static.divine-pride.net/images/items/item/${item.divinePrideId}.png`}
        alt={`Ícone do item ${item.name}`}
        width={56}
        height={56}
        className="h-14 w-14 object-contain p-1"
        onError={() => setHasError(true)}
      />
    </div>
  );
}

function ItemIdentityCell({ item }: { item: ItemRecord }) {
  const content = (
    <>
      <ItemIcon item={item} />
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-[var(--text-primary)] sm:text-base">
          {item.name}
        </p>
        <p className="mt-1 text-xs text-[var(--text-secondary)] sm:text-sm">
          {item.divinePrideId
            ? `Divine Pride #${item.divinePrideId}`
            : "Sem ID do Divine Pride"}
        </p>
      </div>
    </>
  );

  if (!item.divinePrideId) {
    return <div className="flex min-w-0 items-center gap-4">{content}</div>;
  }

  return (
    <a
      href={`https://www.divine-pride.net/database/item/${item.divinePrideId}`}
      target="_blank"
      rel="noreferrer"
      className="group flex min-w-0 items-center gap-4 rounded-[20px] p-2 -m-2 transition hover:bg-[var(--surface-subtle)]"
      title={`Abrir ${item.name} no Divine Pride`}
    >
      {content}
    </a>
  );
}

function normalizeItemRecord(item: ItemRecord) {
  return {
    ...item,
    isSoldToNpc: Boolean(item.isSoldToNpc),
  };
}

function Field({
  className,
  label,
  help,
  error,
  input,
}: {
  className?: string;
  label: string;
  help?: string;
  error?: string;
  input: ReactNode;
}) {
  return (
    <label
      className={[
        "flex flex-col gap-2 text-sm font-medium text-[var(--text-primary)]",
        className ?? "",
      ].join(" ")}
    >
      {label}
      {input}
      {help ? <span className="text-xs text-[var(--text-secondary)]">{help}</span> : null}
      {error ? <span className="text-xs font-semibold text-[var(--status-error)]">{error}</span> : null}
    </label>
  );
}

function CheckboxField({
  className,
  label,
  help,
  error,
  checked,
  onChange,
}: {
  className?: string;
  label: string;
  help?: string;
  error?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className={["space-y-2", className ?? ""].join(" ")}>
      <label className="flex items-start gap-3 rounded-2xl border border-[var(--border-default)] bg-white px-4 py-3 text-sm font-medium text-[var(--text-primary)] transition hover:bg-[var(--surface-subtle)]">
        <input
          type="checkbox"
          checked={Boolean(checked)}
          onChange={(event) => onChange(event.target.checked)}
          className="mt-0.5 h-5 w-5 rounded border-[var(--border-default)] text-[var(--action-primary)] focus:ring-4 focus:ring-blue-100"
        />
        <span className="space-y-1">
          <span className="block">{label}</span>
          {help ? (
            <span className="block text-xs font-normal text-[var(--text-secondary)]">
              {help}
            </span>
          ) : null}
        </span>
      </label>
      {error ? (
        <span className="block text-xs font-semibold text-[var(--status-error)]">
          {error}
        </span>
      ) : null}
    </div>
  );
}

function PriceHistoryPanel({
  priceHistory,
  isLoading,
}: {
  priceHistory: ItemPriceHistoryRecord[];
  isLoading: boolean;
}) {
  return (
    <section className="flex h-full min-h-[320px] flex-col space-y-3 overflow-hidden rounded-[24px] border border-[var(--border-subtle)] bg-[var(--surface-subtle)]/45 p-4 xl:min-h-0">
      <div className="space-y-1">
        <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--text-secondary)]">
          Histórico de preço
        </h3>
        <p className="text-xs text-[var(--text-secondary)]">
          Alterações reais do valor médio em zenny, da mais recente para a mais antiga.
        </p>
      </div>

      {isLoading ? (
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
          {[1, 2, 3].map((entry) => (
            <div
              key={entry}
              className="h-14 animate-pulse rounded-2xl bg-white/80"
            />
          ))}
        </div>
      ) : priceHistory.length === 0 ? (
        <div className="flex min-h-[120px] flex-1 items-center rounded-2xl border border-dashed border-[var(--border-default)] bg-white/80 px-4 py-3 text-sm text-[var(--text-secondary)] xl:min-h-0">
          Nenhuma alteração de preço registrada.
        </div>
      ) : (
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
          {priceHistory.map((entry) => (
            <article
              key={entry.id}
              className="rounded-2xl border border-[var(--border-subtle)] bg-white px-4 py-3"
            >
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                {formatZenny(entry.previousAverageZenny)} {"->"}{" "}
                {formatZenny(entry.nextAverageZenny)}
              </p>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">
                {formatDateTimePtBr(entry.createdAt)}
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-[24px] border border-white/10 bg-white/10 px-4 py-3 backdrop-blur">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-100">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
    </article>
  );
}

function LoadingState() {
  return (
    <div className="grid gap-4 p-4 sm:p-6">
      {[1, 2, 3].map((item) => (
        <div
          key={item}
          className="h-24 animate-pulse rounded-[24px] bg-[var(--surface-subtle)]"
        />
      ))}
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--surface-subtle)] text-2xl text-[var(--text-muted)]">
        +
      </div>
      <div className="space-y-2">
        <h3 className="text-xl font-semibold text-[var(--text-primary)]">
          Nenhum item cadastrado
        </h3>
        <p className="max-w-md text-sm leading-6 text-[var(--text-secondary)]">
          Comece criando o primeiro item do catálogo administrativo. Depois você
          poderá editar, buscar e ordenar os registros.
        </p>
      </div>
      <button
        type="button"
        onClick={onCreate}
        className="inline-flex h-12 items-center justify-center rounded-full bg-[var(--action-primary)] px-5 text-sm font-semibold text-[var(--text-on-brand)] transition hover:bg-[var(--action-primary-hover)]"
      >
        Criar primeiro item
      </button>
    </div>
  );
}

function NpcSaleBadge({ isSoldToNpc }: { isSoldToNpc: boolean }) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
        isSoldToNpc
          ? "bg-amber-100 text-amber-800"
          : "bg-[var(--surface-subtle)] text-[var(--text-secondary)]",
      ].join(" ")}
    >
      {isSoldToNpc ? "Sim" : "Não"}
    </span>
  );
}

type ApiErrorPayload = {
  message?: string;
  issues?: {
    fieldErrors?: Partial<Record<keyof FormValues, string[]>>;
  };
};

function flattenFieldErrors(
  fieldErrors: Partial<Record<keyof FormValues, string[] | undefined>>,
): FormErrors {
  return {
    name: fieldErrors.name?.[0],
    averageZenny: fieldErrors.averageZenny?.[0],
    divinePrideId: fieldErrors.divinePrideId?.[0],
    isSoldToNpc: fieldErrors.isSoldToNpc?.[0],
  };
}

function getApiErrorMessage(payload: ApiErrorPayload | null, fallback: string) {
  if (payload?.message) {
    return payload.message;
  }

  return fallback;
}

function inputClassName(hasError: boolean) {
  return [
    "h-12 rounded-2xl border bg-white px-4 text-[var(--text-primary)] outline-none transition focus:ring-4 focus:ring-blue-100",
    hasError
      ? "border-rose-300 focus:border-rose-300"
      : "border-[var(--border-default)] focus:border-[var(--border-focus)]",
  ].join(" ");
}

function formatDateTimePtBr(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}
