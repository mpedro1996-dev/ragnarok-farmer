"use client";

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

import { characterClassOptions, characterInputSchema } from "@/features/characters/character-schema";
import type {
  CharacterSortBy,
  CharacterSortOrder,
} from "@/features/characters/character-schema";

type CharacterRecord = {
  id: number;
  name: string;
  level: number;
  classId: number;
  classLabel: string;
  createdAt: string;
  updatedAt: string;
};

type CharactersResponse = {
  characters: CharacterRecord[];
};

type FeedbackState =
  | {
      tone: "success" | "error";
      text: string;
    }
  | null;

type FormValues = {
  name: string;
  level: string;
  classId: string;
};

type FormErrors = Partial<Record<keyof FormValues, string>>;

const emptyForm: FormValues = {
  name: "",
  level: "",
  classId: String(characterClassOptions[0]?.value ?? ""),
};

async function requestCharacters(
  search: string,
  sortBy: CharacterSortBy,
  sortOrder: CharacterSortOrder,
) {
  const params = new URLSearchParams();

  if (search.trim()) {
    params.set("search", search.trim());
  }

  params.set("sortBy", sortBy);
  params.set("sortOrder", sortOrder);

  const response = await fetch(`/api/characters?${params.toString()}`);
  const payload = (await response.json()) as CharactersResponse | ApiErrorPayload;

  if (!response.ok) {
    throw new Error(
      getApiErrorMessage(
        payload as ApiErrorPayload,
        "Não foi possível carregar os personagens.",
      ),
    );
  }

  return (payload as CharactersResponse).characters;
}

