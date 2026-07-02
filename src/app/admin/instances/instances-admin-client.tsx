"use client";

import Image from "next/image";
import Link from "next/link";
import {
  startTransition,
  useCallback,
  useDeferredValue,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  useId,
} from "react";
import type { FormEvent, ReactNode } from "react";
import { createPortal } from "react-dom";

import {
  instanceInputSchema,
  type InstanceSortBy,
  type InstanceSortOrder,
} from "@/features/instances/instance-schema";

type ItemRecord = {
  id: number;
  name: string;
  averageZenny: number;
  divinePrideId: number | null;
};

type InstanceItemRecord = {
  id: number;
  name: string;
  divinePrideId: number | null;
};

type InstanceRecord = {
  id: number;
  name: string;
  minimumLevel: number;
  cooldownDays: number;
  itemCount: number;
  items: InstanceItemRecord[];
  createdAt: string;
  updatedAt: string;
};

type ItemsResponse = {
  items: ItemRecord[];
};

type InstancesResponse = {
  instances: InstanceRecord[];
};

type FeedbackState =
  | {
      tone: "success" | "error";
      text: string;
    }
  | null;

type FormValues = {
  name: string;
  minimumLevel: string;
  cooldownDays: string;
  itemIds: number[];
};

type FormErrors = Partial<
  Record<"name" | "minimumLevel" | "cooldownDays" | "itemIds", string>
>;

const emptyForm: FormValues = {
  name: "",
  minimumLevel: "",
  cooldownDays: "0",
  itemIds: [],
};

async function requestItemsCatalog() {
  const response = await fetch("/api/items?sortBy=name&sortOrder=asc");
  const payload = (await response.json()) as ItemsResponse | ApiErrorPayload;

  if (!response.ok) {
    throw new Error(
      getApiErrorMessage(payload as ApiErrorPayload, "Não foi possível carregar os itens."),
    );
  }

  return (payload as ItemsResponse).items;
}

async function requestInstances(
  search: string,
  sortBy: InstanceSortBy,
  sortOrder: InstanceSortOrder,
) {
  const params = new URLSearchParams();

  if (search.trim()) {
    params.set("search", search.trim());
  }

  params.set("sortBy", sortBy);
  params.set("sortOrder", sortOrder);

  const response = await fetch(`/api/instances?${params.toString()}`);
  const payload = (await response.json()) as InstancesResponse | ApiErrorPayload;

  if (!response.ok) {
    throw new Error(
      getApiErrorMessage(
        payload as ApiErrorPayload,
        "Não foi possível carregar as instâncias.",
      ),
    );
  }

  return (payload as InstancesResponse).instances;
}

