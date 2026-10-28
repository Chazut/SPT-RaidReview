// Ordered by perceptual separation (OKLab), reserving human gold and NPC role colors.
// The full raid roster assigns these to squads densely; raw EFT group IDs can be sparse.
export const PMC_COLORS = [
    '#4E9BFF', '#E094E0', '#9938FA', '#37BE64', '#06EFEF', '#D61F99',
    '#BE6437', '#94C0E0', '#B8D61F', '#A479FC', '#BE9C37', '#FC798F',
    '#37A7BE', '#6174D1', '#4CE699', '#CC4CE6', '#FA3879', '#1FD61F',
    '#E0A194', '#D161A2', '#FA38C9', '#FAA938', '#61D1BE', '#FC79FC',
    '#949BE0', '#D18661', '#06C8EF', '#B4E094', '#9961D1', '#EFC806',
    '#E6594C', '#9CBE37', '#D079FC', '#067AEF', '#37BE9C', '#79DBFC',
    '#FC79C5', '#3786BE', '#BE37BE', '#A1EF06', '#94E0CD', '#C806EF',
    '#D63D1F', '#61D161', '#7984FC', '#E094B4', '#66E64C', '#6199D1',
] as const

// Continue with golden-angle hues instead of wrapping back to the first squad's color.
export function squadColor(index: number): string {
    const n = Number.isFinite(index) ? Math.max(0, Math.floor(index)) : 0
    if (n < PMC_COLORS.length) return PMC_COLORS[n]
    const hue = ((n - PMC_COLORS.length) * 137.507764 + 27) % 360 / 60
    const light = [0.58, 0.70, 0.49][n % 3]
    const chroma = (1 - Math.abs(2 * light - 1)) * 0.72
    const x = chroma * (1 - Math.abs(hue % 2 - 1))
    const rgb = hue < 1 ? [chroma, x, 0] : hue < 2 ? [x, chroma, 0]
        : hue < 3 ? [0, chroma, x] : hue < 4 ? [0, x, chroma]
        : hue < 5 ? [x, 0, chroma] : [chroma, 0, x]
    return '#' + rgb.map(v => Math.round((v + light - chroma / 2) * 255).toString(16).padStart(2, '0')).join('').toUpperCase()
}
