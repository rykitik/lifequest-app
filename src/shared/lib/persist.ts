function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function mergePersistedState<T>(defaults: T, persistedState: unknown): T {
  if (Array.isArray(defaults)) {
    return (Array.isArray(persistedState) ? persistedState : defaults) as T
  }

  if (!isPlainObject(defaults) || !isPlainObject(persistedState)) {
    return (persistedState ?? defaults) as T
  }

  const nextState: Record<string, unknown> = { ...defaults }

  for (const [key, value] of Object.entries(persistedState)) {
    if (!(key in nextState)) {
      continue
    }

    const defaultValue = nextState[key]

    if (isPlainObject(defaultValue) && isPlainObject(value)) {
      nextState[key] = mergePersistedState(defaultValue, value)
      continue
    }

    if (Array.isArray(defaultValue) && Array.isArray(value)) {
      nextState[key] = value
      continue
    }

    nextState[key] = value
  }

  return nextState as T
}
