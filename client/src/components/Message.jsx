import { motion } from "framer-motion";
import { Check, Copy, Square, ThumbsDown, ThumbsUp, Volume2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api.js";
import { canSpeak, speak, stopSpeaking } from "../lib/voice.js";
import LeadForm from "./LeadForm.jsx";
import Orb from "./Orb.jsx";
import ProjectCard from "./ProjectCard.jsx";
import SourceChips from "./SourceChips.jsx";

// Text with **bold**, links and [n] source numbers
function Inline({ text, sources, onSource }) {
  return text.split(/(\*\*[^*]+\*\*|\[\d+(?:\s*,\s*\d+)*\]|https?:\/\/[^\s)]+|[\w.+-]+@[\w-]+\.[\w.]*\w)/g).map((part, i) => {
    if (/^\*\*/.test(part)) return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
    if (/^\[\d/.test(part)) {
      return part.match(/\d+/g).map((d) => {
        const s = sources.find((x) => x.n === Number(d));
        return s ? <button key={`${i}-${d}`} type="button" onClick={() => onSource(s)} aria-label={`Source ${d}: ${s.title}, ${s.heading}`}
          className="mx-0.5 inline-flex h-4 min-w-4 -translate-y-1 items-center justify-center rounded-full bg-lav-100 px-1 text-[10px] font-semibold leading-none text-lav-700 transition hover:bg-lav-200">{d}</button> : null;
      });
    }
    if (/^https?:/.test(part)) return <a key={i} href={part} target="_blank" rel="noreferrer" className="break-all text-lav-700 underline decoration-lav-300 underline-offset-2">{part.replace(/^https?:\/\/(www\.)?/, "")}</a>;
    if (/^[\w.+-]+@/.test(part)) return <a key={i} href={`mailto:${part}`} className="break-all text-lav-700 underline decoration-lav-300 underline-offset-2">{part}</a>;
    return part;
  });
}

function Body({ text, sources, onSource }) {
  const blocks = [];
  for (const line of text.split("\n")) {
    const li = line.match(/^\s*[-*•]\s+(.*)/);
    if (li) { if (blocks.at(-1)?.list) blocks.at(-1).list.push(li[1]); else blocks.push({ list: [li[1]] }); }
    else if (line.trim()) blocks.push({ p: line });
  }
  return (
    <div className="space-y-2">
      {blocks.map((b, i) => b.list
        ? <ul key={i} className="space-y-1">{b.list.map((t, j) => <li key={j} className="flex gap-2"><span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-lav-400" /><span className="min-w-0"><Inline text={t} sources={sources} onSource={onSource} /></span></li>)}</ul>
        : <p key={i}><Inline text={b.p} sources={sources} onSource={onSource} /></p>)}
    </div>
  );
}

export default function Message({ m, question, convId, visitor, firstName, live = false }) {
  const [open, setOpen] = useState(null);
  const [copied, setCopied] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [vote, setVote] = useState(m.feedback || 0);
  const pop = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const away = (e) => { if (e.key === "Escape" || (e.type === "mousedown" && !pop.current?.contains(e.target))) setOpen(null); };
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", away);
    return () => { document.removeEventListener("mousedown", away); document.removeEventListener("keydown", away); };
  }, [open]);
  useEffect(() => () => { if (speaking) stopSpeaking(); }, [speaking]);

  if (m.role === "user") {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-end">
        <p className="max-w-[85%] whitespace-pre-wrap break-words rounded-3xl rounded-br-lg bg-lav-600 px-4 py-2.5 text-sm leading-relaxed text-white">{m.text}</p>
      </motion.div>
    );
  }

  const sources = m.sources || [];
  const copy = async () => {
    try { await navigator.clipboard.writeText(m.text.replace(/\s?\[\d+(?:\s*,\s*\d+)*\]/g, "").replace(/\*\*/g, "")); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* clipboard blocked */ }
  };
  const rate = (value) => { setVote(value); api.post(`/chat/messages/${m.id}/feedback`, { value }).catch(() => setVote(0)); };
  const listenTo = () => { if (speaking) { stopSpeaking(); setSpeaking(false); } else { setSpeaking(true); speak(m.text, () => setSpeaking(false)); } };
  const act = (on) => `icon-btn h-7 w-7 ${on ? "bg-lav-100 text-lav-700" : ""}`;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2.5">
      <Orb size={28} state={live ? (m.text ? "speaking" : "thinking") : speaking ? "speaking" : "idle"} className="mt-1" />
      <div className="min-w-0 max-w-[88%] flex-1 space-y-2">
        <div className="relative w-fit max-w-full">
          <div className="break-words rounded-3xl rounded-tl-lg border border-line bg-white px-4 py-2.5 text-sm leading-relaxed shadow-soft" aria-live={live ? "polite" : undefined}>
            {m.text ? <Body text={m.text} sources={sources} onSource={setOpen} /> : <span className="dot-typing flex items-center gap-1 py-1.5" role="status" aria-label="The twin is thinking"><span /><span /><span /></span>}
          </div>
          {open && (
            <div ref={pop} role="dialog" aria-label="Source" className="absolute left-2 top-full z-20 mt-1 w-72 max-w-[calc(100vw-5rem)] rounded-2xl border border-line bg-white p-3 text-xs shadow-soft">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold">{open.title} <span className="text-ink-mute">›</span> {open.heading}</p>
                <button type="button" className="rounded-full p-0.5 text-ink-mute hover:text-ink" aria-label="Close source" onClick={() => setOpen(null)}><X size={13} /></button>
              </div>
              <p className="mt-1 leading-relaxed text-ink-soft">{open.snippet}</p>
              {open.url && <a className="mt-1.5 inline-block font-medium text-lav-700 underline" href={open.url} target="_blank" rel="noreferrer">Open on GitHub</a>}
            </div>
          )}
        </div>
        {!live && m.id && (
          <>
            <SourceChips sources={sources} />
            {m.projects?.length > 0 && <div className="grid max-w-md grid-cols-1 gap-2">{m.projects.map((p) => <ProjectCard key={p.slug} project={p} mini />)}</div>}
            {m.unanswered && (
              <div className="max-w-md rounded-3xl border border-lav-200 bg-lav-50 p-4">
                <p className="mb-3 text-sm font-semibold text-lav-700">Leave {firstName} a message</p>
                <LeadForm firstName={firstName} convId={convId} visitor={visitor} message={question || ""} compact />
              </div>
            )}
            {m.id !== "welcome" && (
              <div className="flex items-center gap-0.5">
                <button type="button" className={act(vote === 1)} aria-label="Helpful" aria-pressed={vote === 1} onClick={() => rate(1)}><ThumbsUp size={14} /></button>
                <button type="button" className={act(vote === -1)} aria-label="Not helpful" aria-pressed={vote === -1} onClick={() => rate(-1)}><ThumbsDown size={14} /></button>
                <button type="button" className={act(copied)} aria-label="Copy answer" onClick={copy}>{copied ? <Check size={14} /> : <Copy size={14} />}</button>
                {canSpeak && <button type="button" className={`${act(speaking)} w-auto gap-1 px-2 text-xs`} onClick={listenTo}>{speaking ? <><Square size={12} /> Stop</> : <><Volume2 size={14} /> Listen</>}</button>}
              </div>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
}
