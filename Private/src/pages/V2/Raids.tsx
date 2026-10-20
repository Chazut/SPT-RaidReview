
import { Link, useLoaderData, useNavigate } from 'react-router-dom';
import { useRef, useState } from 'react';
import { importRaid } from '../../api/raidArchives';

import { TrackingRaidData, ISptProfile } from '../../types/api_types';
import api from '../../api/api';
import { getLocationLabel } from '../../helpers/locations';

import './Raids.css'
import { msToHMS } from '../../helpers';

const raidDateFormatter = new Intl.DateTimeFormat(undefined, {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
});

function formatRaidDate(time: string) {
    const date = new Date(time);
    return time && Number.isFinite(date.getTime()) ? raidDateFormatter.format(date) : 'Unknown';
}

export async function loader() {
    let raids = await api.getRaids([]);
    let profiles = await api.getProfiles();

    return { raids, profiles }
}

export default function Raids() {
    const { raids, profiles } = useLoaderData() as { raids: TrackingRaidData[], profiles: { [key: string] : ISptProfile } };
    const navigate = useNavigate()
    const fileInput = useRef<HTMLInputElement>(null);
    const [importing, setImporting] = useState(false);
    const [notice, setNotice] = useState('');
    const [error, setError] = useState('');
    const [importedRaid, setImportedRaid] = useState('');

    async function loadArchive(file: File) {
        setImporting(true); setNotice(''); setError(''); setImportedRaid('');
        try {
            const result = await importRaid(file);
            setNotice(result.alreadyExists ? 'This raid is already in your library.'
                : `Raid imported.${result.warning ? ' ' + result.warning : ''}`);
            setImportedRaid(result.raidId);
            refreshData();
        } catch (failure) {
            setError(failure instanceof Error ? failure.message : 'Could not import this raid.');
        } finally { setImporting(false); }
    }

    function refreshData() {
        navigate('.', { replace: true })
    }

    return (
        <>

            <div className='flex justify-between my-2'>
                <div className="flex gap-2">
                    {/* <button className='py-1 px-4 bg-eft text-black hover:opacity-75'>Filters</button> */}
                </div>
                <div className="flex gap-2">
                    <button onClick={refreshData} className='py-1 px-4 bg-eft text-black hover:opacity-75'>Refresh</button>
                    <input ref={fileInput} type="file" accept=".zip,application/zip" hidden
                        aria-label="Raid Review export ZIP"
                        onChange={event => {
                            const file = event.target.files?.[0];
                            event.target.value = '';
                            if (file) void loadArchive(file);
                        }} />
                    <button disabled={importing} onClick={() => fileInput.current?.click()}
                        className='py-1 px-4 bg-eft text-black hover:opacity-75 disabled:opacity-50'>
                        {importing ? 'Importing...' : 'Import raid'}
                    </button>
                </div>
            </div>
            {importing && <p role="status">Uploading and checking the raid. Large recordings may take a moment.</p>}
            {error && <p role="alert" className="text-rose-400 my-2">{error}</p>}
            {notice && <p role="status" className="my-2">{notice} {importedRaid &&
                <Link className="underline" to={`/raid/${importedRaid}`}>Open raid</Link>}</p>}

            <table id="raid-table" className="mt-2 w-full border border-eft">
                <thead>
                    <tr className="bg-eft text-black">
                        <th className="text-left px-2">Profile</th>
                        <th className="text-left px-2">Type</th>
                        <th className="text-left px-2">Map</th>
                        <th className="text-left px-2">Status</th>
                        <th className="text-left px-2">Time In Raid</th>
                        <th className="text-left px-2">Date &amp; time</th>
                        <th className="text-left px-2">Action</th>
                    </tr>
                </thead>
                <tbody>
                    {
                        raids.length > 0 ? raids.map((r) => (
                        <tr key={r.raidId}>
                            <td className="text-left p-2" title={r.isHeadless ? 'Recorded by the headless host' : undefined}>
                                { r.profileName || profiles[r.profileId]?.info?.username || r.profileId?.substring(0, 8) + '...' }
                                {r.importedAt && <span className="ml-2 text-xs opacity-70">Imported</span>}
                            </td>
                            <td className="text-left p-2">{ r.type }</td>
                            <td className="text-left p-2">{ getLocationLabel(r.location, r.locationVariant) }</td>
                            <td className="text-left p-2">{ r.exitStatus }</td>
                            <td className="text-left p-2">{ msToHMS(Number(r.timeInRaid)) }</td>
                            <td className="text-left p-2">{ formatRaidDate(r.time) }</td>
                            <td className="text-left p-2 underline">
                                <Link to={`/raid/${r.raidId}`}>View</Link>
                            </td>
                        </tr>
                    )) : <tr>
                        <td colSpan={7}> No Data...</td>
                    </tr>
                    }
                </tbody>
            </table>

            <div className='text-center my-2'>Showing { raids.length } Raids</div>
        </>
    );
}