export function CharactersAdminClient() {
  const [characters, setCharacters] = useState<CharacterRecord[]>([]);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [sortBy, setSortBy] = useState<CharacterSortBy>("name");
  const [sortOrder, setSortOrder] = useState<CharacterSortOrder>("asc");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState<CharacterRecord | null>(null);
  const [formValues, setFormValues] = useState<FormValues>(emptyForm);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [characterPendingDelete, setCharacterPendingDelete] =
    useState<CharacterRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const firstLoadRef = useRef(true);

  async function refreshCharacters(isInitialLoad: boolean) {
    if (isInitialLoad) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }

    try {
      const nextCharacters = await requestCharacters(deferredSearch, sortBy, sortOrder);

      startTransition(() => {
        setCharacters(nextCharacters);
      });
    } catch (error) {
      setFeedback({
        tone: "error",
        text:
          error instanceof Error
            ? error.message
            : "Não foi possível carregar os dados dos personagens.",
      });
    } finally {
      if (isInitialLoad) {
        setIsLoading(false);
      } else {
        setIsRefreshing(false);
      }
    }
  }

  const loadCharactersEffect = useEffectEvent(async (isInitialLoad: boolean) => {
    await refreshCharacters(isInitialLoad);
  });

  useEffect(() => {
    const isInitialLoad = firstLoadRef.current;
    firstLoadRef.current = false;

    void loadCharactersEffect(isInitialLoad);
  }, [deferredSearch, sortBy, sortOrder]);

  function openCreateModal() {
    setEditingCharacter(null);
    setFormValues(emptyForm);
    setFormErrors({});
    setIsFormOpen(true);
  }

  function openEditModal(character: CharacterRecord) {
    setEditingCharacter(character);
    setFormValues({
      name: character.name,
      level: String(character.level),
      classId: String(character.classId),
    });
    setFormErrors({});
    setIsFormOpen(true);
  }

  function closeFormModal() {
    if (isSaving) {
      return;
    }

    setIsFormOpen(false);
    setEditingCharacter(null);
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

    const parsed = characterInputSchema.safeParse(formValues);

    if (!parsed.success) {
      setFormErrors(flattenFieldErrors(parsed.error.flatten().fieldErrors));
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch(
        editingCharacter ? `/api/characters/${editingCharacter.id}` : "/api/characters",
        {
          method: editingCharacter ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(parsed.data),
        },
      );

      const payload = (await response.json().catch(() => null)) as
        | ApiErrorPayload
        | { character: CharacterRecord }
        | null;

      if (!response.ok) {
        const message = getApiErrorMessage(
          payload as ApiErrorPayload | null,
          "Não foi possível salvar o personagem.",
        );

        if (response.status === 409 && !(payload as ApiErrorPayload | null)?.issues) {
          setFormErrors((current) => ({
            ...current,
            [message.toLowerCase().includes("class") ? "classId" : "name"]: message,
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
      setEditingCharacter(null);
      setFormValues(emptyForm);
      setFormErrors({});
      setFeedback({
        tone: "success",
        text: editingCharacter
          ? "Personagem atualizado com sucesso."
          : "Personagem criado com sucesso.",
      });

      await refreshCharacters(false);
    } catch (error) {
      setFeedback({
        tone: "error",
        text:
          error instanceof Error
            ? error.message
            : "Não foi possível salvar o personagem.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!characterPendingDelete) {
      return;
    }

    setIsDeleting(true);
    setFeedback(null);

    try {
      const response = await fetch(`/api/characters/${characterPendingDelete.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as ApiErrorPayload | null;
        throw new Error(
          getApiErrorMessage(payload, "Não foi possível excluir o personagem."),
        );
      }

      setCharacterPendingDelete(null);
      setFeedback({
        tone: "success",
        text: "Personagem excluído com sucesso.",
      });

      await refreshCharacters(false);
    } catch (error) {
      setFeedback({
        tone: "error",
        text:
          error instanceof Error
            ? error.message
            : "Não foi possível excluir o personagem.",
      });
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-6">
        <section className="overflow-hidden rounded-[32px] border border-[var(--border-subtle)] bg-[var(--surface-elevated)] shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
          <div className="border-b border-[var(--border-subtle)] bg-gradient-to-r from-slate-950 via-slate-900 to-amber-800 px-6 py-8 text-white sm:px-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl space-y-3">
                <Link
                  href="/"
                  className="inline-flex w-fit rounded-full border border-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-amber-100 transition hover:bg-white/10"
                >
                  Ragnarok Farmer
                </Link>
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                    Admin de personagens
                  </h1>
                  <p className="max-w-xl text-sm leading-6 text-slate-200 sm:text-base">
                    Gerencie personagens com nome, nível e classe fixa para compor o
                    catálogo administrativo do projeto.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <MetricCard label="Personagens" value={String(characters.length)} />
                <MetricCard
                  label="Classes fixas"
                  value={String(characterClassOptions.length)}
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
                    placeholder="Ex.: ArcebispoX"
                    className="h-12 rounded-2xl border border-[var(--border-default)] bg-white px-4 text-[var(--text-primary)] outline-none transition focus:border-[var(--border-focus)] focus:ring-4 focus:ring-blue-100"
                  />
                </label>

                <label className="flex flex-col gap-2 text-sm font-medium text-[var(--text-primary)]">
                  Ordenar por
                  <select
                    value={sortBy}
                    onChange={(event) => setSortBy(event.target.value as CharacterSortBy)}
                    className="h-12 rounded-2xl border border-[var(--border-default)] bg-white px-4 text-[var(--text-primary)] outline-none transition focus:border-[var(--border-focus)] focus:ring-4 focus:ring-blue-100"
                  >
                    <option value="name">Nome</option>
                    <option value="level">Nível</option>
                    <option value="classId">Classe</option>
                  </select>
                </label>

                <label className="flex flex-col gap-2 text-sm font-medium text-[var(--text-primary)]">
                  Ordem
                  <select
                    value={sortOrder}
                    onChange={(event) =>
                      setSortOrder(event.target.value as CharacterSortOrder)
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
                Novo personagem
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
                Catálogo de personagens
              </h2>
              <p className="text-sm text-[var(--text-secondary)]">
                Lista administrativa de personagens com classe fixa e nível.
              </p>
            </div>

            <span className="rounded-full bg-[var(--surface-subtle)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
              {isRefreshing ? "Atualizando" : `${characters.length} registros`}
            </span>
          </header>

          {isLoading ? (
            <LoadingState />
          ) : characters.length === 0 ? (
            <EmptyState onCreate={openCreateModal} />
          ) : (
            <>
              <div className="grid gap-4 p-4 sm:p-6 md:hidden">
                {characters.map((character) => (
                  <article
                    key={character.id}
                    className="rounded-[24px] border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-4 shadow-[0_12px_30px_rgba(15,23,42,0.05)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-semibold text-[var(--text-primary)]">
                          {character.name}
                        </h3>
                        <p className="mt-1 text-sm text-[var(--text-secondary)]">
                          {character.classLabel}
                        </p>
                      </div>
                      <span className="rounded-full bg-[var(--surface-subtle)] px-2.5 py-1 text-xs font-semibold text-[var(--text-secondary)]">
                        #{character.id}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-[var(--text-secondary)]">
                      <p>Nível: {character.level}</p>
                      <p>Classe: {character.classId}</p>
                    </div>

                    <div className="mt-5 flex gap-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(character)}
                        className="rounded-full border border-[var(--border-default)] px-3 py-1.5 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[var(--surface-subtle)]"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => setCharacterPendingDelete(character)}
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
                        Personagem
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--text-primary)]">
                        Nível
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--text-primary)]">
                        Classe
                      </th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-[var(--text-primary)]">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {characters.map((character, index) => (
                      <tr
                        key={character.id}
                        className={
                          index % 2 === 0 ? "bg-white" : "bg-[var(--surface-subtle)]/65"
                        }
                      >
                        <td className="px-6 py-4">
                          <div>
                            <p className="text-sm font-semibold text-[var(--text-primary)]">
                              {character.name}
                            </p>
                            <p className="mt-1 text-xs text-[var(--text-secondary)]">
                              ID da classe: {character.classId}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">
                          {character.level}
                        </td>
                        <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">
                          {character.classLabel}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => openEditModal(character)}
                              className="rounded-full border border-[var(--border-default)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[var(--surface-subtle)]"
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => setCharacterPendingDelete(character)}
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
          <div className="w-full max-w-xl rounded-[28px] border border-white/60 bg-[var(--surface-elevated)] p-6 shadow-[0_24px_80px_rgba(15,23,42,0.25)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-[var(--text-primary)]">
                  {editingCharacter ? "Editar personagem" : "Novo personagem"}
                </h2>
                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                  Defina o nome, o nível e a classe do personagem no catálogo
                  administrativo.
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
              <Field
                label="Nome"
                error={formErrors.name}
                input={
                  <input
                    value={formValues.name}
                    onChange={(event) => updateFormValue("name", event.target.value)}
                    placeholder="Ex.: FerreiroX"
                    className={inputClassName(Boolean(formErrors.name))}
                  />
                }
              />

              <Field
                label="Nível"
                error={formErrors.level}
                input={
                  <input
                    inputMode="numeric"
                    value={formValues.level}
                    onChange={(event) => updateFormValue("level", event.target.value)}
                    placeholder="Ex.: 175"
                    className={inputClassName(Boolean(formErrors.level))}
                  />
                }
              />

              <Field
                label="Classe"
                error={formErrors.classId}
                input={
                  <select
                    value={formValues.classId}
                    onChange={(event) => updateFormValue("classId", event.target.value)}
                    className={inputClassName(Boolean(formErrors.classId))}
                  >
                    {characterClassOptions.map((characterClass) => (
                      <option key={characterClass.value} value={characterClass.value}>
                        {characterClass.label}
                      </option>
                    ))}
                  </select>
                }
              />

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
                    : editingCharacter
                      ? "Salvar alterações"
                      : "Criar personagem"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {characterPendingDelete ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/55 p-4 md:items-center">
          <div className="w-full max-w-lg rounded-[28px] border border-white/60 bg-[var(--surface-elevated)] p-6 shadow-[0_24px_80px_rgba(15,23,42,0.25)]">
            <span className="inline-flex rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-rose-700">
              Exclusão definitiva
            </span>
            <h2 className="mt-4 text-2xl font-semibold text-[var(--text-primary)]">
              Confirmar exclusão?
            </h2>
            <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
              O personagem{" "}
              <span className="font-semibold text-[var(--text-primary)]">
                {characterPendingDelete.name}
              </span>{" "}
              será removido permanentemente.
            </p>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setCharacterPendingDelete(null)}
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
                {isDeleting ? "Excluindo..." : "Excluir personagem"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
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
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-100">
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
          Nenhum personagem cadastrado
        </h3>
        <p className="max-w-md text-sm leading-6 text-[var(--text-secondary)]">
          Comece criando o primeiro personagem do catálogo administrativo.
        </p>
      </div>
      <button
        type="button"
        onClick={onCreate}
        className="inline-flex h-12 items-center justify-center rounded-full bg-[var(--action-primary)] px-5 text-sm font-semibold text-[var(--text-on-brand)] transition hover:bg-[var(--action-primary-hover)]"
      >
        Criar primeiro personagem
      </button>
    </div>
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
    level: fieldErrors.level?.[0],
    classId: fieldErrors.classId?.[0],
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
