import { Suspense, createContext, lazy, useCallback, useContext, useEffect, useState } from "react";
import { Link, Route, Routes, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import Orb from "./components/Orb.jsx";
import { api, errorText } from "./lib/api.js";
import Embed from "./pages/Embed.jsx";
import Fit from "./pages/Fit.jsx";
import Home from "./pages/Home.jsx";

const Admin = lazy(() => import("./pages/admin/Dashboard.jsx"));

const ProfileContext = createContext(null);
export const useProfile = () => useContext(ProfileContext);

const Center = ({ children }) => <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-6 text-center">{children}</div>;

export default function App() {
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");
  const { pathname } = useLocation();
  const load = useCallback(() => {
    setError("");
    return api.get("/public/profile").then(({ data }) => {
      setProfile(data);
      document.documentElement.style.setProperty("--accent", data.accent || "#7C5CFF");
    }).catch((e) => setError(errorText(e)));
  }, []);
  useEffect(() => { load(); }, [load]);

  const bare = pathname.startsWith("/embed") || pathname.startsWith("/admin");
  if (!profile) {
    return (
      <>
        <div className="studio-bg" />
        <Center>
          <Orb size={72} state={error ? "idle" : "thinking"} />
          {error ? <><p className="text-sm text-ink-soft">{error}</p><button className="btn-primary" onClick={load}>Try again</button></> : <p className="text-sm text-ink-mute">Waking up the twin...</p>}
        </Center>
      </>
    );
  }
  return (
    <ProfileContext.Provider value={{ profile, reload: load }}>
      <div className="studio-bg" />
      {!bare && <Navbar />}
      <Suspense fallback={<Center><Orb size={56} state="thinking" /></Center>}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/fit" element={<Fit />} />
          <Route path="/embed" element={<Embed />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="*" element={<Center><Orb size={72} /><p className="text-ink-soft">This page doesn't exist.</p><Link className="btn-primary" to="/">Back to the twin</Link></Center>} />
        </Routes>
      </Suspense>
    </ProfileContext.Provider>
  );
}
