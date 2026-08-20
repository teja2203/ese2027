/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   sound.ts â€” WebAudio synth engine (E1 ambient + E2 UI sounds).
   Byte-faithful port of the legacy v52 engine: zero audio files,
   brown/pink/528Hz ambient + arpeggio/brass/fanfare/shatter/flip.
   Unlocked on the first pointerdown (WebView autoplay policy).
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

import * as S from './storage'
import { useRef, useSyncExternalStore } from 'react'

export type SoundKind =
  | 'start'
  | 'stop'
  | 'complete'
  | 'break'
  | 'fanfare'
  | 'achievement'
  | 'day'
  | 'shatter'
  | 'flip'
  | 'thock'
  | 'stamp'
  | 'flash'
  | 'bell'

let _actx: AudioContext | null = null
function actx(): AudioContext | null {
  if (!_actx) {
    try {
      const C = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (C) _actx = new C()
    } catch {
      return null
    }
  }
  if (_actx && _actx.state === 'suspended') {
    try {
      void _actx.resume()
    } catch {
      /* keep the suspended context â€” next gesture retries */
    }
  }
  return _actx
}

/* unlock audio on first user gesture (mobile autoplay policy) */
export function installAudioUnlock(): () => void {
  const unlock = () => {
    actx()
    document.removeEventListener('pointerdown', unlock, true)
  }
  document.addEventListener('pointerdown', unlock, { once: true, capture: true })
  return () => document.removeEventListener('pointerdown', unlock, true)
}

/* â”€â”€ synth helpers (verbatim legacy) â”€â”€ */
function tone(ctx: AudioContext, t0: number, freq: number, dur: number, type: OscillatorType, vol: number, dest?: AudioNode) {
  const o = ctx.createOscillator()
  const g = ctx.createGain()
  o.type = type || 'sine'
  o.frequency.value = freq
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(vol || 0.18, t0 + 0.02)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  o.connect(g)
  g.connect(dest || ctx.destination)
  o.start(t0)
  o.stop(t0 + dur + 0.05)
}
function tone2(ctx: AudioContext, t0: number, freq: number, dur: number, type: OscillatorType, vol: number, dest?: AudioNode) {
  tone(ctx, t0, freq, dur, type, (vol || 0.14) * 0.6, dest)
  tone(ctx, t0, freq * 1.008, dur, type, (vol || 0.14) * 0.6, dest)
}
function brass(ctx: AudioContext, t0: number, freq: number, dur: number, vol: number, dest?: AudioNode) {
  const o = ctx.createOscillator()
  const g = ctx.createGain()
  const f = ctx.createBiquadFilter()
  const dst = dest || ctx.destination
  o.type = 'sawtooth'
  o.frequency.value = freq
  f.type = 'lowpass'
  f.frequency.value = freq * 6
  f.Q.value = 1.4
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(vol || 0.16, t0 + 0.02)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  o.connect(f)
  f.connect(g)
  g.connect(dst)
  o.frequency.setValueAtTime(freq * 0.96, t0)
  o.frequency.linearRampToValueAtTime(freq, t0 + 0.04)
  const lfo = ctx.createOscillator()
  const lg = ctx.createGain()
  lfo.frequency.value = 5.5
  lg.gain.value = freq * 0.012
  lfo.connect(lg)
  lg.connect(o.frequency)
  lfo.start(t0)
  lfo.stop(t0 + dur)
  o.start(t0)
  o.stop(t0 + dur + 0.05)
}
function shimmer(ctx: AudioContext, t0: number, vol: number) {
  ;[2093, 2637, 3136, 4186].forEach((f, i) => tone(ctx, t0 + i * 0.09, f, 0.35 + i * 0.08, 'sine', (vol || 0.05) * (1 - i * 0.15)))
}
function makeVerb(ctx: AudioContext, durS: number, decay: number): ConvolverNode {
  const len = Math.floor(ctx.sampleRate * (durS || 1.2))
  const buf = ctx.createBuffer(2, len, ctx.sampleRate)
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c)
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay || 2.5)
  }
  const cv = ctx.createConvolver()
  cv.buffer = buf
  return cv
}

