// Skill dictionary: canonical names, other spellings and a category. Used by the job-fit check and basic mode.
// cs: true = match with exact capital letters only (words like "Express" and "Excel" are also normal English words).
const group = (cat, list) => list.map(([name, aliases = [], opt = {}]) => ({ name, aliases, cat, ...opt }));
const cs = { cs: true };
const strictOnly = { strict: true };

export const SKILLS = [
  ...group("Frontend", [
    ["JavaScript", ["js", "es6", "ecmascript"]], ["TypeScript", ["ts"]], ["HTML", ["html5"]], ["CSS", ["css3"]],
    ["Tailwind CSS", ["tailwind", "tailwindcss"]], ["Bootstrap"], ["Sass", ["scss"]], ["React", ["react.js", "reactjs"]],
    ["Redux"], ["Angular", ["angularjs", "angular.js"]], ["Vue", ["vue.js", "vuejs"]], ["Next.js", ["nextjs"]],
    ["Svelte", ["sveltekit"]], ["jQuery"], ["Vite"], ["Webpack"], ["Framer Motion"], ["Recharts"],
    ["Responsive design", ["responsive web design", "responsive ui"]], ["JSP"],
  ]),
  ...group("Backend", [
    ["Node.js", ["node", "nodejs"]], ["Express", ["express.js", "expressjs"], cs], ["NestJS", ["nest.js"]],
    ["REST APIs", ["rest api", "restful", "restful api", "restful apis"]], ["GraphQL"], ["WebSockets", ["websocket", "socket.io"]],
    ["JWT", ["json web token", "json web tokens"]], ["OAuth", ["oauth2", "oauth 2.0"]], ["Microservices", ["microservice"]],
    ["Python"], ["Flask"], ["FastAPI", ["fast api"]], ["Django"], ["Java"], ["Spring Boot", ["springboot"]],
    ["C", [], strictOnly], ["C++", ["cpp"]], ["C#", ["csharp"]], [".NET", ["asp.net", "dotnet"]], ["PHP"], ["Laravel"],
    ["Ruby", ["ruby on rails"]], ["Go", ["golang"], strictOnly], ["Rust", [], cs], ["R", [], strictOnly], ["Scala", [], cs],
    ["OOP", ["object-oriented programming", "object oriented programming"]],
    ["Data Structures", ["data structure", "dsa"]], ["Razorpay"], ["Stripe", [], cs],
  ]),
  ...group("Databases", [
    ["SQL"], ["MySQL"], ["PostgreSQL", ["postgres"]], ["SQLite"], ["MongoDB", ["mongo"]], ["Mongoose"], ["SQLAlchemy"],
    ["Redis"], ["Oracle"], ["SQL Server", ["mssql"]], ["Firebase", ["firestore"]], ["Supabase"], ["Prisma"],
    ["Elasticsearch"], ["DynamoDB"], ["Room", [], cs],
  ]),
  ...group("AI & ML", [
    ["Machine Learning", ["ml"]], ["Deep Learning"], ["scikit-learn", ["sklearn", "scikit learn"]], ["Pandas"], ["NumPy"],
    ["Matplotlib"], ["TensorFlow"], ["Keras"], ["PyTorch"], ["OpenCV"], ["Computer Vision"], ["OCR", ["tesseract", "tesseract.js"]],
    ["NLP", ["natural language processing"]], ["LLM", ["llms", "large language model", "large language models"]],
    ["Generative AI", ["genai", "gen ai"]], ["RAG", ["retrieval augmented generation", "retrieval-augmented generation"], cs],
    ["Prompt engineering"], ["Gemini API", ["gemini"]], ["OpenAI", ["chatgpt"]], ["LangChain"], ["Hugging Face", ["huggingface"]],
    ["Data Analysis", ["data analytics"]], ["Spark", ["pyspark"], cs],
  ]),
  ...group("Mobile & tools", [
    ["Kotlin"], ["Android"], ["Jetpack Compose"], ["React Native"], ["Flutter"], ["Swift", [], cs], ["iOS"],
    ["Git"], ["GitHub"], ["GitLab"], ["Jira"], ["Docker"], ["Kubernetes", ["k8s"]], ["AWS", ["amazon web services"]],
    ["Azure"], ["GCP", ["google cloud"]], ["Terraform"], ["CI/CD", ["github actions", "jenkins"]], ["Linux", ["ubuntu"]],
    ["Nginx"], ["Postman"], ["Figma"], ["Power BI", ["powerbi"]], ["Tableau"], ["Excel", ["ms excel", "microsoft excel"], cs],
  ]),
  ...group("Testing & process", [
    ["Testing", ["unit tests", "node:test"]], ["Jest"], ["pytest"], ["Playwright"], ["Selenium"], ["Cypress"], ["Agile", ["scrum"]],
  ]),
  ...group("Soft skills", [
    ["Communication"], ["Teamwork", ["team work", "team player", "team coordination", "collaboration"]],
    ["Problem solving", ["problem-solving"]], ["Adaptability"],
  ]),
];

const esc = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const word = (x, exact) => new RegExp(`(?<![A-Za-z0-9+#.])${esc(x)}(?![A-Za-z0-9+#])`, exact ? "" : "i");

// C, R and Go: only as a standalone item in a list, or next to the word "language"
const strict = (x) => new RegExp(
  `(?:^|[,;/|:•]\\s*|\\b(?:and|or)\\s+)${esc(x)}(?=\\s*(?:$|[,;/|]|\\.(?:\\s|$))|\\s+(?:and|or)\\b)` +
  `|\\b${esc(x)}(?:\\s+programming)?\\s+language\\b|\\blanguages?\\s*:?\\s+${esc(x)}(?![A-Za-z0-9+#])`, "m");

const MATCHERS = SKILLS.map((k) => ({
  name: k.name,
  res: [k.strict ? strict(k.name) : word(k.name, k.cs), ...k.aliases.map((a) => word(a, false))],
}));

// All skills named in a text, as a Set of canonical names
export function extractSkills(text) {
  const t = String(text || "");
  // "React Native" is its own skill, and "react to" isn't a skill at all
  const forReact = t.replace(/react native/gi, " ").replace(/\breact (?=to\b)/gi, " ");
  const found = new Set();
  for (const m of MATCHERS) {
    const hay = m.name === "React" ? forReact : t;
    if (m.res.some((r) => r.test(hay))) found.add(m.name);
  }
  return found;
}

export const categoryOf = (name) => SKILLS.find((k) => k.name === name)?.cat || "Mobile & tools";

// Skills that are close to each other: knowing one counts as "partial" for the other.
// Weak pairs are too far apart to count in the score, so those skills stay "missing".
const PAIRS = [
  ["Angular", "React"], ["Vue", "React"], ["Django", "Flask"], ["PostgreSQL", "MySQL"], ["TypeScript", "JavaScript"],
  ["Java", "Kotlin"], ["Docker", "Linux", "weak"], ["AWS", "Linux", "weak"],
];
export const RELATED = new Map();
for (const [a, b, weak] of PAIRS) {
  if (weak) continue;
  for (const [x, y] of [[a, b], [b, a]]) RELATED.set(x, [...(RELATED.get(x) || []), y]);
}
export const relatedTo = (skill, mine) => (RELATED.get(skill) || []).find((r) => mine.has(r)) || null;
