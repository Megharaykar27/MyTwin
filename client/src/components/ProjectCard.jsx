import { ExternalLink } from "lucide-react";
import { useState } from "react";
import { GitHubIcon } from "./ui.jsx";

function Cover({ project, className }) {
  const [broken, setBroken] = useState(false);
  if (project.cover && !broken) return <img src={project.cover} alt="" loading="lazy" onError={() => setBroken(true)} className={`${className} object-cover object-top`} />;
  return (
    <div aria-hidden="true" className={`${className} flex items-center justify-center bg-gradient-to-br from-lav-200 via-lav-100 to-sky-100`}>
      <span className="font-serif text-4xl italic text-lav-600">{project.name[0]}</span>
    </div>
  );
}

export default function ProjectCard({ project, mini = false }) {
  if (mini) {
    return (
      <div className="flex w-full items-center gap-3 rounded-2xl border border-line bg-white p-2 pr-3 shadow-soft">
        <Cover project={project} className="h-11 w-14 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-tight">{project.name}</p>
          <p className="truncate text-xs text-ink-soft">{project.tagline}</p>
        </div>
        {project.repo && <a className="icon-btn" href={project.repo} target="_blank" rel="noreferrer" aria-label={`${project.name} on GitHub`}><GitHubIcon /></a>}
      </div>
    );
  }
  return (
    <article className="card group flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:border-lav-200">
      <Cover project={project} className="h-32 w-full border-b border-line" />
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold">{project.name}</h3>
          <span className="-mr-1.5 -mt-1 flex">
            {project.demo && <a className="icon-btn" href={project.demo} target="_blank" rel="noreferrer" aria-label={`${project.name} live demo`}><ExternalLink size={15} /></a>}
            {project.repo && <a className="icon-btn" href={project.repo} target="_blank" rel="noreferrer" aria-label={`${project.name} on GitHub`}><GitHubIcon /></a>}
          </span>
        </div>
        <p className="mt-0.5 text-sm text-ink-soft">{project.tagline}</p>
        <div className="mt-3 flex flex-wrap gap-1">
          {project.tech.slice(0, 5).map((t) => <span key={t} className="rounded-full bg-lav-50 px-2 py-0.5 text-[11px] font-medium text-lav-700">{t}</span>)}
        </div>
      </div>
    </article>
  );
}
