import { Copy } from "lucide-react";
import toast from "react-hot-toast";
import { QrCode } from "../../components/ui.jsx";
import { API_URL } from "../../lib/api.js";

export default function Share() {
  const app = window.location.origin;
  const snippet = `<script src="${API_URL}/widget.js" data-app="${app}" defer></script>`;
  const copy = async (text) => { try { await navigator.clipboard.writeText(text); toast.success("Copied"); } catch { toast.error("Couldn't copy. Select the text instead."); } };
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_400px]">
      <div className="space-y-5">
        <section className="card p-5">
          <h2 className="mb-3 text-sm font-semibold">Public link</h2>
          <div className="flex gap-2"><input className="input" readOnly aria-label="Public link" value={`${app}/`} onFocus={(e) => e.target.select()} /><button type="button" className="btn-ghost shrink-0" onClick={() => copy(`${app}/`)}><Copy size={15} /> Copy</button></div>
        </section>
        <section className="card p-5">
          <h2 className="mb-1 text-sm font-semibold">Add Miu to another website</h2>
          <p className="mb-3 text-sm text-ink-soft">Paste this line before <code className="rounded bg-lav-50 px-1">&lt;/body&gt;</code>. A round button appears in the corner.</p>
          <pre className="thin-scroll overflow-x-auto whitespace-pre-wrap break-all rounded-2xl bg-ink p-4 text-xs leading-relaxed text-lav-100"><code>{snippet}</code></pre>
          <button type="button" className="btn-ghost mt-3" onClick={() => copy(snippet)}><Copy size={15} /> Copy the line</button>
        </section>
        <section className="card p-5"><h2 className="mb-4 text-sm font-semibold">QR code</h2><QrCode url={`${app}/`} size={180} /></section>
      </div>
      <section aria-label="Widget preview">
        <h2 className="mb-3 text-sm font-semibold">Live preview</h2>
        <iframe title="Widget preview" src="/embed" className="card h-[600px] w-full max-w-[380px] overflow-hidden" />
      </section>
    </div>
  );
}
