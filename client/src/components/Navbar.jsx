import { Link, NavLink } from "react-router-dom";
import Orb from "./Orb.jsx";

export const Wordmark = ({ size = 26 }) => (
  <span className="inline-flex items-center gap-2">
    <Orb size={size} />
    <span className="text-lg font-bold tracking-tight">MyTwin<span style={{ color: "var(--accent)" }}>.</span></span>
  </span>
);

const link = ({ isActive }) => `rounded-full px-3 py-1.5 text-sm font-medium transition ${isActive ? "bg-lav-100 text-lav-700" : "text-ink-soft hover:text-ink"}`;

export default function Navbar() {
  return (
    <header className="sticky top-0 z-30 border-b border-line/70 bg-canvas/80 backdrop-blur">
      <nav className="mx-auto flex h-16 max-w-7xl items-center gap-1 px-4 sm:px-6" aria-label="Main">
        <Link to="/" className="mr-2 rounded-full sm:mr-4" aria-label="MyTwin home"><Wordmark /></Link>
        <NavLink to="/" end className={link}>Chat</NavLink>
        <NavLink to="/fit" className={link}>Job fit</NavLink>
        <Link to="/admin" className="ml-auto rounded-full px-2 py-1.5 text-sm text-ink-mute transition hover:text-ink">Admin</Link>
      </nav>
    </header>
  );
}