/* â”€â”€ UI sound events (E2) â”€â”€ */
let flipLastTs = 0
export function playSound(kind: SoundKind): void {
  if (!S.loadJSON<boolean>(S.SOUND_KEY, true)) return
  const ctx = actx()
  if (!ctx) return
  const t = ctx.currentTime + 0.03
  if (kind === 'start') {
    tone(ctx, t, 392, 0.28, 'sine', 0.14)
    tone(ctx, t + 0.12, 523.25, 0.28, 'sine', 0.16)
    tone(ctx, t + 0.24, 659.25, 0.25, 'sine', 0.15)
    tone2(ctx, t + 0.36, 783.99, 0.6, 'sine', 0.2)
    tone(ctx, t + 0.36, 1567.98, 0.45, 'sine', 0.06)
    tone(ctx, t + 0.48, 2093, 0.4, 'sine', 0.04)
    tone(ctx, t, 98, 0.18, 'sine', 0.09)
  } else if (kind === 'stop') {
    tone(ctx, t, 783.99, 0.28, 'sine', 0.15)
    tone(ctx, t + 0.14, 659.25, 0.28, 'sine', 0.14)
    tone(ctx, t + 0.28, 523.25, 0.28, 'sine', 0.14)
    tone2(ctx, t + 0.42, 392, 0.75, 'sine', 0.16)
    tone(ctx, t + 0.42, 196, 0.8, 'sine', 0.07)
    tone(ctx, t + 0.3, 130.81, 0.6, 'sine', 0.06)
  } else if (kind === 'complete') {
    const rv = makeVerb(ctx, 1.4, 2.2)
    const rvg = ctx.createGain()
    rvg.gain.value = 0.28
    rv.connect(rvg)
    rvg.connect(ctx.destination)
    tone(ctx, t, 523.25, 0.28, 'sine', 0.15)
    tone(ctx, t + 0.15, 659.25, 0.25, 'sine', 0.16)
    tone(ctx, t + 0.3, 783.99, 0.25, 'sine', 0.17)
    tone(ctx, t + 0.45, 1046.5, 0.25, 'sine', 0.18)
    ;[523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => {
      tone(ctx, t + 0.68, f, 0.9, 'triangle', 0.08, rv)
      if (i < 3) tone2(ctx, t + 0.68, f, 0.85, 'sine', 0.05, rv)
    })
    shimmer(ctx, t + 0.88, 0.07)
    tone(ctx, t + 1.05, 2637, 0.55, 'sine', 0.04)
    tone(ctx, t + 0.68, 130.81, 1.1, 'sine', 0.09)
  } else if (kind === 'break') {
    tone2(ctx, t, 783.99, 0.5, 'sine', 0.13)
    tone2(ctx, t + 0.2, 659.25, 0.55, 'sine', 0.13)
    tone2(ctx, t + 0.4, 523.25, 0.8, 'sine', 0.14)
    tone(ctx, t + 0.4, 261.63, 1.0, 'sine', 0.08)
    tone(ctx, t + 0.4, 130.81, 1.2, 'sine', 0.05)
    tone(ctx, t + 0.6, 1046.5, 0.6, 'sine', 0.04)
  } else if (kind === 'fanfare' || kind === 'achievement') {
    const rv = makeVerb(ctx, 1.6, 2.0)
    const rvg = ctx.createGain()
    rvg.gain.value = 0.22
    rv.connect(rvg)
    rvg.connect(ctx.destination)
    brass(ctx, t, 392, 0.17, 0.16, rv)
    brass(ctx, t + 0.14, 523.25, 0.17, 0.16, rv)
    brass(ctx, t + 0.28, 659.25, 0.17, 0.16, rv)
    brass(ctx, t + 0.42, 783.99, 0.72, 0.19, rv)
    brass(ctx, t + 0.42, 523.25, 0.72, 0.1, rv)
    brass(ctx, t + 0.42, 392, 0.72, 0.07, rv)
    brass(ctx, t + 0.42, 1046.5, 0.55, 0.09, rv)
    shimmer(ctx, t + 0.85, 0.07)
    tone(ctx, t + 1.1, 2093, 0.6, 'sine', 0.04)
    tone(ctx, t + 0.42, 130.81, 0.8, 'sine', 0.1)
  } else if (kind === 'day') {
    const rv = makeVerb(ctx, 1.5, 2.1)
    const rvg = ctx.createGain()
    rvg.gain.value = 0.2
    rv.connect(rvg)
    rvg.connect(ctx.destination)
    brass(ctx, t, 523.25, 0.22, 0.16, rv)
    brass(ctx, t + 0.17, 659.25, 0.22, 0.16, rv)
    brass(ctx, t + 0.34, 783.99, 0.22, 0.17, rv)
    brass(ctx, t + 0.51, 1046.5, 0.8, 0.2, rv)
    ;[523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f) => brass(ctx, t + 0.51, f, 0.75, 0.07, rv))
    shimmer(ctx, t + 0.95, 0.08)
    tone(ctx, t + 1.15, 3136, 0.55, 'sine', 0.04)
    tone(ctx, t + 0.51, 130.81, 0.9, 'sine', 0.1)
  } else if (kind === 'shatter') {
    const sd = 0.1
    const sbuf = ctx.createBuffer(2, Math.floor(ctx.sampleRate * sd), ctx.sampleRate)
    for (let c = 0; c < 2; c++) {
      const sch = sbuf.getChannelData(c)
      for (let i = 0; i < sch.length; i++)
        sch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / sch.length, 1.4) * (c === 0 ? 1 : -1)
    }
    const sns = ctx.createBufferSource()
    sns.buffer = sbuf
    const shpf = ctx.createBiquadFilter()
    shpf.type = 'highpass'
    shpf.frequency.value = 1800
    const sg = ctx.createGain()
    sg.gain.setValueAtTime(0.25, t)
    sg.gain.exponentialRampToValueAtTime(0.0001, t + sd)
    sns.connect(shpf)
    shpf.connect(sg)
    sg.connect(ctx.destination)
    sns.start(t)
    ;[3200, 2700, 2200, 1800, 1400, 1000].forEach((f, i) =>
      tone(ctx, t + 0.02 + i * 0.038, f, 0.08 + i * 0.015, 'sine', 0.07 - 0.005 * i)
    )
    tone(ctx, t, 0.1, 0.15, 'sine', 0.16)
    tone(ctx, t + 0.01, 65, 0.2, 'sine', 0.1)
  } else if (kind === 'flip') {
    if (flipLastTs && performance.now() - flipLastTs < 90) return
    flipLastTs = performance.now()
    const dur = 0.048
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate)
    const ch = buf.getChannelData(0)
    for (let i = 0; i < ch.length; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / ch.length, 2.2)
    const nsrc = ctx.createBufferSource()
    nsrc.buffer = buf
    const bp = ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = 2600
    bp.Q.value = 1.4
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.13, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.02)
    nsrc.connect(bp)
    bp.connect(g)
    g.connect(ctx.destination)
    nsrc.start(t)
    tone(ctx, t + 0.012, 220, 0.04, 'sine', 0.04)
    tone(ctx, t + 0.018, 145, 0.05, 'sine', 0.06)
  } else if (kind === 'thock') {
    /* short LED click — task check */
    const dur = 0.07
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate)
    const ch = buf.getChannelData(0)
    for (let i = 0; i < ch.length; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / ch.length, 1.6)
    const src = ctx.createBufferSource()
    src.buffer = buf
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 950
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.16, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.03)
    src.connect(lp)
    lp.connect(g)
    g.connect(ctx.destination)
    src.start(t)
    tone(ctx, t, 240, 0.06, 'sine', 0.12)
    tone(ctx, t + 0.012, 150, 0.07, 'sine', 0.09)
  } else if (kind === 'stamp') {
    /* ceremony stamp — plate hits */
    tone(ctx, t, 130, 0.16, 'sine', 0.2)
    tone(ctx, t + 0.015, 98, 0.2, 'sine', 0.14)
    tone(ctx, t + 0.05, 1960, 0.05, 'square', 0.05)
    tone(ctx, t + 0.12, 523.25, 0.22, 'sine', 0.1)
    tone(ctx, t + 0.24, 659.25, 0.22, 'sine', 0.1)
    tone(ctx, t + 0.36, 783.99, 0.34, 'sine', 0.12)
  } else if (kind === 'flash') {
    /* camera flash — celebration sting (SPEC §2) */
    const dur = 0.28
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate)
    const ch = buf.getChannelData(0)
    for (let i = 0; i < ch.length; i++)
      ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / ch.length, 3)
    const src = ctx.createBufferSource()
    src.buffer = buf
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.2, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.02)
    src.connect(g)
    g.connect(ctx.destination)
    src.start(t)
    tone(ctx, t, 60, 0.1, 'sine', 0.14)
  } else if (kind === 'bell') {
    /* signal bell — session bound (SPEC §2) */
    tone(ctx, t, 1567.98, 0.3, 'sine', 0.08)
    tone(ctx, t, 3135.96, 0.4, 'sine', 0.04)
    tone(ctx, t + 0.28, 1567.98, 0.4, 'sine', 0.07)
    tone(ctx, t + 0.28, 3135.96, 0.5, 'sine', 0.035)
  }
}

