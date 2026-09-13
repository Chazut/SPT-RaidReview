export const LOCATIONS: { [key: string]: string } = {
    "bigmap": "Customs",
    "Sandbox": "Ground Zero",
    "Sandbox_high": "Ground Zero",
    "develop": "Ground Zero",
    "factory4_day": "Factory",
    "factory4_night": "Factory",
    "hideout": "Hideout",
    "Interchange": "Interchange",
    "laboratory": "Laboratory",
    "Lighthouse": "Lighthouse",
    "privatearea": "Private Area",
    "RezervBase": "Reserve",
    "Shoreline": "Shoreline",
    "suburbs": "Suburbs",
    "TarkovStreets": "Streets",
    "terminal": "Terminal",
    "town": "Town",
    "Woods": "Woods",
    "base": "Base"
};

// Map reworks that keep BSG's location id (Interchange Rework, Lighthouse 1.0 backport) report a
// variant suffix; the label and the render key carry it, everything else stays keyed on the id.
export const LOCATION_VARIANT_LABELS: { [key: string]: string } = {
    "rework": "1.0 rework",
};

export function getLocationLabel(location: string, variant?: string | null): string {
    const base = LOCATIONS[location] || location;
    if (!variant) return base;
    return `${base} (${LOCATION_VARIANT_LABELS[variant] || variant})`;
}