export function InstancesAdminClient() {
  const [instances, setInstances] = useState<InstanceRecord[]>([]);
  const [itemsCatalog, setItemsCatalog] = useState<ItemRecord[]>([]);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [sortBy, setSortBy] = useState<InstanceSortBy>("name");
  const [sortOrder, setSortOrder] = useState<InstanceSortOrder>("asc");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingInstance, setEditingInstance] = useState<InstanceRecord | null>(null);
  const [formValues, setFormValues] = useState<FormValues>(emptyForm);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [itemSearch, setItemSearch] = useState("");
  const [instancePendingDelete, setInstancePendingDelete] =
    useState<InstanceRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const firstLoadRef = useRef(true);

  async function refreshData(isInitialLoad: boolean) {
    if (isInitialLoad) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }

    try {
      const [nextInstances, nextItemsCatalog] = await Promise.all([
        requestInstances(deferredSearch, sortBy, sortOrder),
        requestItemsCatalog(),
      ]);

      startTransition(() => {
        setInstances(nextInstances);
        setItemsCatalog(nextItemsCatalog);
      });
    } catch (error) {
      setFeedback({
        tone: "error",
        text:
          error instanceof Error
            ? error.message
            : "Não foi possível carregar os dados das instâncias.",
      });
    } finally {
      if (isInitialLoad) {
        setIsLoading(false);
      } else {
        setIsRefreshing(false);
      }
    }
  }

  const loadDataEffect = useEffectEvent(async (isInitialLoad: boolean) => {
    await refreshData(isInitialLoad);
  });

  useEffect(() => {
    const isInitialLoad = firstLoadRef.current;
    firstLoadRef.current = false;

    void loadDataEffect(isInitialLoad);
  }, [deferredSearch, sortBy, sortOrder]);

  function openCreateModal() {
    setEditingInstance(null);
    setFormValues(emptyForm);
    setFormErrors({});
    setItemSearch("");
    setIsFormOpen(true);
  }

  function openEditModal(instance: InstanceRecord) {
    setEditingInstance(instance);
    setFormValues({
      name: instance.name,
      minimumLevel: String(instance.minimumLevel),
      cooldownDays: String(instance.cooldownDays),
      itemIds: instance.items.map((item) => item.id),
    });
    setFormErrors({});
    setItemSearch("");
    setIsFormOpen(true);
  }

  function closeFormModal() {
    if (isSaving) {
      return;
    }

    setIsFormOpen(false);
    setEditingInstance(null);
    setFormErrors({});
    setItemSearch("");
  }

  function updateFormValue<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setFormValues((current) => ({
      ...current,
      [key]: value,
    }));

    if (formErrors[key as keyof FormErrors]) {
      setFormErrors((current) => ({
        ...current,
        [key]: undefined,
      }));
    }
  }

  function addItemToForm(itemId: number) {
    if (formValues.itemIds.includes(itemId)) {
      return;
    }

    updateFormValue("itemIds", [...formValues.itemIds, itemId]);
  }

  function removeItemFromForm(itemId: number) {
    updateFormValue(
      "itemIds",
      formValues.itemIds.filter((currentItemId) => currentItemId !== itemId),
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);

    const parsed = instanceInputSchema.safeParse(formValues);

    if (!parsed.success) {
      setFormErrors(flattenFieldErrors(parsed.error.flatten().fieldErrors));
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch(
        editingInstance ? `/api/instances/${editingInstance.id}` : "/api/instances",
        {
          method: editingInstance ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(parsed.data),
        },
      );

      const payload = (await response.json().catch(() => null)) as
        | ApiErrorPayload
        | { instance: InstanceRecord }
        | null;

      if (!response.ok) {
        const message = getApiErrorMessage(
          payload as ApiErrorPayload | null,
          "Não foi possível salvar a instância.",
        );

        if (response.status === 409 && !(payload as ApiErrorPayload | null)?.issues) {
          setFormErrors((current) => ({
            ...current,
            [message.toLowerCase().includes("item") ? "itemIds" : "name"]: message,
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
      setEditingInstance(null);
      setFormValues(emptyForm);
      setFormErrors({});
      setItemSearch("");
      setFeedback({
        tone: "success",
        text: editingInstance
          ? "Instância atualizada com sucesso."
          : "Instância criada com sucesso.",
      });

      await refreshData(false);
    } catch (error) {
      setFeedback({
        tone: "error",
        text:
          error instanceof Error
            ? error.message
            : "Não foi possível salvar a instância.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!instancePendingDelete) {
      return;
    }

    setIsDeleting(true);
    setFeedback(null);

    try {
      const response = await fetch(`/api/instances/${instancePendingDelete.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as ApiErrorPayload | null;
        throw new Error(
          getApiErrorMessage(payload, "Não foi possível excluir a instância."),
        );
      }

      setInstancePendingDelete(null);
      setFeedback({
        tone: "success",
        text: "Instância excluída com sucesso.",
      });

      await refreshData(false);
    } catch (error) {
      setFeedback({
        tone: "error",
        text:
          error instanceof Error
            ? error.message
            : "Não foi possível excluir a instância.",
      });
    } finally {
      setIsDeleting(false);
    }
  }

  const selectedItems = itemsCatalog.filter((item) => formValues.itemIds.includes(item.id));
  const availableItems = itemsCatalog.filter((item) => !formValues.itemIds.includes(item.id));
  const filteredAvailableItems = availableItems.filter((item) =>
    item.name.toLowerCase().includes(itemSearch.trim().toLowerCase()),
  );

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-6">
        <section className="overflow-hidden rounded-[32px] border border-[var(--border-subtle)] bg-[var(--surface-elevated)] shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
          <div className="border-b border-[var(--border-subtle)] bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-900 px-6 py-8 text-white sm:px-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl space-y-3">
                <Link
                  href="/"
                  className="inline-flex w-fit rounded-full border border-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-100 transition hover:bg-white/10"
                >
                  Ragnarok Farmer
                </Link>
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                    Admin de instâncias
                  </h1>
                  <p className="max-w-xl text-sm leading-6 text-slate-200 sm:text-base">
                    Gerencie instâncias PvE com nível mínimo, tempo de espera e itens
                    relacionados ao farm.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <MetricCard label="Instâncias" value={String(instances.length)} />
                <MetricCard
                  label="Itens no catálogo"
                  value={String(itemsCatalog.length)}
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
              <div className="grid flex-1 gap-4 sm:grid-cols-4">
                <label className="flex flex-col gap-2 text-sm font-medium text-[var(--text-primary)] sm:col-span-2">
                  Buscar por nome
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Ex.: Torre sem Fim"
                    className="h-12 rounded-2xl border border-[var(--border-default)] bg-white px-4 text-[var(--text-primary)] outline-none transition focus:border-[var(--border-focus)] focus:ring-4 focus:ring-blue-100"
                  />
                </label>

                <label className="flex flex-col gap-2 text-sm font-medium text-[var(--text-primary)]">
                  Ordenar por
                  <select
                    value={sortBy}
                    onChange={(event) => setSortBy(event.target.value as InstanceSortBy)}
                    className="h-12 rounded-2xl border border-[var(--border-default)] bg-white px-4 text-[var(--text-primary)] outline-none transition focus:border-[var(--border-focus)] focus:ring-4 focus:ring-blue-100"
                  >
                    <option value="name">Nome</option>
                    <option value="minimumLevel">Nível mínimo</option>
                    <option value="cooldownDays">Cooldown</option>
                  </select>
                </label>

                <label className="flex flex-col gap-2 text-sm font-medium text-[var(--text-primary)]">
                  Ordem
                  <select
                    value={sortOrder}
                    onChange={(event) =>
                      setSortOrder(event.target.value as InstanceSortOrder)
                    }
                    className="h-12 rounded-2xl border border-[var(--border-default)] bg-white px-4 text-[var(--text-primary)] outline-none transition focus:border-[var(--border-focus)] focus:ring-4 focus:ring-blue-100"
                  >
                    <option value="asc">Crescente</option>
                    <option value="desc">Decrescente</option>
                  </select>
                </label>
              </div>

              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex h-12 items-center justify-center rounded-full bg-[var(--action-primary)] px-5 text-sm font-semibold text-[var(--text-on-brand)] transition hover:bg-[var(--action-primary-hover)]"
              >
                Nova instância
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
                Catálogo de instâncias
              </h2>
              <p className="text-sm text-[var(--text-secondary)]">
                Lista administrativa de instâncias PvE e seus itens relacionados.
              </p>
            </div>

            <span className="rounded-full bg-[var(--surface-subtle)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
              {isRefreshing ? "Atualizando" : `${instances.length} registros`}
            </span>
          </header>

          {isLoading ? (
            <LoadingState />
          ) : instances.length === 0 ? (
            <EmptyState onCreate={openCreateModal} />
          ) : (
            <>
              <div className="grid gap-4 p-4 sm:p-6 md:hidden">
                {instances.map((instance) => (
                  <article
                    key={instance.id}
                    className="rounded-[24px] border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-4 shadow-[0_12px_30px_rgba(15,23,42,0.05)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-semibold text-[var(--text-primary)]">
                          {instance.name}
                        </h3>
                        <p className="mt-1 text-sm text-[var(--text-secondary)]">
                          Nível mínimo: {instance.minimumLevel}
                        </p>
                      </div>
                      <span className="rounded-full bg-[var(--surface-subtle)] px-2.5 py-1 text-xs font-semibold text-[var(--text-secondary)]">
                        #{instance.id}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-[var(--text-secondary)]">
                      <p>Cooldown: {instance.cooldownDays} dias</p>
                      <p>Itens: {instance.itemCount}</p>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {instance.items.slice(0, 4).map((item) => (
                        <CompactItemChip key={item.id} item={item} />
                      ))}
                      {instance.itemCount > 4 ? (
                        <span className="rounded-full bg-[var(--surface-subtle)] px-3 py-1 text-xs font-semibold text-[var(--text-secondary)]">
                          +{instance.itemCount - 4} itens
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-5 flex gap-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(instance)}
                        className="rounded-full border border-[var(--border-default)] px-3 py-1.5 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[var(--surface-subtle)]"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => setInstancePendingDelete(instance)}
                        className="rounded-full border border-rose-200 px-3 py-1.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
                      >
                        Excluir
                      </button>
                    </div>
                  </article>
                ))}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="min-w-full border-collapse">
                  <thead className="bg-[var(--surface-section)]">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--text-primary)]">
                        Instância
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--text-primary)]">
                        Nível mínimo
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--text-primary)]">
                        Cooldown
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--text-primary)]">
                        Itens
                      </th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-[var(--text-primary)]">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {instances.map((instance, index) => (
                      <tr
                        key={instance.id}
                        className={
                          index % 2 === 0 ? "bg-white" : "bg-[var(--surface-subtle)]/65"
                        }
                      >
                        <td className="px-6 py-4">
                          <InstanceNameWithTooltip instance={instance} />
                        </td>
                        <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">
                          {instance.minimumLevel}
                        </td>
                        <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">
                          {instance.cooldownDays} dias
                        </td>
                        <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">
                          {instance.itemCount}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => openEditModal(instance)}
                              className="rounded-full border border-[var(--border-default)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[var(--surface-subtle)]"
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => setInstancePendingDelete(instance)}
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
          <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-[28px] border border-white/60 bg-[var(--surface-elevated)] p-6 shadow-[0_24px_80px_rgba(15,23,42,0.25)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-[var(--text-primary)]">
                  {editingInstance ? "Editar instância" : "Nova instância"}
                </h2>
                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                  Defina a instância PvE, o nível mínimo, o tempo de espera e os itens
                  relacionados ao farm.
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

            <form className="mt-6 space-y-6" onSubmit={handleSubmit}>
              <div className="grid gap-5 md:grid-cols-3">
                <Field
                  label="Nome"
                  error={formErrors.name}
                  input={
                    <input
                      value={formValues.name}
                      onChange={(event) => updateFormValue("name", event.target.value)}
                      placeholder="Ex.: Torre sem Fim"
                      className={inputClassName(Boolean(formErrors.name))}
                    />
                  }
                />

                <Field
                  label="Nível mínimo"
                  error={formErrors.minimumLevel}
                  input={
                    <input
                      inputMode="numeric"
                      value={formValues.minimumLevel}
                      onChange={(event) =>
                        updateFormValue("minimumLevel", event.target.value)
                      }
                      placeholder="Ex.: 80"
                      className={inputClassName(Boolean(formErrors.minimumLevel))}
                    />
                  }
                />

                <Field
                  label="Tempo de espera em dias"
                  error={formErrors.cooldownDays}
                  input={
                    <input
                      inputMode="numeric"
                      value={formValues.cooldownDays}
                      onChange={(event) =>
                        updateFormValue("cooldownDays", event.target.value)
                      }
                      placeholder="Ex.: 7"
                      className={inputClassName(Boolean(formErrors.cooldownDays))}
                    />
                  }
                />
              </div>

              <section className="rounded-[24px] border border-[var(--border-subtle)] bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                      Itens relacionados
                    </h3>
                    <p className="text-sm text-[var(--text-secondary)]">
                      Adicione itens já cadastrados para associar à instância.
                    </p>
                  </div>

                  <label className="flex flex-col gap-2 text-sm font-medium text-[var(--text-primary)] sm:min-w-72">
                    Buscar itens disponíveis
                    <input
                      value={itemSearch}
                      onChange={(event) => setItemSearch(event.target.value)}
                      placeholder="Ex.: Jellopy"
                      className={inputClassName(false)}
                    />
                  </label>
                </div>

                {formErrors.itemIds ? (
                  <p className="mt-3 text-xs font-semibold text-[var(--status-error)]">
                    {formErrors.itemIds}
                  </p>
                ) : null}

                {itemsCatalog.length === 0 ? (
                  <div className="mt-5 rounded-[20px] border border-dashed border-[var(--border-default)] bg-[var(--surface-subtle)] px-5 py-10 text-center">
                    <h4 className="text-lg font-semibold text-[var(--text-primary)]">
                      Nenhum item disponível
                    </h4>
                    <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                      Crie itens primeiro em{" "}
                      <Link
                        href="/admin/items"
                        className="font-semibold text-[var(--action-primary)] underline underline-offset-4"
                      >
                        /admin/items
                      </Link>{" "}
                      para poder vinculá-los às instâncias.
                    </p>
                  </div>
                ) : (
                  <div className="mt-5 grid gap-5 xl:grid-cols-2">
                    <ItemSelectionTable
                      title="Itens adicionados"
                      emptyMessage="Nenhum item vinculado a esta instância."
                      items={selectedItems}
                      actionLabel="Remover"
                      actionTone="remove"
                      onAction={removeItemFromForm}
                    />

                    <ItemSelectionTable
                      title="Itens disponíveis"
                      emptyMessage={
                        itemSearch.trim()
                          ? "Nenhum item encontrado para esta busca."
                          : "Todos os itens já foram adicionados."
                      }
                      items={filteredAvailableItems}
                      actionLabel="Adicionar"
                      actionTone="add"
                      onAction={addItemToForm}
                    />
                  </div>
                )}
              </section>

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
                  {isSaving
                    ? "Salvando..."
                    : editingInstance
                      ? "Salvar alterações"
                      : "Criar instância"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {instancePendingDelete ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/55 p-4 md:items-center">
          <div className="w-full max-w-lg rounded-[28px] border border-white/60 bg-[var(--surface-elevated)] p-6 shadow-[0_24px_80px_rgba(15,23,42,0.25)]">
            <span className="inline-flex rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-rose-700">
              Exclusão definitiva
            </span>
            <h2 className="mt-4 text-2xl font-semibold text-[var(--text-primary)]">
              Confirmar exclusão?
            </h2>
            <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
              A instância{" "}
              <span className="font-semibold text-[var(--text-primary)]">
                {instancePendingDelete.name}
              </span>{" "}
              será removida permanentemente. Os itens permanecerão cadastrados.
            </p>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setInstancePendingDelete(null)}
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
                {isDeleting ? "Excluindo..." : "Excluir instância"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function ItemSelectionTable({
  title,
  emptyMessage,
  items,
  actionLabel,
  actionTone,
  onAction,
}: {
  title: string;
  emptyMessage: string;
  items: InstanceItemRecord[] | ItemRecord[];
  actionLabel: string;
  actionTone: "add" | "remove";
  onAction: (itemId: number) => void;
}) {
  return (
    <section className="overflow-hidden rounded-[22px] border border-[var(--border-subtle)] bg-[var(--surface-card)]">
      <header className="border-b border-[var(--border-subtle)] bg-[var(--surface-section)] px-4 py-3">
        <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
          {title}
        </h4>
      </header>

      {items.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-[var(--text-secondary)]">
          {emptyMessage}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="border-b border-[var(--border-subtle)]">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                  Item
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                  Ação
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr
                  key={item.id}
                  className={index % 2 === 0 ? "bg-white" : "bg-[var(--surface-subtle)]/45"}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <ItemIcon item={item} size={44} />
                      <div>
                        <p className="text-sm font-semibold text-[var(--text-primary)]">
                          {item.name}
                        </p>
                        <p className="text-xs text-[var(--text-secondary)]">
                          {item.divinePrideId
                            ? `Divine Pride #${item.divinePrideId}`
                            : "Sem ID do Divine Pride"}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => onAction(item.id)}
                      className={
                        actionTone === "add"
                          ? "rounded-full border border-emerald-200 px-3 py-1.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
                          : "rounded-full border border-rose-200 px-3 py-1.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
                      }
                    >
                      {actionLabel}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function ItemIcon({
  item,
  size,
}: {
  item: Pick<ItemRecord, "name" | "divinePrideId">;
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

function CompactItemChip({ item }: { item: InstanceItemRecord }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-[var(--surface-subtle)] px-3 py-1 text-xs font-semibold text-[var(--text-secondary)]">
      <span className="inline-flex h-5 w-5 items-center justify-center overflow-hidden rounded-full bg-white">
        {item.divinePrideId ? (
          <Image
            src={`https://static.divine-pride.net/images/items/item/${item.divinePrideId}.png`}
            alt={`Ícone do item ${item.name}`}
            width={20}
            height={20}
            className="h-5 w-5 object-contain"
          />
        ) : (
          <span>?</span>
        )}
      </span>
      {item.name}
    </span>
  );
}

function InstanceNameWithTooltip({ instance }: { instance: InstanceRecord }) {
  const hasItems = instance.items.length > 0;
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tooltipId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });

  function clearCloseTimeout() {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  }

  const updateTooltipPosition = useCallback(() => {
    if (!triggerRef.current || typeof window === "undefined") {
      return;
    }

    const rect = triggerRef.current.getBoundingClientRect();
    const tooltipWidth = 288;
    const gap = 12;
    const viewportPadding = 16;
    const estimatedHeight = Math.min(320, 64 + instance.items.length * 52);
    const canOpenBelow =
      rect.bottom + gap + estimatedHeight <= window.innerHeight - viewportPadding;

    const left = Math.min(
      Math.max(rect.left, viewportPadding),
      window.innerWidth - tooltipWidth - viewportPadding,
    );
    const top = canOpenBelow
      ? rect.bottom + gap
      : Math.max(viewportPadding, rect.top - estimatedHeight - gap);

    setTooltipPosition({ top, left });
  }, [instance.items.length]);

  function openTooltip() {
    if (!hasItems) {
      return;
    }

    clearCloseTimeout();
    updateTooltipPosition();
    setIsOpen(true);
  }

  function closeTooltipSoon() {
    clearCloseTimeout();
    closeTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 120);
  }

  useEffect(() => {
    if (!isOpen || typeof window === "undefined") {
      return;
    }

    const syncPosition = () => updateTooltipPosition();

    window.addEventListener("scroll", syncPosition, true);
    window.addEventListener("resize", syncPosition);

    return () => {
      window.removeEventListener("scroll", syncPosition, true);
      window.removeEventListener("resize", syncPosition);
    };
  }, [isOpen, updateTooltipPosition]);

  useEffect(() => {
    return () => {
      clearCloseTimeout();
    };
  }, []);

  return (
    <div className="w-fit max-w-full">
      <button
        ref={triggerRef}
        type="button"
        disabled={!hasItems}
        onMouseEnter={openTooltip}
        onMouseLeave={closeTooltipSoon}
        onFocus={openTooltip}
        onBlur={() => setIsOpen(false)}
        className={[
          "max-w-full rounded-md text-left text-sm font-semibold text-[var(--text-primary)] outline-none transition",
          hasItems
            ? "cursor-help underline decoration-dotted underline-offset-4 hover:text-[var(--action-primary)] focus-visible:ring-4 focus-visible:ring-[var(--border-focus)]"
            : "cursor-default",
        ].join(" ")}
        aria-describedby={hasItems && isOpen ? tooltipId : undefined}
        aria-label={
          hasItems
            ? `${instance.name}. Exibir itens relacionados`
            : `${instance.name}. Sem itens vinculados`
        }
      >
        {instance.name}
      </button>

      <p className="mt-1 text-xs text-[var(--text-secondary)]">
        {hasItems
          ? `${instance.itemCount} ${instance.itemCount === 1 ? "item vinculado" : "itens vinculados"}`
          : "Sem itens vinculados"}
      </p>

      {hasItems && isOpen && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={tooltipRef}
              id={tooltipId}
              role="tooltip"
              onMouseEnter={openTooltip}
              onMouseLeave={closeTooltipSoon}
              className="fixed z-[100] w-72 rounded-[20px] border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-4 shadow-[0_24px_48px_rgba(15,23,42,0.18)]"
              style={{
                top: tooltipPosition.top,
                left: tooltipPosition.left,
              }}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                Itens relacionados
              </p>

              <div className="mt-3 max-h-64 space-y-3 overflow-y-auto pr-1">
                {instance.items.map((item) => (
                  <div key={item.id} className="flex items-center gap-3">
                    <ItemIcon item={item} size={36} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[var(--text-primary)]">
                        {item.name}
                      </p>
                      <p className="text-xs text-[var(--text-secondary)]">
                        {item.divinePrideId
                          ? `Divine Pride #${item.divinePrideId}`
                          : "Sem ID do Divine Pride"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

function Field({
  label,
  error,
  input,
}: {
  label: string;
  error?: string;
  input: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-2 text-sm font-medium text-[var(--text-primary)]">
      {label}
      {input}
      {error ? (
        <span className="text-xs font-semibold text-[var(--status-error)]">{error}</span>
      ) : null}
    </label>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-[24px] border border-white/10 bg-white/10 px-4 py-3 backdrop-blur">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-100">
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
          Nenhuma instância cadastrada
        </h3>
        <p className="max-w-md text-sm leading-6 text-[var(--text-secondary)]">
          Comece criando a primeira instância PvE do catálogo administrativo.
        </p>
      </div>
      <button
        type="button"
        onClick={onCreate}
        className="inline-flex h-12 items-center justify-center rounded-full bg-[var(--action-primary)] px-5 text-sm font-semibold text-[var(--text-on-brand)] transition hover:bg-[var(--action-primary-hover)]"
      >
        Criar primeira instância
      </button>
    </div>
  );
}

type ApiErrorPayload = {
  message?: string;
  issues?: {
    fieldErrors?: Partial<Record<"name" | "minimumLevel" | "cooldownDays" | "itemIds", string[]>>;
  };
};

function flattenFieldErrors(
  fieldErrors: Partial<
    Record<"name" | "minimumLevel" | "cooldownDays" | "itemIds", string[] | undefined>
  >,
): FormErrors {
  return {
    name: fieldErrors.name?.[0],
    minimumLevel: fieldErrors.minimumLevel?.[0],
    cooldownDays: fieldErrors.cooldownDays?.[0],
    itemIds: fieldErrors.itemIds?.[0],
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
