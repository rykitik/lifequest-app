interface MiniSparklineProps {
  values: number[]
  color?: string
}

export function MiniSparkline({
  values,
  color = 'linear-gradient(180deg, rgba(99,102,241,0.95), rgba(34,211,238,0.9))',
}: MiniSparklineProps) {
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1

  return (
    <div className="flex h-20 items-end gap-1">
      {values.map((value, index) => {
        const height = 24 + ((value - min) / span) * 56

        return (
          <div
            key={`${value}-${index}`}
            className="flex-1 rounded-full"
            style={{
              height,
              background: color,
              opacity: 0.65 + index / values.length / 3,
            }}
          />
        )
      })}
    </div>
  )
}