/* â”€â”€ ambient engine (E1): brown / pink / 528Hz â”€â”€ */
type SoundMode = 'off' | 'brown' | 'pink' | 'sol528'
let soundNodes: {
  lfo: OscillatorNode | null
  dc: AudioScheduledSourceNode | null
  vibDepth: GainNode | null
  carrierGain: GainNode | null
  oscs: AudioScheduledSourceNode[]
  gain: GainNode | null
} = { lfo: null, dc: null, vibDepth: null, carrierGain: null, oscs: [], gain: null }

let currentSoundMode: SoundMode = S.loadJSON<SoundMode>(S.SOUND_MODE_KEY, 'off')
if (!['off', 'brown', 'pink', 'sol528'].includes(currentSoundMode)) currentSoundMode = 'off'
let soundVolumeVar = S.loadJSON<number>(S.SOUND_VOL_KEY, 0.4)

let soundVersion = 0
const soundListeners = new Set<() => void>()
export function useSoundMode(): { mode: SoundMode; vol: number; version: number } {
  /* shallow store: re-render subscribers on mode/volume change */
  const last = useRef<{ v: { mode: SoundMode; vol: number; version: number } } | null>(null)
  return useSyncExternalStore(
    (l) => {
      soundListeners.add(l)
      return () => soundListeners.delete(l)
    },
    () => {
      const v = { mode: currentSoundMode, vol: soundVolumeVar, version: soundVersion }
      if (last.current && last.current.v.version === v.version) return last.current.v
      last.current = { v }
      return v
    }
  )
}

