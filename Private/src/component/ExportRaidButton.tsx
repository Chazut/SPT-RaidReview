import { useState } from 'react';
import { exportRaid } from '../api/raidArchives';

export default function ExportRaidButton({ raidId, finished }: { raidId: string; finished: boolean }) {
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState('');
    const [failed, setFailed] = useState(false);
    async function download() {
        setBusy(true); setMessage(''); setFailed(false);
        try {
            const warning = await exportRaid(raidId);
            setMessage(warning || 'Raid ZIP ready to share.');
        } catch (error) {
            setFailed(true);
            setMessage(error instanceof Error ? error.message : 'Could not export this raid.');
        } finally { setBusy(false); }
    }
    return <div>
        <button onClick={download} disabled={busy || !finished}
            title={finished ? 'Download this raid with its recorded positions and events' : 'Finish the raid before exporting it'}
            className="py-1 px-4 bg-eft text-black hover:opacity-75 disabled:opacity-50">
            {busy ? 'Exporting...' : 'Export raid'}
        </button>
        {message && <p role={failed ? 'alert' : 'status'} className="text-sm mt-2 max-w-sm">{message}</p>}
    </div>;
}
