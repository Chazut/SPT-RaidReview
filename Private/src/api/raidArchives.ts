const host = window.location.host.includes('5173') ? 'http://127.0.0.1:7829' : '';
export const maxRaidArchiveBytes = 512 * 1024 * 1024;

async function requireSuccess(response: Response) {
    if (response.ok) return;
    const data = await response.json().catch(() => null);
    throw new Error(data?.error || `Raid transfer failed (${response.status}).`);
}

export async function exportRaid(raidId: string): Promise<string | null> {
    const response = await fetch(`${host}/api/raids/${encodeURIComponent(raidId)}/export`);
    await requireSuccess(response);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `RR-raid-${raidId}.zip`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
    return response.headers.get('X-RR-Warning');
}

export async function importRaid(file: File): Promise<{ raidId: string; alreadyExists: boolean; warning: string | null }> {
    if (file.size > maxRaidArchiveBytes) throw new Error('Raid archives must be 512 MB or smaller.');
    if (file.size === 0) throw new Error('This file is empty.');
    const response = await fetch(`${host}/api/raids/import`, {
        method: 'POST', headers: { 'Content-Type': 'application/zip' }, body: file
    });
    await requireSuccess(response);
    return response.json();
}
