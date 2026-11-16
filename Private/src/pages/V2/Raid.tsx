import { NavLink, Outlet, useLoaderData, useLocation } from "react-router-dom";
import { useEffect, useRef } from "react";

import api from "../../api/api";
import ExportRaidButton from "../../component/ExportRaidButton";

import './Raid.css'

export async function loader(loaderData: any) {

    const raidId = loaderData.params.raidId as string;
    let raid = await api.getRaid(raidId);
    const intl = await api.getIntl();

    return { raidId, raid, intl }
}

const TAB_CLASS = 'raid-tab py-1 px-4 bg-eft text-black hover:opacity-75';

export default function Raid() {

  const { raidId, raid, intl } = useLoaderData() as any;
  const location = useLocation();
  const tabsRef = useRef<HTMLDivElement>(null);

  // On phones the tab strip scrolls horizontally: keep the current tab in view.
  useEffect(() => {
    const strip = tabsRef.current;
    const active = strip?.querySelector<HTMLElement>('.raid-tab.active');
    if (!strip || !active || strip.scrollWidth <= strip.clientWidth) return;
    strip.scrollLeft = active.offsetLeft - (strip.clientWidth - active.offsetWidth) / 2;
  }, [location.pathname]);

  return (
    <>
      <div className='raid-tabs flex justify-between my-2'>
          <div ref={tabsRef} className="raid-tabs-strip flex gap-2" role="navigation" aria-label="Raid sections">
              <NavLink end to={`/raid/${raidId}/`} className={TAB_CLASS}>Overview</NavLink>
              <NavLink to={`/raid/${raidId}/charts`} className={TAB_CLASS}>Stats</NavLink>
              <NavLink to={`/raid/${raidId}/timeline`} className={TAB_CLASS}>Timeline</NavLink>
              <NavLink to={`/raid/${raidId}/map`} className={TAB_CLASS}>Map</NavLink>
              <NavLink to={`/raid/${raidId}/behavior`} className={TAB_CLASS}>Behavior</NavLink>
          </div>
          <div className="raid-tabs-actions flex gap-2">
              <ExportRaidButton raidId={raidId} finished={!!raid?.exitStatus} />
              <NavLink to={`/raid/${raidId}/settings`} className={TAB_CLASS}>Settings</NavLink>
          </div>
      </div>

      <section>
        <Outlet context={{ raid, intl }} />
      </section>
    </>
  )
}
