export type CometCursor = { time: number; id: number }
export type CometStream = { rows: unknown[]; cursor: CometCursor | null; publishAt: number }
export const newCometStream = (): CometStream => ({ rows: [], cursor: null, publishAt: 1 })

export function appendCometPage(stream: CometStream, page: any): { done: boolean; publish: boolean } {
    if (!Array.isArray(page?.events) || typeof page.hasMore !== 'boolean') throw new Error('Invalid COMET response')
    const next = page.next as CometCursor | null
    if (page.events.length > 0 || page.hasMore) {
        if (!page.events.length || !next || !Number.isFinite(next.time) || !Number.isSafeInteger(next.id)
            || next.time < 0 || next.id < 0 || (stream.cursor && (next.time < stream.cursor.time
                || next.time === stream.cursor.time && next.id <= stream.cursor.id))) throw new Error('Invalid COMET cursor')
    }
    stream.rows.push(...page.events)
    if (next) stream.cursor = next
    const publish = !page.hasMore || stream.rows.length >= stream.publishAt
    // Rebuild presentation indexes at exponentially spaced milestones. Parsing
    // every prefix on every page would turn long recordings into quadratic work.
    if (publish) stream.publishAt = Math.max(1, stream.rows.length * 2)
    return { done: !page.hasMore, publish }
}
