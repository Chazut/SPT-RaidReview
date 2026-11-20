import { Link, Outlet, useNavigation } from "react-router-dom";

import GlobalSpinner from "../../component/GlobalSpinner";

import './Layout.css'

export default function Home() {
    const navigation = useNavigation();

    return (
        <main className="text-eft font-mono relative mb-4">
            { navigation.state === "loading" && <GlobalSpinner /> }

            <nav className="bg-eft border border-eft border-t-0 flex">
                <div>
                    <h1 className="font-bold text-2xl bg-black py-2 px-4 w-fit max-md:text-xl max-md:px-3 max-md:whitespace-nowrap">RAID REVIEW</h1>
                </div>
                <ul className="text-black ml-4 max-md:ml-0">
                    <li className="text-base h-full hover:bg-black/20">
                        <Link className="h-full w-full grid place-items-center px-4 underline max-md:px-3 max-md:whitespace-nowrap" to="/">Recent Raids</Link>
                    </li>
                </ul>
            </nav>

            <div>

            </div>

            <div className="max-md:px-2">
                <Outlet />
            </div>

            <div className="text-xs text-center mt-4">
                Need help? Found a bug?<br />Join the <a target="_blank" className="underline" href="https://discord.gg/5AyDs66h8S">Discord</a>.
            </div>
        </main>
    )
}
