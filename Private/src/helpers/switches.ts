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

// Verified against the map scenes: hide light/radio controls and automatic
// relays, while retaining the player-operated power, alarm and exit controls.
// Filter at replay time so old recordings benefit too. Unknown IDs stay visible,
// including switches added by map mods. IDs are scoped to their original map.
const hiddenSwitches = new Map<string, ReadonlySet<string>>(Object.entries({
    bigmap: new Set([
        // The scene has IDs 0 through 75 except 20, plus one development ID.
        ...Array.from({ length: 76 }, (_, i) => i).filter(i => i !== 20)
            .map(i => `switch_custom_Light_${String(i).padStart(5, '0')}`),
        'switch_develop_00000',
    ]),
    lighthouse: new Set([
        ...Array.from({ length: 5 }, (_, i) => `switch_Lighthouse_DesignStuff_0000${i}`),
        'radio_sound_01',
        'radio_sound_07',
        'switch_LighthouseGatewayZone_00000', // Gate body driven by the two controls.
    ]),
    rezervbase: new Set([
        '00454', // D-2 shutter driven by the gate button.
        '00455', // Hermetic door timer.
        '00456', // Hermetic door reset relay.
    ]),
    interchange: new Set([
        'Enable_Panel_Switch_011',
        'Basement_reserve_electric_switcher_lever',
        'Error_Button_Switch_011',
        'Shopping_Mall_DesignStuff_00056', // Alarm relay, separate from its console.
        'Shopping_Mall_DesignStuff_00057', // KIBA alarm relay.
        'Shopping_Mall_DesignStuff_00062', // Saferoom power relay, not the card reader.
    ]),
    laboratory: new Set([
        '00401', '00406', '00411', // Elevator motion driven by the call buttons.
        '00407', '00413', // Elevator reset relays.
        '00414', // Moving water plane driven by the pump.
        '00419', '00421', // Parking and hangar doors driven by their consoles.
        'autoId_00009_EXFIL', 'autoId_00012_EXFIL', // Announcers, not their controls.
    ]),
}))

const locationAliases: Record<string, string> = { customs: 'bigmap', reserve: 'rezervbase', labs: 'laboratory' }

export function groupSwitches(events: SwitchState[], location = ''): SwitchState[][] {
    const map = location.trim().toLowerCase()
    const hidden = hiddenSwitches.get(locationAliases[map] || map)
    const groups = new Map<string, SwitchState[]>()
    for (const event of events) {
        if (hidden?.has(event.switchId)) continue
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
    Shopping_Mall_DesignStuff_00058: 'Mall alarm control',
    Shopping_Mall_DesignStuff_00059: 'KIBA alarm control',
    Shopping_Mall_DesignStuff_00061: 'Object 14 lever',
    Shopping_Mall_DesignStuff_00060: 'Saferoom close button',
    Shopping_Mall_DesignStuff_00064: 'Burger Spot urinal',
    autoId_00000_D2_LEVER: 'D-2 bunker power',
    '00453': 'D-2 gate button',
    autoId_00632_EXFIL: 'Hermetic door lever',
    custom_DesignStuff_00034: 'Warehouse power (ZB-013)',
    outside_buffer_trigger: 'Lighthouse gate entrance control',
    inner_buffer_trigger: 'Lighthouse gate exit control',
}

const laboratoryNames: Record<string, string> = {
    autoId_00007_EXFIL: 'Cargo elevator power',
    '00402': 'Cargo elevator call button',
    '00403': 'Cargo elevator floor button',
    '00404': 'Main elevator power',
    '00405': 'Main elevator call button',
    '00408': 'Main elevator floor button',
    '00409': 'Medical elevator power',
    '00410': 'Medical elevator call button',
    '00412': 'Medical elevator floor button',
    '00415': 'Sewage pump button',
    '00418': 'Parking alarm control',
    autoId_00014_EXFIL: 'Parking gate button',
    // This ID also identifies the Hermetic door lever on Reserve.
    autoId_00632_EXFIL: 'Hangar gate button',
}

export function switchName(event: SwitchState, location = ''): string {
    const map = location.trim().toLowerCase()
    const labels = (locationAliases[map] || map) === 'laboratory' ? laboratoryNames : names
    return labels[event.switchId] || event.name || event.switchId
}
export function switchAppearance(state: string): { label: string; color: string } {
    switch (state) {
        case 'Open': return { label: 'Activated', color: '#4ade80' }
        case 'Shut': return { label: 'Inactive', color: '#94a3b8' }
        case 'Locked': return { label: 'Locked', color: '#f87171' }
        case 'Interacting': return { label: 'Changing', color: '#fbbf24' }
        default: return { label: state || 'Unknown', color: '#c084fc' }
    }
}
