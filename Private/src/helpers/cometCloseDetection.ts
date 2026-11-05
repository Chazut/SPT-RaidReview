export type CloseDetectionContext = {
    state: string; reason: string; target: string; visualAcquired: boolean; attentionEvaluated: boolean;
    distance?: number; thirdParty?: number; unknown?: number; attentionBefore?: number; attentionAfter?: number;
    reduction?: number; nativeModifier?: number; finalModifier?: number; correctionAge?: number;
}
const str = (v: unknown) => typeof v === 'string' ? v : ''
const num = (v: unknown) => typeof v === 'number' && Number.isFinite(v) ? v : undefined
export function parseCometCloseDetection(raw: any): CloseDetectionContext | null {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw) || !['native', 'adjusted', 'acquired'].includes(raw.state)) return null
    const h: CloseDetectionContext = { state: raw.state, reason: str(raw.reason), target: str(raw.target), visualAcquired: raw.state === 'acquired' && raw.visualAcquired === true, attentionEvaluated: raw.attentionEvaluated === true }
    for (const k of ['distance', 'thirdParty', 'unknown', 'attentionBefore', 'attentionAfter', 'reduction', 'nativeModifier', 'finalModifier', 'correctionAge'] as const) h[k] = num(raw[k])
    return h
}
export function cometCloseDetectionSummary(h: CloseDetectionContext, names: Record<string, string> = {}): string[] {
    const n = (v: number | undefined) => v == null ? '?' : v.toFixed(2)
    return [h.visualAcquired ? 'Native visual acquisition observed after a recent adjustment' : h.state === 'adjusted' ? 'Attention penalty reduced; target acquisition not confirmed' : 'Native vision retained',
        `Target checked: ${names[h.target] || h.target || 'Unknown'} · ${n(h.distance)} m`,
        h.attentionEvaluated ? `Extra attention factor: ${n(h.attentionBefore)} → ${n(h.attentionAfter)} (third-party ${n(h.thirdParty)}, unknown target ${n(h.unknown)})` : 'Attention factors not evaluated: native vision retained.',
        `Full SAIN sight modifier: ${n(h.nativeModifier)} → ${n(h.finalModifier)}`,
        `Reason: ${h.reason.replace(/^close-/, '').replace(/-/g, ' ')}`,
        h.visualAcquired ? `Last adjustment ${n(h.correctionAge)} s earlier. This correlation does not prove P05 caused the acquisition.` : 'A vision calculation, not a known contact, target selection or order to fire.',
        'Lighting, gear, posture and other native factors are preserved. Behavior colors stay unchanged.']
}
