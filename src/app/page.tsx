import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-10 sm:px-6 lg:px-8">
      <section className="relative overflow-hidden rounded-[32px] border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-6 py-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] sm:px-8 sm:py-10">
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-r from-blue-100 via-transparent to-slate-100" />
        <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-4">
            <span className="inline-flex w-fit rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-blue-700">
              Ragnarok Farmer
            </span>
            <div className="space-y-3">
              <h1 className="text-4xl font-bold tracking-tight text-[var(--text-primary)] sm:text-5xl">
                Painel inicial para o cadastro e a manutenção de módulos administrativos.
              </h1>
              <p className="max-w-xl text-base leading-7 text-[var(--text-secondary)] sm:text-lg">
                O projeto já possui CRUDs internos para itens, instâncias PvE e personagens.
                Use as áreas administrativas para manter o catálogo principal da aplicação.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link
              href="/admin/items"
              className="inline-flex items-center justify-center rounded-full bg-[var(--action-primary)] px-6 py-3 text-sm font-semibold text-[var(--text-on-brand)] transition hover:bg-[var(--action-primary-hover)]"
            >
              Abrir admin de itens
            </Link>
            <Link
              href="/admin/instances"
              className="inline-flex items-center justify-center rounded-full bg-[var(--action-strong)] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[var(--action-strong-hover)]"
            >
              Abrir admin de instâncias
            </Link>
            <Link
              href="/admin/characters"
              className="inline-flex items-center justify-center rounded-full bg-amber-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-amber-700"
            >
              Abrir admin de personagens
            </Link>
            <Link
              href="/farm"
              className="inline-flex items-center justify-center rounded-full bg-cyan-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-cyan-700"
            >
              Abrir operação de farm
            </Link>
            <Link
              href="/reports"
              className="inline-flex items-center justify-center rounded-full bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
            >
              Abrir relatórios
            </Link>
            <a
              href="https://www.divine-pride.net/tools/tooltips"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-full border border-[var(--border-default)] bg-white px-6 py-3 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[var(--surface-subtle)]"
            >
              Referência Divine Pride
            </a>
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-4 md:grid-cols-6">
        {[
          {
            title: "Arquitetura única",
            description:
              "Frontend, API interna e persistência em SQLite vivem no mesmo projeto Next.js.",
          },
          {
            title: "Base visual",
            description:
              "O design segue o DESIGN.MD com abordagem mobile-first, base neutra e foco em legibilidade.",
          },
          {
            title: "Instâncias PvE",
            description:
              "O segundo módulo administrativo permite cadastrar instâncias com nível mínimo, cooldown e itens relacionados.",
          },
          {
            title: "Personagens",
            description:
              "O terceiro módulo administrativo registra personagens com nome, nível e classe fixa em enum local.",
          },
          {
            title: "Farm operacional",
            description:
              "A primeira funcionalidade de uso diário permite selecionar um personagem, registrar execuções individuais e acompanhar cooldowns por instância.",
          },
          {
            title: "Relatórios de farm",
            description:
              "O novo módulo consolida drops e zenny por item em recortes diários ou por período, com totalizadores operacionais.",
          },
        ].map((item) => (
          <article
            key={item.title}
            className="rounded-[24px] border border-[var(--border-subtle)] bg-white/90 p-5 shadow-[0_16px_40px_rgba(15,23,42,0.06)]"
          >
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              {item.title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              {item.description}
            </p>
          </article>
        ))}
      </section>
    </main>
  );
}
