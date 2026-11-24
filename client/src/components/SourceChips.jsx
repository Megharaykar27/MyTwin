import { FileText, MessageCircleQuestion, StickyNote } from "lucide-react";
import { GitHubIcon } from "./ui.jsx";

const ICON = { resume: FileText, note: StickyNote, qa: MessageCircleQuestion };
const label = (s) => (s.source === "github" ? `${s.title} README` : s.source === "qa" ? "Megha's answer" : s.title);

// "From: Resume · NeuroCheck README"
export default function SourceChips({ sources }) {
  const unique = [...new Map(sources.map((s) => [label(s), s])).entries()];
  if (!unique.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-xs text-ink-mute">
      <span>From:</span>
      {unique.map(([name, s]) => {
        const Icon = s.source === "github" ? GitHubIcon : ICON[s.source] || FileText;
        const body = <><Icon size={12} /> {name}</>;
        const cls = "inline-flex items-center gap-1 rounded-full border border-line bg-white px-2 py-0.5 font-medium text-ink-soft";
        return s.url ? <a key={name} href={s.url} target="_blank" rel="noreferrer" className={`${cls} hover:border-lav-300 hover:text-lav-700`}>{body}</a> : <span key={name} className={cls}>{body}</span>;
      })}
    </div>
  );
}
