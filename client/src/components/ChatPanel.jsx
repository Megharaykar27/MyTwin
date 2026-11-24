import { ArrowUp, ExternalLink, Mail, Mic, RotateCcw, Square } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useProfile } from "../App.jsx";
import { api, errorText, store } from "../lib/api.js";
import { streamChat } from "../lib/stream.js";
import { canListen, listen, stopSpeaking } from "../lib/voice.js";
import LeadForm from "./LeadForm.jsx";
import Message from "./Message.jsx";
import Orb from "./Orb.jsx";
import { Modal } from "./ui.jsx";

export default function ChatPanel({ source = "web", prefill = "", className = "" }) {
  const { profile } = useProfile();
  const first = profile.first_name || profile.name;
  const ai = profile.ai_name || "Miu";
  const KEY = `mt_conv_${source}`, ASKED = `mt_visitor_${source}`;
  const [convId, setConvId] = useState(() => store.get(KEY));
  const [visitor, setVisitor] = useState({ name: "", company: "", role: "" });
  const [askWho, setAskWho] = useState(() => !store.get(KEY) && !store.get(ASKED));
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState(prefill);
  const [live, setLive] = useState(null); // the answer being written
  const [leadOpen, setLeadOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const scroller = useRef(null), stick = useRef(true), abort = useRef(null), stopMic = useRef(null), input = useRef(null), conv = useRef(convId);
  const busy = live !== null;

  // Reload a saved chat
  useEffect(() => {
    if (!conv.current) return;
    api.get(`/chat/${conv.current}`).then(({ data }) => { setMessages(data.messages); setVisitor((v) => ({ ...v, ...data.visitor })); })
      .catch((e) => { if (e.response?.status === 404) { store.del(KEY); conv.current = null; setConvId(null); } });
  }, [KEY]);
  useEffect(() => () => { abort.current?.abort(); stopMic.current?.(); stopSpeaking(); }, []);

  // Follow the newest text, unless the reader scrolled up
  useEffect(() => { const el = scroller.current; if (el && stick.current && (messages.length || live !== null)) el.scrollTop = el.scrollHeight; }, [messages, live]);
  const onScroll = () => { const el = scroller.current; stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60; };
  useEffect(() => { const el = input.current; if (el) { el.style.height = "auto"; el.style.height = `${Math.min(el.scrollHeight, 132)}px`; } }, [text]);

  const closeWho = () => { setAskWho(false); store.set(ASKED, "1"); };

  const send = useCallback(async (raw) => {
    const q = raw.replace(/\s+/g, " ").trim().slice(0, 600);
    if (!q || busy) return;
    stopMic.current?.();
    stick.current = true;
    setText("");
    closeWho();
    setMessages((m) => [...m, { id: `u${Date.now()}`, role: "user", text: q }]);
    setLive("");
    const fail = (message) => { if (message) toast.error(message); setLive(null); };
    try {
      if (!conv.current) {
        const { data } = await api.post("/chat", { visitor, source });
        conv.current = data.id;
        setConvId(data.id);
        store.set(KEY, data.id);
      }
    } catch (e) { setText(q); setMessages((m) => m.slice(0, -1)); return fail(errorText(e)); }
    abort.current = new AbortController();
    let soFar = "";
    await streamChat(conv.current, q, {
      signal: abort.current.signal,
      onDelta: (t) => { soFar += t; setLive(soFar); },
      onDone: (d) => { setMessages((m) => [...m, { ...d, role: "twin", question: q }]); setLive(null); },
      onError: (e) => {
        if (soFar) setMessages((m) => [...m, { role: "twin", text: soFar, stopped: true }]);
        else if (!e.aborted) { setMessages((m) => m.slice(0, -1)); setText(q); }
        if (e.status === 404) { store.del(KEY); conv.current = null; setConvId(null); }
        fail(e.aborted ? "" : e.message);
      },
    });
    input.current?.focus({ preventScroll: true });
  }, [busy, visitor, source, KEY]); // eslint-disable-line react-hooks/exhaustive-deps

  const newChat = () => {
    abort.current?.abort();
    stopSpeaking();
    store.del(KEY);
    conv.current = null;
    setConvId(null);
    setMessages([]);
    setLive(null);
    setText("");
  };

  const mic = () => {
    if (recording) return stopMic.current?.();
    const before = text ? `${text} ` : "";
    setRecording(true);
    stopMic.current = listen({
      onText: (t) => setText((before + t).slice(0, 600)),
      onEnd: () => { setRecording(false); stopMic.current = null; },
      onError: (e) => { if (e === "not-allowed") toast.error("Please allow the microphone to use voice."); },
    });
  };

  const questionFor = (i) => { for (let j = i - 1; j >= 0; j--) if (messages[j].role === "user") return messages[j].text; return ""; };
  const welcome = { id: "welcome", role: "twin", text: profile.intro, sources: [], projects: [] };

  return (
    <section aria-label={`Chat with ${ai}, ${first}'s twin AI`} className={`flex min-h-0 flex-col overflow-hidden bg-white/80 backdrop-blur ${source === "widget" ? "" : "card"} ${className}`}>
      <header className={`flex items-center gap-2.5 border-b border-line px-4 py-3 ${source === "widget" ? "pr-14" : ""}`}>
        <Orb size={34} state={busy ? (live ? "speaking" : "thinking") : "idle"} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{ai}</p>
          <p className="flex items-center gap-1.5 text-xs text-ink-mute">
            <span className="truncate">{first}'s twin AI</span>
            {profile.ai === "basic"
              ? <span tabIndex={0} title="Answers come straight from Megha's notes. Add a Gemini key for natural replies." className="hidden shrink-0 rounded-full bg-lav-50 px-2 py-0.5 font-medium text-lav-700 sm:inline">Basic mode</span>
              : <span>· {busy ? "writing..." : "online"}</span>}
          </p>
        </div>
        {source === "widget" && <a className="icon-btn" href="/" target="_blank" rel="noreferrer" aria-label="Open the full page" title="Open the full page"><ExternalLink size={16} /></a>}
        <button type="button" className="icon-btn" onClick={newChat} aria-label="New chat" title="New chat"><RotateCcw size={16} /></button>
        <button type="button" className="btn-ghost px-3 py-1.5 text-xs" onClick={() => setLeadOpen(true)}><Mail size={14} /> <span className={source === "widget" ? "sr-only" : ""}>Message {first}</span></button>
      </header>

      <div ref={scroller} onScroll={onScroll} className="thin-scroll min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-5" tabIndex={0} aria-label="Messages">
        <Message m={welcome} firstName={first} />
        {messages.length === 0 && !busy && (
          <div className="space-y-4 pl-[38px]">
            <div className="flex flex-wrap gap-2">
              {(profile.suggested || []).map((s) => <button key={s} type="button" onClick={() => send(s)} className="rounded-full border border-lav-200 bg-lav-50 px-3 py-1.5 text-left text-xs font-medium text-lav-700 transition hover:border-lav-400 hover:bg-lav-100">{s}</button>)}
            </div>
            {askWho && (
              <form className="max-w-md rounded-3xl border border-line bg-white p-4" onSubmit={(e) => { e.preventDefault(); closeWho(); input.current?.focus(); }}>
                <p className="text-sm font-semibold">Who's asking? <span className="font-normal text-ink-mute">(optional)</span></p>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  {["name", "company", "role"].map((k) => <input key={k} aria-label={`Your ${k}`} placeholder={k[0].toUpperCase() + k.slice(1)} maxLength={80} className="input px-3 py-2" value={visitor[k]} onChange={(e) => setVisitor({ ...visitor, [k]: e.target.value })} />)}
                </div>
                <div className="mt-3 flex gap-2"><button className="btn-primary px-3 py-1.5 text-xs">Save</button><button type="button" className="btn px-3 py-1.5 text-xs text-ink-soft hover:text-ink" onClick={() => { setVisitor({ name: "", company: "", role: "" }); closeWho(); }}>Skip</button></div>
              </form>
            )}
          </div>
        )}
        {messages.map((m, i) => <Message key={m.id || i} m={m} question={m.question || questionFor(i)} convId={convId} visitor={visitor} firstName={first} />)}
        {busy && <Message m={{ role: "twin", text: live.replace(/\[\d*(?:,\s*\d*)*$/, "") }} live firstName={first} />}
      </div>

      <form className="border-t border-line bg-white p-3" onSubmit={(e) => { e.preventDefault(); send(text); }}>
        <div className="flex items-end gap-1.5 rounded-3xl border border-line bg-canvas p-1.5 transition focus-within:border-lav-300 focus-within:ring-2 focus-within:ring-lav-200">
          <textarea ref={input} rows={1} value={text} maxLength={600} aria-label="Your question" placeholder={`Ask ${ai} about ${first}...`} onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(text); } }}
            className="max-h-[132px] min-w-0 flex-1 resize-none bg-transparent px-3 py-2 text-sm leading-relaxed placeholder:text-ink-mute focus-visible:ring-0" />
          {canListen && <button type="button" onClick={mic} aria-label={recording ? "Stop recording" : "Speak your question"} aria-pressed={recording} className={`icon-btn h-9 w-9 ${recording ? "animate-pulse bg-blush/40 text-pink-700" : ""}`}><Mic size={17} /></button>}
          {busy
            ? <button type="button" onClick={() => abort.current?.abort()} className="btn h-9 bg-ink px-3 py-0 text-xs text-white hover:bg-ink/80"><Square size={11} fill="currentColor" /> Stop</button>
            : <button type="submit" disabled={!text.trim()} aria-label="Send" className="btn h-9 w-9 bg-lav-600 p-0 text-white hover:bg-lav-700"><ArrowUp size={17} /></button>}
        </div>
      </form>

      {leadOpen && <Modal title={`Message ${first}`} onClose={() => setLeadOpen(false)}><LeadForm firstName={first} convId={convId} visitor={visitor} /></Modal>}
    </section>
  );
}
