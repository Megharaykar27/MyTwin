import { Info, Mail, MapPin, QrCode as QrIcon, Target } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useProfile } from "../App.jsx";
import ChatPanel from "../components/ChatPanel.jsx";
import Orb from "../components/Orb.jsx";
import ProjectCard from "../components/ProjectCard.jsx";
import { FadeUp, GitHubIcon, LinkedInIcon, Modal, QrCode } from "../components/ui.jsx";

export default function Home() {
  const { profile: p } = useProfile();
  const { state } = useLocation();
  const [allSkills, setAllSkills] = useState(false);
  const [share, setShare] = useState(false);
  const skills = p.skills || [];
  const shown = allSkills ? skills : skills.slice(0, 12);
  const [firstWord, ...rest] = p.name.split(" ");

  return (
    <>
      <main className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.12fr)] lg:gap-8 lg:py-8">
        <FadeUp className="lg:col-start-1">
          <div className="flex items-start gap-5 sm:gap-6">
            <Orb size={120} className="!h-20 !w-20 sm:!h-[120px] sm:!w-[120px]" />
            <div className="min-w-0 pt-1">
              <h1 className="text-3xl font-bold leading-[1.05] tracking-tight sm:text-5xl">{firstWord} <span className="serif-word">{rest.join(" ")}</span></h1>
              <p className="mt-2 text-ink-soft sm:text-lg">{p.headline}</p>
              <p className="mt-1 flex items-center gap-1 text-sm text-ink-mute"><MapPin size={14} /> {p.location}</p>
            </div>
          </div>
          {p.availability && <p className="mt-5 inline-flex items-center gap-2 rounded-2xl border border-line bg-white px-3 py-1.5 text-xs font-medium text-ink-soft"><span className="relative flex h-2 w-2 shrink-0"><span className="absolute inset-0 animate-ping rounded-full bg-emerald-400 opacity-60" /><span className="relative h-2 w-2 rounded-full bg-emerald-500" /></span>{p.availability}</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            <Link className="btn-primary" to="/fit"><Target size={16} /> Check job fit</Link>
            {p.email && <a className="btn-ghost" href={`mailto:${p.email}`}><Mail size={16} /> Email</a>}
            {p.linkedin && <a className="btn-ghost" href={p.linkedin} target="_blank" rel="noreferrer"><LinkedInIcon /> LinkedIn</a>}
            {p.github && <a className="btn-ghost" href={p.github} target="_blank" rel="noreferrer"><GitHubIcon /> GitHub</a>}
          </div>
          <p className="mt-4 flex items-center gap-1.5 text-xs text-ink-mute">
            AI twin · answers from {p.first_name}'s real resume and projects
            <span tabIndex={0} role="img" aria-label="How it works: the twin only uses facts from the resume, project pages and notes. If it doesn't know something, it says so." title="The twin only uses facts from the resume, project pages and notes. If it doesn't know something, it says so." className="rounded-full"><Info size={14} /></span>
          </p>
        </FadeUp>

        <FadeUp delay={0.08} className="lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <div className="lg:sticky lg:top-[88px]"><ChatPanel prefill={state?.question || ""} className="h-[calc(100dvh-96px)] min-h-[440px] lg:h-[calc(100vh-120px)]" /></div>
        </FadeUp>

        <FadeUp delay={0.14} className="space-y-7 lg:col-start-1">
          <section aria-labelledby="skills">
            <h2 id="skills" className="mb-3 text-sm font-semibold">Skills</h2>
            <div className="flex flex-wrap gap-1.5">
              {shown.map((s) => <span key={s} className="chip">{s}</span>)}
              {skills.length > 12 && <button type="button" className="chip border-lav-200 bg-lav-50 text-lav-700 hover:bg-lav-100" onClick={() => setAllSkills(!allSkills)}>{allSkills ? "Show less" : `+${skills.length - 12} more`}</button>}
            </div>
          </section>
          {p.hobbies?.length > 0 && (
            <section aria-labelledby="hobbies">
              <h2 id="hobbies" className="mb-3 text-sm font-semibold">Off the keyboard</h2>
              <div className="flex flex-wrap gap-1.5">{p.hobbies.map((h) => <span key={h} className="chip border-transparent bg-pink-50 text-pink-800">{h}</span>)}</div>
            </section>
          )}
          <section aria-labelledby="projects">
            <h2 id="projects" className="mb-3 text-sm font-semibold">Projects</h2>
            <div className="grid gap-4 sm:grid-cols-2">{p.projects.map((x) => <ProjectCard key={x.slug} project={x} />)}</div>
          </section>
        </FadeUp>
      </main>
      <footer className="border-t border-line px-4 py-6 text-center text-xs text-ink-mute">
        Built by {p.name} with React, Node.js and Gemini · Share this twin
        <button type="button" className="icon-btn ml-1 align-middle" aria-label="Show QR code" onClick={() => setShare(true)}><QrIcon size={16} /></button>
      </footer>
      {share && <Modal title="Share this twin" onClose={() => setShare(false)}><QrCode url={`${window.location.origin}/`} /><p className="mt-4 break-all text-center text-xs text-ink-mute">{window.location.origin}/</p></Modal>}
    </>
  );
}
