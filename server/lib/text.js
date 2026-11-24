// Small text toolkit: tokens, a light stemmer, synonyms, markdown cleanup, chunking, phone redaction.

const STOP = new Set(("a an the and or but if of to in on at by for with from as is are was were be been being it its this that these those i you he she we they me my your her our their " +
  "do does did done have has had can could will would should shall may might must about into over under than then so such not no yes what which who whom whose when where why how " +
  "tell show give please describe explain any some all more most very just also there here up out much many get got make made let").split(" "));

export function stem(w) {
  if (w.length <= 4) return w;
  return w
    .replace(/(ies)$/, "y")
    .replace(/(ing|ed|es|s)$/, (m) => (w.length - m.length >= 4 ? "" : m))
    .replace(/(ment|ness|ly)$/, (m) => (w.length - m.length >= 4 ? "" : m));
}

export const tokens = (s) =>
  String(s || "").toLowerCase().replace(/[^\p{L}\p{N}+#.]+/gu, " ").replace(/\.(?=\s|$)/g, " ")
    .split(" ").filter((w) => w && !STOP.has(w)).map(stem);

// Words recruiters use for the same thing
const SYN = {
  experience: ["internship", "work", "job", "zetacoding"],
  intern: ["internship", "zetacoding"],
  internship: ["experience", "zetacoding", "intern"],
  job: ["internship", "work", "experience"],
  education: ["mca", "bca", "degree", "college", "university", "cgpa"],
  college: ["education", "university", "mca", "bca"],
  study: ["education", "mca", "bca", "student"],
  degree: ["mca", "bca", "education"],
  qualification: ["education", "mca", "bca"],
  marks: ["cgpa"], grade: ["cgpa"], gpa: ["cgpa"], cgpa: ["bca", "distinction"],
  skill: ["skills", "technical", "technologies", "stack"],
  stack: ["skills", "technologies", "tech", "frontend", "backend"],
  tech: ["skills", "technologies", "stack"],
  technology: ["skills", "stack"],
  language: ["languages", "programming", "python", "javascript", "spoken"],
  project: ["projects", "built", "app"],
  build: ["project", "built"],
  built: ["project"],
  certification: ["certifications", "certificate", "course", "nielit", "hackerrank", "infosys"],
  certificate: ["certifications"],
  course: ["certifications"],
  contact: ["email", "linkedin", "reach"],
  email: ["contact"],
  location: ["based", "karwar", "mangaluru", "relocate"],
  live: ["location", "based", "karwar"],
  strength: ["skills", "soft", "problem", "adaptability"],
  weakness: ["learning", "learn"],
  hobby: ["hobbies", "interests", "dancing", "free"],
  fun: ["hobbies", "interests", "dancing", "free"],
  free: ["hobbies", "interests", "dancing"],
  interest: ["hobbies", "interests", "dancing", "exploring"],
  passion: ["hobbies", "coding", "why"],
  personality: ["working", "style", "friendly"],
  know: ["skills", "used"],
  react: ["frontend", "skills"],
  ml: ["machine", "learning", "scikit-learn"],
  ai: ["gemini", "machine", "learning", "artificial", "intelligence"],
  frontend: ["react", "html", "css", "javascript", "tailwind"],
  backend: ["node.js", "express", "flask", "fastapi", "api"],
  database: ["mysql", "sqlite", "mongodb", "sql"],
  python: ["flask", "fastapi", "opencv", "pandas"],
  team: ["collaborate", "together", "coordination"],
};
export function expand(qTokens) {
  const out = [...qTokens];
  for (const t of qTokens) for (const s of SYN[t] || []) out.push(...tokens(s));
  return out;
}

// Markdown -> plain text (keeps list items and table cells readable)
export function plain(md) {
  return String(md || "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<img[^>]*>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^\|?\s*-{2,}.*$/gm, " ")
    .replace(/\|/g, " · ")
    .replace(/[*_`>#]+/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

// Split a markdown document into sections by heading; long sections are cut at ~900 characters
export function chunk(md, fallbackTitle = "Notes") {
  const lines = String(md || "").split(/\r?\n/);
  const sections = [];
  let heading = fallbackTitle;
  let buf = [];
  const flush = () => {
    const text = plain(buf.join("\n"));
    if (text.length > 20) sections.push({ heading, text });
    buf = [];
  };
  for (const line of lines) {
    const h = line.match(/^#{1,4}\s+(.+)/);
    if (h) { flush(); heading = plain(h[1]) || heading; } else buf.push(line);
  }
  flush();
  const out = [];
  for (const s of sections) {
    if (s.text.length <= 1100) { out.push(s); continue; }
    let part = "";
    for (const para of s.text.split(/\n/)) {
      if ((part + para).length > 900 && part) { out.push({ heading: s.heading, text: part.trim() }); part = ""; }
      part += `${para}\n`;
    }
    if (part.trim()) out.push({ heading: s.heading, text: part.trim() });
  }
  return out;
}

// Phone numbers never go into the public twin (resume uploads are cleaned automatically)
export const redactPhones = (s) =>
  String(s || "").replace(/(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{2,5}\)?[\s.-]?)?\d{3,5}[\s.-]?\d{4,5}\b/g, (m) => (m.replace(/\D/g, "").length >= 10 ? "[phone hidden]" : m));

export const sentences = (s) => String(s || "").split(/(?<=[.!?])\s+(?=[A-Z0-9])/).map((x) => x.trim()).filter(Boolean);
