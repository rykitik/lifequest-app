import { describe, expect, it } from 'vitest'
import {
  companionAccentPresets,
  companionDisplayNameFallback,
  companionDisplayNameMaxLength,
  companionShellPresets,
  defaultCompanionCustomization,
  normalizeCompanionCustomization,
  sanitizeCompanionDisplayName,
} from './customization'

describe('companion customization helpers', () => {
  it('customization defaults are stable', () => {
    expect(defaultCompanionCustomization).toEqual({
      displayName: 'Companion Core',
      accent: 'cyan',
      shell: 'system',
    })
  })

  it('displayName trims and falls back when empty', () => {
    expect(sanitizeCompanionDisplayName('  NOVA  ')).toBe('NOVA')
    expect(sanitizeCompanionDisplayName('   ')).toBe(companionDisplayNameFallback)
  })

  it('long displayName is clamped', () => {
    const value = sanitizeCompanionDisplayName('Очень длинное имя системного ядра')

    expect(Array.from(value)).toHaveLength(companionDisplayNameMaxLength)
    expect(value).not.toContain('ядра')
  })

  it('allowed accent presets only', () => {
    expect(companionAccentPresets.map((preset) => preset.id)).toEqual([
      'cyan',
      'violet',
      'emerald',
      'amber',
      'rose',
      'ice',
    ])
    expect(normalizeCompanionCustomization({ accent: 'unknown' }).accent).toBe('cyan')
  })

  it('allowed shell presets only', () => {
    expect(companionShellPresets.map((preset) => preset.id)).toEqual([
      'system',
      'deepSpace',
      'neonFocus',
      'calmSignal',
    ])
    expect(normalizeCompanionCustomization({ shell: 'shopSkin' }).shell).toBe('system')
  })

  it('customization copy avoids pet, romantic and shame language', () => {
    const copy = JSON.stringify({
      companionAccentPresets,
      companionShellPresets,
      defaultCompanionCustomization,
    }).toLowerCase()

    expect(copy).not.toMatch(/питом|маскот|роман|любим|стыд|провал|наказ|серия потер/)
  })
})
