// Voice input (Web Speech API) and reading answers aloud
const Recognition = typeof window !== "undefined" ? window.SpeechRecognition || window.webkitSpeechRecognition : null;
export const canListen = !!Recognition;
export const canSpeak = typeof window !== "undefined" && "speechSynthesis" in window;

export function listen({ onText, onEnd, onError }) {
  const r = new Recognition();
  r.lang = "en-IN";
  r.interimResults = true;
  r.onresult = (e) => onText([...e.results].map((x) => x[0].transcript).join(" "));
  r.onerror = (e) => onError?.(e.error);
  r.onend = () => onEnd?.();
  r.start();
  return () => r.stop();
}

export function speak(text, onEnd) {
  window.speechSynthesis.cancel();
  const clean = text.replace(/\[\d+(?:\s*,\s*\d+)*\]/g, "").replace(/\*\*/g, "").replace(/^- /gm, "").replace(/https?:\/\/\S+/g, "");
  const u = new SpeechSynthesisUtterance(clean);
  u.lang = "en-IN";
  u.onend = onEnd;
  u.onerror = onEnd;
  window.speechSynthesis.speak(u);
}
export const stopSpeaking = () => { if (canSpeak) window.speechSynthesis.cancel(); };
