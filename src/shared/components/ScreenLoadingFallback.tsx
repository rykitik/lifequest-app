export function ScreenLoadingFallback() {
  return (
    <section className="flex min-h-[calc(100vh-2rem)] items-center pb-6 pt-3">
      <div className="w-full rounded-3xl border border-cyan/15 bg-[#08101f]/82 p-5 shadow-[0_24px_70px_rgba(2,6,23,0.62)]">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-cyan/25 bg-cyan/10 shadow-[0_0_34px_rgba(34,211,238,0.16)]">
          <div className="h-9 w-9 rounded-full bg-[radial-gradient(circle_at_35%_30%,#e5eef8_0%,#22d3ee_18%,#6366f1_52%,rgba(11,16,32,0.9)_100%)] shadow-[0_0_26px_rgba(34,211,238,0.45)] animate-pulse motion-reduce:animate-none" />
        </div>

        <p className="mt-5 text-center font-mono text-[10px] uppercase tracking-[0.22em] text-cyan/80">
          LifeQuest
        </p>
        <h2 className="mt-2 text-center font-display text-xl font-semibold leading-tight text-white">
          Запускаю локальную систему
        </h2>
        <p className="mx-auto mt-2 max-w-[17rem] text-center text-sm leading-6 text-muted">
          Собираю базу. Companion Core активируется.
        </p>
      </div>
    </section>
  )
}
