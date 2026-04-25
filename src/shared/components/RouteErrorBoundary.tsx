import { AlertTriangle, RefreshCcw, RotateCcw } from 'lucide-react'
import { isRouteErrorResponse, useRouteError } from 'react-router-dom'
import { clearLifeQuestRuntimeData } from '@/services/lifequestRuntime'
import { GlassCard } from '@/shared/components/GlassCard'
import { PrimaryButton } from '@/shared/components/PrimaryButton'

const storageErrorPattern = /localstorage|persist|quota|storage|deserialize|hydration|json/i

function getErrorMessage(error: unknown) {
  if (isRouteErrorResponse(error)) {
    return error.data?.message || error.statusText || `Ошибка ${error.status}`
  }

  if (error instanceof Error) {
    return error.message
  }

  if (typeof error === 'string') {
    return error
  }

  return 'Произошёл непредвиденный сбой.'
}

export function RouteErrorBoundary() {
  const error = useRouteError()
  const message = getErrorMessage(error)
  const canResetLocalData = storageErrorPattern.test(message)

  return (
    <div className="relative min-h-screen overflow-x-hidden px-4 safe-top safe-bottom">
      <div className="pointer-events-none absolute inset-0 bg-shell-grid opacity-90" />
      <div className="pointer-events-none absolute left-1/2 top-10 h-48 w-48 -translate-x-1/2 rounded-full bg-danger/20 blur-3xl" />

      <div className="relative mx-auto flex min-h-screen max-w-[30rem] items-center">
        <GlassCard tone="strong" className="w-full p-6">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-danger/20 bg-danger/10 text-danger">
            <AlertTriangle className="h-6 w-6" />
          </div>

          <p className="mt-5 text-center text-xs uppercase tracking-[0.24em] text-danger/80">
            Ошибка приложения
          </p>
          <h1 className="mt-2 text-center font-display text-2xl font-semibold text-white">
            LifeQuest временно сбился
          </h1>
          <p className="mt-3 text-center text-sm leading-6 text-muted">
            Мы скрыли технические детали. Попробуй мягко перезапустить приложение.
          </p>
          <p className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm leading-6 text-slate-100">
            {message}
          </p>

          <div className="mt-5 grid gap-3">
            <PrimaryButton
              fullWidth
              icon={<RefreshCcw className="h-4 w-4" />}
              onClick={() => window.location.reload()}
            >
              Обновить приложение
            </PrimaryButton>

            {canResetLocalData ? (
              <PrimaryButton
                tone="warning"
                fullWidth
                icon={<RotateCcw className="h-4 w-4" />}
                onClick={() => {
                  void clearLifeQuestRuntimeData({
                    clearAllLocalStorage: true,
                    clearSessionStorage: true,
                    clearCaches: true,
                    unregisterServiceWorkers: true,
                  }).then(() => {
                    window.location.reload()
                  })
                }}
              >
                Сбросить локальные данные
              </PrimaryButton>
            ) : null}
          </div>
        </GlassCard>
      </div>
    </div>
  )
}
