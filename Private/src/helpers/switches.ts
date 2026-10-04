export interface SwitchState {
    switchId: string
    time: number
    sequence: number
    name: string
    state: string
    x: number
    y: number
    z: number
}

export function parseSwitches(input: unknown): SwitchState[] {
    if (!Array.isArray(input)) return []
    const events = new Map<number, SwitchState>()
    for (const row of input) {
        if (!row || typeof row !== 'object' || typeof row.switchId !== 'string' || !row.switchId
            || typeof row.state !== 'string'
            || ['time', 'sequence', 'x', 'y', 'z'].some(key => row[key] == null || row[key] === '' || !Number.isFinite(Number(row[key])))) continue
        const time = Number(row.time), sequence = Number(row.sequence)
        if (time < 0 || !Number.isSafeInteger(sequence) || sequence < 1) continue
        events.set(sequence, { switchId: row.switchId, time, sequence, name: typeof row.name === 'string' ? row.name : '',
            state: row.state, x: Number(row.x), y: Number(row.y), z: Number(row.z) })
    }
    return [...events.values()].sort((a, b) => a.time - b.time || a.sequence - b.sequence)
}

// Hide the three basement controls projected beside Mall power in the replay.
// Scope by location and exact ID so other maps and useful switches stay visible.
const hiddenInterchangeSwitches = new Set([
    'Enable_Panel_Switch_011',
    'Basement_reserve_electric_switcher_lever',
    'Error_Button_Switch_011',
])

export function groupSwitches(events: SwitchState[], location = ''): SwitchState[][] {
    const groups = new Map<string, SwitchState[]>()
    for (const event of events) {
        if (location.toLowerCase() === 'interchange' && hiddenInterchangeSwitches.has(event.switchId)) continue
        const group = groups.get(event.switchId) || []
        group.push(event)
        groups.set(event.switchId, group)
    }
    return [...groups.values()].map(group => group.sort((a, b) => a.time - b.time || a.sequence - b.sequence))
}

export function switchAt(history: SwitchState[], time: number): SwitchState | null {
    let low = 0, high = history.length
    while (low < high) {
        const mid = (low + high) >>> 1
        if (history[mid].time <= time) low = mid + 1
        else high = mid
    }
    return low > 0 ? history[low - 1] : null
}

const names: Record<string, string> = {
    Shopping_Mall_DesignStuff_00055: 'Mall power',
    Shopping_Mall_DesignStuff_00059: 'KIBA alarm control',
    Shopping_Mall_DesignStuff_00061: 'Object 14 lever',
    Shopping_Mall_DesignStuff_00060: 'Saferoom close button',
    Shopping_Mall_DesignStuff_00064: 'Burger Spot urinal',
    autoId_00000_D2_LEVER: 'D-2 bunker power',
    '00453': 'D-2 gate button',
    autoId_00632_EXFIL: 'Hermetic door lever',
    custom_DesignStuff_00034: 'Warehouse power (ZB-013)',
}

export const switchName = (event: SwitchState) => names[event.switchId] || event.name || event.switchId
export function switchAppearance(state: string): { label: string; color: string } {
    switch (state) {
        case 'Open': return { label: 'Activated', color: '#4ade80' }
        case 'Shut': return { label: 'Inactive', color: '#94a3b8' }
        case 'Locked': return { label: 'Locked', color: '#f87171' }
        case 'Interacting': return { label: 'Changing', color: '#fbbf24' }
        default: return { label: state || 'Unknown', color: '#c084fc' }
    }
}