function stopFocusSound() {
  try {
    if (soundNodes.lfo) {
      try {
        soundNodes.lfo.stop()
      } catch {
        /* already stopped */
      }
      soundNodes.lfo.disconnect()
      soundNodes.lfo = null
    }
    if (soundNodes.dc) {
      try {
        soundNodes.dc.stop()
      } catch {
        /* already stopped */
      }
      soundNodes.dc.disconnect()
      soundNodes.dc = null
    }
    if (soundNodes.vibDepth) {
      soundNodes.vibDepth.disconnect()
      soundNodes.vibDepth = null
    }
    if (soundNodes.oscs) {
      soundNodes.oscs.forEach((o) => {
        try {
          o.stop()
        } catch {
          /* already stopped */
        }
        try {
          o.disconnect()
        } catch {
          /* already disconnected */
        }
      })
      soundNodes.oscs = []
    }
    if (soundNodes.carrierGain) {
      soundNodes.carrierGain.disconnect()
      soundNodes.carrierGain = null
    }
    if (soundNodes.gain) {
      soundNodes.gain.disconnect()
      soundNodes.gain = null
    }
  } catch {
    /* engine teardown â€” ignore */
  }
}

export function playFocusSound(mode: SoundMode, vol?: number) {
  stopFocusSound()
  if (mode === 'off') return
  const audioCtx = actx()
  if (!audioCtx) return
  try {
    const v = vol !== undefined ? vol : soundVolumeVar
    const masterGain = audioCtx.createGain()
    masterGain.gain.setValueAtTime(0.0001, audioCtx.currentTime)
    masterGain.gain.linearRampToValueAtTime(v, audioCtx.currentTime + 1.5)
    masterGain.connect(audioCtx.destination)
    soundNodes.gain = masterGain
    const sr = audioCtx.sampleRate

    if (mode === 'brown') {
      const bufLen = sr * 5
      const buf = audioCtx.createBuffer(1, bufLen, sr)
      const d = buf.getChannelData(0)
      let last = 0
      for (let i = 0; i < bufLen; i++) {
        const w = Math.random() * 2 - 1
        last = (last + 0.02 * w) / 1.02
        d[i] = Math.max(-1, Math.min(1, last * 3.5))
      }
      const src = audioCtx.createBufferSource()
      src.buffer = buf
      src.loop = true
      const lp = audioCtx.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.value = 800
      lp.Q.value = 0.5
      src.connect(lp)
      lp.connect(masterGain)
      src.start()
      soundNodes.oscs.push(src)
    } else if (mode === 'pink') {
      const bufLen = sr * 5
      const buf = audioCtx.createBuffer(1, bufLen, sr)
      const d = buf.getChannelData(0)
      let b0 = 0
      let b1 = 0
      let b2 = 0
      let b3 = 0
      let b4 = 0
      let b5 = 0
      let b6 = 0
      for (let i = 0; i < bufLen; i++) {
        const w = Math.random() * 2 - 1
        b0 = 0.99886 * b0 + w * 0.0555179
        b1 = 0.99332 * b1 + w * 0.0750759
        b2 = 0.969 * b2 + w * 0.153852
        b3 = 0.8665 * b3 + w * 0.3104856
        b4 = 0.55 * b4 + w * 0.5329522
        b5 = -0.7616 * b5 - w * 0.016898
        d[i] = Math.max(-1, Math.min(1, (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11))
        b6 = w * 0.115926
      }
      const src = audioCtx.createBufferSource()
      src.buffer = buf
      src.loop = true
      src.connect(masterGain)
      src.start()
      soundNodes.oscs.push(src)
    } else if (mode === 'sol528') {
      const vib = audioCtx.createOscillator()
      vib.type = 'sine'
      vib.frequency.value = 5
      const vibDepth = audioCtx.createGain()
      vibDepth.gain.value = 2.5
      vib.connect(vibDepth)
      vib.start()
      soundNodes.lfo = vib
      soundNodes.vibDepth = vibDepth
      ;[
        [264, 0.12],
        [528, 0.5],
        [1056, 0.18]
      ].forEach(([f, amp]) => {
        const osc = audioCtx.createOscillator()
        osc.type = 'sine'
        osc.frequency.value = f as number
        vibDepth.connect(osc.frequency)
        const g = audioCtx.createGain()
        g.gain.setValueAtTime(0.0001, audioCtx.currentTime)
        g.gain.linearRampToValueAtTime(amp as number, audioCtx.currentTime + 2)
        osc.connect(g)
        g.connect(masterGain)
        osc.start()
        soundNodes.oscs.push(osc)
      })
    }
  } catch (e) {
    console.error('Audio error:', e)
  }
}

export function setFocusSoundMode(mode: SoundMode) {
  currentSoundMode = mode
  S.saveJSON(S.SOUND_MODE_KEY, mode)
  playFocusSound(mode, soundVolumeVar)
  soundVersion++
  soundListeners.forEach((l) => l())
}

export function setSoundVolume(vol: number) {
  soundVolumeVar = Math.max(0, Math.min(1, vol))
  S.saveJSON(S.SOUND_VOL_KEY, soundVolumeVar)
  if (currentSoundMode !== 'off') playFocusSound(currentSoundMode, soundVolumeVar)
  soundVersion++
  soundListeners.forEach((l) => l())
}

export function soundMode(): SoundMode {
  return currentSoundMode
}

export function soundVolume(): number {
  return soundVolumeVar
}

export function toggleAmbient(on: boolean): void {
  setFocusSoundMode(on && currentSoundMode === 'off' ? 'brown' : on ? currentSoundMode : 'off')
}
