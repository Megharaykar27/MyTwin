import { BookOpen, CircleHelp, Inbox as InboxIcon, LayoutDashboard, LogOut, MessagesSquare, Share2, UserRound } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Wordmark } from "../../components/Navbar.jsx";
import { FadeUp } from "../../components/ui.jsx";
import { api, errorText, token } from "../../lib/api.js";
import Conversations from "./Conversations.jsx";
import Inbox from "./Inbox.jsx";
import Knowledge from "./Knowledge.jsx";
import Login from "./Login.jsx";
import Overview from "./Overview.jsx";
import Profile from "./Profile.jsx";
import Share from "./Share.jsx";
import Unanswered from "./Unanswered.jsx";

const TABS = [
  ["overview", "Overview", LayoutDashboard, Overview],
  ["inbox", "Inbox", InboxIcon, Inbox],
  ["unanswered", "Unanswered", CircleHelp, Unanswered],
  ["conversations", "Conversations", MessagesSquare, Conversations],
  ["knowledge", "Knowledge", BookOpen, Knowledge],
  ["profile", "Profile", UserRound, Profile],
  ["share", "Share", Share2, Share],
];

export default function Dashboard() {
  const [logged, setLogged] = useState(!!token.get());
  const [overview, setOverview] = useState(null);
  const [error, setError] = useState("");
  const [params, setParams] = useSearchParams();
  const tab = TABS.find(([k]) => k === params.get("tab")) || TABS[0];
  const refresh = useCallback(() => api.get("/admin/overview").then(({ data }) => { setOverview(data); setError(""); }).catch((e) => setError(errorText(e))), []);

  useEffect(() => {
    const out = () => setLogged(false);
    window.addEventListener("mt-logout", out);
    return () => window.removeEventListener("mt-logout", out);
  }, []);
  useEffect(() => { if (logged) refresh(); }, [logged, tab[0], refresh]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!logged) return <Login onDone={() => setLogged(true)} />;
  const badge = { inbox: overview?.totals.unread_leads, unanswered: overview?.totals.unanswered };
  const open = (k, extra = {}) => setParams({ tab: k, ...extra });
  const Page = tab[3];

  return (
    <div className="mx-auto flex min-h-dvh max-w-[1400px] flex-col md:flex-row">
      <aside className="border-b border-line bg-white/70 backdrop-blur md:sticky md:top-0 md:flex md:h-dvh md:w-60 md:flex-col md:border-b-0 md:border-r">
        <div className="flex items-center justify-between px-5 pt-4 md:pb-4 md:pt-6">
          <Link to="/" aria-label="Open the public page" className="rounded-full"><Wordmark /></Link>
          <span className="rounded-full bg-lav-100 px-2 py-0.5 text-[11px] font-semibold text-lav-700">admin</span>
        </div>
        <nav aria-label="Admin" className="thin-scroll flex gap-1 overflow-x-auto px-3 py-3 md:flex-1 md:flex-col md:overflow-visible">
          {TABS.map(([k, name, Icon]) => (
            <button key={k} type="button" onClick={() => open(k)} aria-current={tab[0] === k ? "page" : undefined}
              className={`flex shrink-0 items-center gap-2.5 rounded-full px-3.5 py-2 text-sm font-medium transition ${tab[0] === k ? "bg-lav-100 text-lav-700" : "text-ink-soft hover:bg-lav-50 hover:text-ink"}`}>
              <Icon size={17} /> {name}
              {badge[k] > 0 && <span className="rounded-full bg-lav-600 px-1.5 py-0.5 text-[11px] font-semibold leading-none text-white md:ml-auto">{badge[k]}</span>}
            </button>
          ))}
          <button type="button" onClick={() => { token.clear(); setLogged(false); }} className="flex shrink-0 items-center gap-2.5 rounded-full px-3.5 py-2 text-sm text-ink-mute transition hover:text-ink md:mt-auto"><LogOut size={17} /> Log out</button>
        </nav>
      </aside>
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-8 sm:py-8">
        <FadeUp key={tab[0]}>
          <h1 className="mb-6 text-2xl font-bold tracking-tight">{tab[1]}</h1>
          {error && <p role="alert" className="mb-4 rounded-2xl bg-pink-50 p-3 text-sm text-pink-800">{error}</p>}
          <Page overview={overview} refresh={refresh} open={open} params={params} />
        </FadeUp>
      </main>
    </div>
  );
}
