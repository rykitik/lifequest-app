type IdleDeadline = {
  didTimeout: boolean
  timeRemaining: () => number
}

type IdleCallback = (deadline: IdleDeadline) => void

type WindowWithIdleCallback = Window & {
  requestIdleCallback?: (callback: IdleCallback, options?: { timeout?: number }) => number
  cancelIdleCallback?: (handle: number) => void
}

export function scheduleAfterFirstPaint(callback: () => void, timeout = 700) {
  if (typeof window === 'undefined') {
    return () => undefined
  }

  const runtimeWindow = window as WindowWithIdleCallback
  let isCancelled = false
  let frameId: number | null = null
  let timeoutId: number | null = null
  let idleId: number | null = null

  const run = () => {
    if (isCancelled) {
      return
    }

    if (runtimeWindow.requestIdleCallback) {
      idleId = runtimeWindow.requestIdleCallback(
        () => {
          if (!isCancelled) {
            callback()
          }
        },
        { timeout },
      )
      return
    }

    timeoutId = window.setTimeout(() => {
      if (!isCancelled) {
        callback()
      }
    }, 0)
  }

  if (window.requestAnimationFrame) {
    frameId = window.requestAnimationFrame(() => {
      timeoutId = window.setTimeout(run, 0)
    })
  } else {
    timeoutId = window.setTimeout(run, 0)
  }

  return () => {
    isCancelled = true

    if (frameId !== null) {
      window.cancelAnimationFrame(frameId)
    }

    if (timeoutId !== null) {
      window.clearTimeout(timeoutId)
    }

    if (idleId !== null) {
      runtimeWindow.cancelIdleCallback?.(idleId)
    }
  }
}
