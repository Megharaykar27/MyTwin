// Small shared pieces
import { motion } from "framer-motion";
import { Download, X } from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useRef, useState } from "react";

export const FadeUp = ({ children, delay = 0, className = "" }) => (
  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay }} className={className}>{children}</motion.div>
);

export const GitHubIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 .5A11.5 11.5 0 0 0 8.4 22.9c.6.1.8-.2.8-.6v-2c-3.2.7-3.9-1.5-3.9-1.5-.5-1.3-1.3-1.7-1.3-1.7-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.7 1.3 3.4 1 .1-.8.4-1.3.7-1.6-2.6-.3-5.2-1.3-5.2-5.7 0-1.3.4-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.2 1.2a11 11 0 0 1 5.8 0c2.2-1.5 3.2-1.2 3.2-1.2.6 1.6.2 2.8.1 3.1.7.8 1.2 1.8 1.2 3.1 0 4.4-2.7 5.4-5.3 5.7.4.4.8 1.1.8 2.2v3.1c0 .4.2.7.8.6A11.5 11.5 0 0 0 12 .5Z" /></svg>
);
export const LinkedInIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.4 2H3.6C2.7 2 2 2.7 2 3.6v16.8c0 .9.7 1.6 1.6 1.6h16.8c.9 0 1.6-.7 1.6-1.6V3.6c0-.9-.7-1.6-1.6-1.6ZM8 19H5V9.5h3V19ZM6.500 8.2a1.75 1.75 0 1 1 0-3.5 1.75 1.75 0 0 1 0 3.5ZM19 19h-3v-4.600c0-1.200 0-2.700-1.600-2.700s-1.900 1.300-1.900 2.600V19h-3V9.500h2.900v1.300c.4-.8 1.400-1.600 2.900-1.600 3.100 0 3.700 2 3.700 4.700V19Z" /></svg>
);

export function Modal({ title, onClose, children, wide = false }) {
  const box = useRef(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const before = document.activeElement;
    const key = (e) => e.key === "Escape" && close.current();
    document.addEventListener("keydown", key);
    (box.current?.querySelector("input, textarea") || box.current)?.focus();
    return () => { document.removeEventListener("keydown", key); before?.focus?.(); };
  }, []);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 p-4 backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <motion.div ref={box} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        className={`card thin-scroll max-h-[88vh] w-full overflow-y-auto p-6 ${wide ? "max-w-2xl" : "max-w-md"}`}>
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
        {children}
      </motion.div>
    </div>
  );
}

export function QrCode({ url, size = 220 }) {
  const [src, setSrc] = useState("");
  useEffect(() => { QRCode.toDataURL(url, { width: 640, margin: 2, color: { dark: "#16141F", light: "#FFFFFF" } }).then(setSrc).catch(() => setSrc("")); }, [url]);
  if (!src) return null;
  return (
    <div className="flex flex-col items-center gap-4">
      <img src={src} alt={`QR code for ${url}`} width={size} height={size} className="rounded-2xl border border-line" />
      <a className="btn-ghost" href={src} download="mytwin-qr.png"><Download size={15} /> Download PNG</a>
    </div>
  );
}

// An input that turns typed words into chips (Enter or comma adds one)
export function ChipInput({ id, value = [], onChange, max = 80, placeholder = "Type and press Enter" }) {
  const [text, setText] = useState("");
  const add = () => {
    const t = text.trim();
    if (t && !value.includes(t) && value.length < max) onChange([...value, t]);
    setText("");
  };
  return (
    <div className="flex flex-wrap gap-1.5 rounded-2xl border border-line bg-white p-2">
      {value.map((v) => (
        <span key={v} className="inline-flex items-center gap-1 rounded-full bg-lav-50 py-1 pl-3 pr-1 text-xs font-medium text-lav-700">
          {v}
          <button type="button" className="rounded-full p-0.5 hover:bg-lav-200" aria-label={`Remove ${v}`} onClick={() => onChange(value.filter((x) => x !== v))}><X size={12} /></button>
        </span>
      ))}
      <input id={id} value={text} onChange={(e) => setText(e.target.value)} onBlur={add} placeholder={value.length >= max ? "Full" : placeholder} disabled={value.length >= max}
        onKeyDown={(e) => { if (e.key === "Enter" || (e.key === "," && max > 10)) { e.preventDefault(); add(); } }}
        className="min-w-[9rem] flex-1 rounded-full bg-transparent px-2 py-1 text-sm placeholder:text-ink-mute" />
    </div>
  );
}

export const Empty = ({ children }) => <p className="rounded-2xl border border-dashed border-line p-8 text-center text-sm text-ink-mute">{children}</p>;
