import { motion, useReducedMotion } from 'framer-motion'
import { Lock, Sparkles } from 'lucide-react'
import { LinearProgress } from '@/shared/components/LinearProgress'
import { cn } from '@/shared/lib/cn'
import { formatPercent } from '@/shared/lib/format'
import type { CompanionState } from '@/shared/types'
import {
  buildCompanionEvolutionModel,
  shouldAnimateEvolutionNode,
  type CompanionEvolutionViewNode,
} from '../lib/evolution'

interface CompanionEvolutionPreviewProps {
  mood: CompanionState
  evolutionLevel: number
  progressToNextForm: number
  nextFormLabel?: string
}

function MiniCoreGlyph({
  node,
  reducedMotion,
}: {
  node: CompanionEvolutionViewNode
  reducedMotion: boolean
}) {
  const opacity = node.future ? 0.42 : 1
  const shouldAnimate = shouldAnimateEvolutionNode({ reducedMotion, future: node.future })

  return (
    <motion.div
      className="relative mx-auto flex h-12 w-12 items-center justify-center rounded-full"
      animate={shouldAnimate ? { scale: [0.98, 1.04, 0.98] } : { scale: 1 }}
      transition={{ duration: 3.4, repeat: shouldAnimate ? Infinity : 0 }}
      style={{
        opacity,
        background: `radial-gradient(circle, ${node.glow}22 0%, rgba(15,23,42,0.72) 62%, transparent 100%)`,
        boxShadow: node.current ? `0 0 24px ${node.glow}55` : `0 0 14px ${node.glow}24`,
      }}
      aria-hidden="true"
    >
      <span
        className="absolute inset-1 rounded-full border"
        style={{ borderColor: node.current ? `${node.glow}88` : `${node.glow}40` }}
      />
      <span
        className="absolute inset-3 rounded-full border border-dashed"
        style={{ borderColor: `${node.secondaryGlow}66` }}
      />
      <span
        className="h-5 w-5 rounded-full border border-white/15"
        style={{
          background: `radial-gradient(circle at 35% 28%, #ffffff 0%, ${node.secondaryGlow} 16%, ${node.glow}95 46%, rgba(11,16,32,0.9) 100%)`,
          boxShadow: `0 0 16px ${node.glow}80`,
        }}
      />
      {node.current ? (
        <span
          className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full"
          style={{ background: node.glow, boxShadow: `0 0 12px ${node.glow}` }}
        />
      ) : null}
    </motion.div>
  )
}

export function CompanionEvolutionPreview({
  mood,
  evolutionLevel,
  progressToNextForm,
  nextFormLabel,
}: CompanionEvolutionPreviewProps) {
  const reducedMotion = useReducedMotion() ?? false
  const model = buildCompanionEvolutionModel({
    mood,
    evolutionLevel,
    progressToNextForm,
  })

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.24em] text-muted">Companion Core</p>
          <h2 className="mt-2 font-display text-xl font-bold leading-tight text-white">
            Сейчас: {model.currentLabel}
          </h2>
          <p className="mt-1 text-sm leading-5 text-muted">
            {model.currentSignal} · {formatPercent(model.progressToNextForm)} до следующей формы
          </p>
        </div>
        <div className="shrink-0 rounded-2xl border border-primary/25 bg-primary/10 px-3 py-2 text-left sm:text-right">
          <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-primary/80">
            Следующая форма
          </p>
          <p className="mt-1 text-sm font-semibold text-white">{model.nextLabel}</p>
          {nextFormLabel ? (
            <p className="mt-0.5 text-xs leading-4 text-muted">{nextFormLabel}</p>
          ) : null}
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.035] p-3">
        <div className="mb-2 flex items-center justify-between gap-3 text-xs uppercase tracking-[0.16em] text-muted">
          <span>Сигнал эволюции</span>
          <span>{formatPercent(model.progressToNextForm)}</span>
        </div>
        <LinearProgress
          value={model.progressToNextForm}
          barClassName="bg-gradient-to-r from-primary via-cyan to-success"
        />
      </div>

      <div className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(136px,1fr))] gap-3">
        {model.nodes.map((node) => (
          <div
            key={node.state}
            className={cn(
              'min-h-[132px] min-w-0 rounded-2xl border p-3 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]',
              node.current
                ? 'border-primary/55 bg-primary/15'
                : node.future
                  ? 'border-white/10 bg-white/[0.025]'
                  : 'border-white/10 bg-white/[0.045]',
            )}
            aria-current={node.current ? 'true' : undefined}
          >
            <MiniCoreGlyph node={node} reducedMotion={reducedMotion} />
            <div className="mt-3 flex items-center justify-center gap-1.5">
              {node.future ? <Lock className="h-3.5 w-3.5 shrink-0 text-muted" /> : null}
              {node.current ? <Sparkles className="h-3.5 w-3.5 shrink-0 text-cyan" /> : null}
              <p className="min-w-0 break-words text-sm font-semibold leading-tight text-white">
                {node.cardLabel}
              </p>
            </div>
            <p className="mt-1 break-words text-[11px] font-medium leading-tight text-muted">
              {node.statusLabel}
            </p>
            <p className="mt-1 break-words text-xs leading-4 text-slate-300">{node.caption}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
