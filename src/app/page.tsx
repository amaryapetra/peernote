"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  BookOpen, BookOpenCheck, CalendarDays, Check, ChevronDown, ChevronRight, CircleHelp,
  Clock3, FileText, FolderOpen, GraduationCap, House, Layers3, LogIn, LogOut, Menu,
  Plus, Search, ShieldCheck, Sparkles, Users, UsersRound, WandSparkles,
  X, ArrowUpRight, PenLine, Lightbulb
} from "lucide-react";
import { isConfigured, supabase } from "@/lib/supabase";

type Course = { id: string; code: string; title: string; accent: string };
type Note = { id: string; course_id: string; user_id: string; title: string; content: string; created_at: string };
type Group = { id: string; course_id: string; creator_id: string; title: string; description: string; location: string; meet_at: string | null };
type GroupMember = { group_id: string; user_id: string };
type Page = "home" | "courses" | "notes" | "groups" | "ai";
type Modal = "auth" | "course" | "note" | "group" | null;
const forbidden = /(exam\s+(questions|answers|key)|quiz\s+(answers|key)|answer\s+key|midterm\s+questions|final\s+exam\s+questions|actual\s+test\s+questions)/i;

const demoCourses: Course[] = [
  { id: "c1", code: "PSYC 3130", title: "Research Methods in Psychology", accent: "lilac" },
  { id: "c2", code: "SPHU 3170", title: "Foundations of Epidemiology", accent: "peach" },
  { id: "c3", code: "ECON 1010", title: "Introduction to Economics", accent: "mint" },
];
const demoNotes: Note[] = [
  { id: "n1", course_id: "c1", user_id: "peer1", title: "Factorial designs · Week 6", content: "Factorial designs examine two or more independent variables. Main effects describe the effect of one independent variable averaged across the other. An interaction happens when the effect of one independent variable depends on another. A 2 × 2 design contains four conditions.", created_at: "2026-10-19T14:00:00Z" },
  { id: "n2", course_id: "c2", user_id: "peer2", title: "Outbreak investigation essentials", content: "An outbreak investigation starts by confirming the diagnosis and existence of an outbreak. Develop a case definition, describe cases by person, place and time, generate hypotheses, and test them using an analytic study. An epidemic curve can suggest the pattern of exposure.", created_at: "2026-10-18T18:00:00Z" },
  { id: "n3", course_id: "c1", user_id: "peer3", title: "Main effects and interactions", content: "An interaction shows that an independent variable's effect changes across levels of the second variable. Look for nonparallel lines on interaction graphs. Factorial experiments can have multiple main effects and interaction effects. A 2 × 3 factorial design has six conditions.", created_at: "2026-10-17T10:30:00Z" },
];
const demoGroups: Group[] = [
  { id: "g1", course_id: "c1", creator_id: "peer1", title: "Methods midweek review", description: "Work through practice problems and compare study notes.", location: "Library · 2nd floor", meet_at: "2026-11-04T17:00:00" },
  { id: "g2", course_id: "c2", creator_id: "peer2", title: "Epi study circle", description: "Case studies, study strategies, and review questions.", location: "Online · video chat", meet_at: "2026-11-05T18:30:00" },
];
const demoMembers: GroupMember[] = [{ group_id: "g1", user_id: "peer1" }, { group_id: "g1", user_id: "peer3" }, { group_id: "g2", user_id: "peer2" }];
const menu: { key: Page; label: string; icon: typeof House }[] = [
  { key: "home", label: "Overview", icon: House },
  { key: "courses", label: "My courses", icon: BookOpen },
  { key: "notes", label: "Note library", icon: FileText },
  { key: "groups", label: "Study groups", icon: UsersRound },
  { key: "ai", label: "AI note assistant", icon: Sparkles },
];
const colorFor = (i: number) => ["lilac", "peach", "mint", "blue"][i % 4];
const timeLabel = (date: string | null) => date ? new Date(date).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "Time TBD";

export default function HomePage() {
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(!isConfigured);
  const [active, setActive] = useState<Page>("home");
  const [modal, setModal] = useState<Modal>(null);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [courses, setCourses] = useState<Course[]>(isConfigured ? [] : demoCourses);
  const [notes, setNotes] = useState<Note[]>(isConfigured ? [] : demoNotes);
  const [groups, setGroups] = useState<Group[]>(isConfigured ? [] : demoGroups);
  const [members, setMembers] = useState<GroupMember[]>(isConfigured ? [] : demoMembers);
  const [myCourses, setMyCourses] = useState<string[]>(isConfigured ? [] : demoCourses.map((c) => c.id));
  const [search, setSearch] = useState("");
  const [filterCourse, setFilterCourse] = useState("all");
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [toast, setToast] = useState("");
  const [loading, setLoading] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("signup");
  const [form, setForm] = useState({ name: "", email: "", password: "", code: "", title: "", content: "", description: "", location: "", meet: "", confirm: false });
  const [firstNote, setFirstNote] = useState("");
  const [secondNote, setSecondNote] = useState("");
  const [analysis, setAnalysis] = useState("");
  const currentUser = session?.user.id || "demo-me";
  const displayName = session?.user.user_metadata?.full_name || session?.user.email?.split("@")[0] || "Student";
  const greeting = displayName.split(" ")[0];

  const refresh = useCallback(async (uid: string) => {
    if (!supabase) return;
    const [cr, nr, gr, mr, cm] = await Promise.all([
      supabase.from("courses").select("*").order("code"),
      supabase.from("notes").select("*").order("created_at", { ascending: false }),
      supabase.from("study_groups").select("*").order("meet_at", { ascending: true }),
      supabase.from("group_members").select("group_id,user_id"),
      supabase.from("course_members").select("course_id").eq("user_id", uid),
    ]);
    const error = [cr, nr, gr, mr, cm].find((result) => result.error)?.error;
    if (error) { setToast("Database setup needed: " + error.message); return; }
    setCourses((cr.data || []) as Course[]);
    setNotes((nr.data || []) as Note[]);
    setGroups((gr.data || []) as Group[]);
    setMembers((mr.data || []) as GroupMember[]);
    setMyCourses((cm.data || []).map((row) => row.course_id));
  }, []);

  useEffect(() => {
    if (!supabase) return;
    const client = supabase;
    client.auth.getSession().then(({ data }) => { setSession(data.session); setAuthReady(true); });
    const { data: listener } = client.auth.onAuthStateChange((_event, next) => { setSession(next); setAuthReady(true); });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!isConfigured) return;
    const handle = window.setTimeout(() => {
      if (session) void refresh(session.user.id);
      else { setCourses([]); setNotes([]); setGroups([]); setMembers([]); setMyCourses([]); }
    }, 0);
    return () => window.clearTimeout(handle);
  }, [session, refresh]);

  const notify = (message: string) => setToast(message);
  const requireLogin = () => {
    if (isConfigured && !session) { setAuthMode("signup"); setModal("auth"); return false; }
    return true;
  };
  const openModal = (kind: Modal, courseId = "") => {
    if (!requireLogin()) return;
    setSelectedCourse(courseId);
    setForm({ name: "", email: "", password: "", code: "", title: "", content: "", description: "", location: "", meet: "", confirm: false });
    setModal(kind);
  };
  const myCourseList = courses.filter((c) => myCourses.includes(c.id));
  const visibleNotes = useMemo(() => notes.filter((note) => {
    const course = courses.find((c) => c.id === note.course_id);
    const match = (note.title + " " + note.content + " " + (course?.code || "")).toLowerCase().includes(search.toLowerCase());
    return match && (filterCourse === "all" || note.course_id === filterCourse);
  }), [notes, search, courses, filterCourse]);
  const courseOf = (id: string) => courses.find((c) => c.id === id);
  const memberCount = (id: string) => members.filter((member) => member.group_id === id).length;
  const joinCourse = async (course: Course) => {
    if (!requireLogin()) return;
    if (myCourses.includes(course.id)) { notify("You're already in this course."); return; }
    if (!supabase) { setMyCourses((prev) => [...prev, course.id]); notify("Course added to your demo dashboard."); return; }
    const { error } = await supabase.from("course_members").insert({ course_id: course.id, user_id: currentUser });
    if (error) return notify(error.message);
    await refresh(currentUser); notify("Joined " + course.code + "!");
  };
  const submitAuth = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!supabase) return;
    setLoading(true);
    const { error, data } = authMode === "login"
      ? await supabase.auth.signInWithPassword({ email: form.email.trim(), password: form.password })
      : await supabase.auth.signUp({ email: form.email.trim(), password: form.password, options: { data: { full_name: form.name.trim() } } });
    setLoading(false);
    if (error) return notify(error.message);
    setModal(null);
    notify(authMode === "signup" && !data.session ? "Check your email to confirm your account." : "Welcome to PeerNote!");
  };
  const submitCourse = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const code = form.code.trim().toUpperCase();
    let course = courses.find((c) => c.code.toUpperCase() === code);
    if (!course && !form.title.trim()) return notify("Enter a course title to create a new course.");
    setLoading(true);
    if (!course && supabase) {
      const result = await supabase.from("courses").insert({ code, title: form.title.trim(), accent: colorFor(courses.length) }).select().single();
      if (result.error) { setLoading(false); return notify(result.error.message); }
      course = result.data as Course;
    } else if (!course) {
      course = { id: "c" + Date.now(), code, title: form.title.trim(), accent: colorFor(courses.length) };
      setCourses((prev) => [...prev, course!]);
    }
    await joinCourse(course);
    setLoading(false); setModal(null);
  };
  const submitNote = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedCourse) return notify("Choose a course first.");
    if (!myCourses.includes(selectedCourse)) return notify("Join the course to share notes.");
    if (!form.confirm) return notify("Please confirm that you are sharing your own permitted class notes.");
    if (forbidden.test(form.title + " " + form.content)) return notify("Potential assessment material detected. Remove actual quiz or exam content.");
    setLoading(true);
    if (supabase) {
      const { error } = await supabase.from("notes").insert({ title: form.title.trim(), content: form.content.trim(), course_id: selectedCourse, user_id: currentUser });
      if (error) { setLoading(false); return notify(error.message); }
      await refresh(currentUser);
    } else {
      setNotes((prev) => [{ id: "n" + Date.now(), course_id: selectedCourse, user_id: currentUser, title: form.title.trim(), content: form.content.trim(), created_at: new Date().toISOString() }, ...prev]);
    }
    setLoading(false); setModal(null); notify("Notes shared with your course!");
  };
  const submitGroup = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedCourse || !myCourses.includes(selectedCourse)) return notify("Choose a course you're in.");
    setLoading(true);
    if (supabase) {
      const { data, error } = await supabase.from("study_groups").insert({
        course_id: selectedCourse, creator_id: currentUser, title: form.title.trim(), description: form.description.trim(),
        location: form.location.trim() || "TBD", meet_at: form.meet ? new Date(form.meet).toISOString() : null
      }).select().single();
      if (error) { setLoading(false); return notify(error.message); }
      const joined = await supabase.from("group_members").insert({ group_id: data.id, user_id: currentUser });
      if (joined.error) notify("Group created; joining it failed: " + joined.error.message);
      await refresh(currentUser);
    } else {
      const group: Group = { id: "g" + Date.now(), course_id: selectedCourse, creator_id: currentUser, title: form.title.trim(), description: form.description.trim(), location: form.location.trim() || "TBD", meet_at: form.meet || null };
      setGroups((prev) => [group, ...prev]); setMembers((prev) => [...prev, { group_id: group.id, user_id: currentUser }]);
    }
    setLoading(false); setModal(null); notify("Study group created!");
  };
  const toggleGroup = async (id: string) => {
    if (!requireLogin()) return;
    const joined = members.some((m) => m.group_id === id && m.user_id === currentUser);
    if (supabase) {
      const result = joined ? await supabase.from("group_members").delete().eq("group_id", id).eq("user_id", currentUser)
        : await supabase.from("group_members").insert({ group_id: id, user_id: currentUser });
      if (result.error) return notify(result.error.message);
      await refresh(currentUser);
    } else setMembers((prev) => joined ? prev.filter((m) => !(m.group_id === id && m.user_id === currentUser)) : [...prev, { group_id: id, user_id: currentUser }]);
    notify(joined ? "You left the study group." : "You're in! See you at the session.");
  };
  const compareNotes = async () => {
    const a = notes.find((n) => n.id === firstNote), b = notes.find((n) => n.id === secondNote);
    if (!a || !b || a.id === b.id) return notify("Select two different notes.");
    if (a.course_id !== b.course_id) return notify("Choose notes from the same course.");
    if (!supabase || !session) {
      const tokens = (s: string) => new Set((s.toLowerCase().match(/[a-z]{5,}/g) || []).filter((w) => !["their", "about", "where", "which", "these", "there", "class"].includes(w)));
      const first = tokens(a.content), second = tokens(b.content);
      const missing = [...second].filter((w) => !first.has(w)).slice(0, 8);
      setAnalysis("DEMO PREVIEW — keyword comparison, not AI.\n\nConcepts or terms in the second note but not the first: " + (missing.join(", ") || "No obvious keyword gaps found.") + ".\n\nRead the original notes to verify context. Connect the AI server route and provider key for a genuine AI analysis.");
      return;
    }
    setLoading(true); setAnalysis("");
    try {
      const response = await fetch("/api/compare", {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + session.access_token },
        body: JSON.stringify({ firstNoteId: a.id, secondNoteId: b.id }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "AI comparison failed.");
      setAnalysis(json.analysis);
    } catch (err) { notify(err instanceof Error ? err.message : "Unable to compare notes."); }
    finally { setLoading(false); }
  };
  const setValue = (key: keyof typeof form, value: string | boolean) => setForm((prev) => ({ ...prev, [key]: value }));
  const changePage = (page: Page) => { setActive(page); setMobileMenu(false); setSearch(""); };

  if (!authReady) return <main className="loading-view"><BookOpenCheck size={34} /> Opening PeerNote...</main>;

  return (
    <div className="app-shell">
      <aside className={"sidebar " + (mobileMenu ? "sidebar-open" : "")}>
        <button className="brand" onClick={() => changePage("home")} aria-label="PeerNote overview">
          <span className="brand-icon"><BookOpenCheck size={24} /></span>
          <span>peer<span className="brand-bold">note</span><span className="brand-dot">.</span></span>
        </button>
        <div className="sidebar-caption">YOUR WORKSPACE</div>
        <nav aria-label="Main navigation" className="nav-links">
          {menu.map(({ key, label, icon: Icon }) => (
            <button key={key} className={"nav-link " + (active === key ? "nav-active" : "")} onClick={() => changePage(key)}>
              <Icon size={19} strokeWidth={active === key ? 2.4 : 1.9} /><span>{label}</span>{key === "ai" && <span className="nav-new">NEW</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-help">
          <span className="help-icon"><Lightbulb size={19}/></span>
          <b>Learn better, together.</b>
          <p>Good ideas grow when we share them. Start by joining a course!</p>
          <button onClick={() => openModal("course")}>Explore courses <ArrowUpRight size={14}/></button>
        </div>
        <div className="sidebar-bottom">
          <div className="sidebar-integrity"><ShieldCheck size={16}/> Academic integrity first</div>
          <button className="account-button" onClick={() => {
            if (session && supabase) void supabase.auth.signOut();
            else if (supabase) { setAuthMode("signup"); setModal("auth"); } else notify("Account creation is available after Supabase is connected.");
          }}>
            <span className="avatar">{displayName[0]?.toUpperCase() || "S"}</span>
            <span className="account-text"><b>{session ? displayName : isConfigured ? "Guest student" : "Demo student"}</b><small>{session ? "My account" : isConfigured ? "Sign up to start" : "Preview workspace"}</small></span>
            {session ? <LogOut size={17}/> : <ChevronRight size={17}/>}
          </button>
        </div>
      </aside>

      {mobileMenu && <button className="scrim" aria-label="Close menu" onClick={() => setMobileMenu(false)}/>}
      <div className="main-area">
        <header className="topbar">
          <button className="mobile-toggle" aria-label="Open menu" onClick={() => setMobileMenu(true)}><Menu size={22}/></button>
          <div className="breadcrumb"><span>Workspace</span><ChevronRight size={15}/><b>{menu.find((m) => m.key === active)?.label}</b></div>
          <div className="top-actions">
            {!isConfigured && <span className="preview-pill">Preview mode</span>}
            <button className="icon-button" title="Academic integrity" onClick={() => notify("Share your own permitted notes only. Never upload actual quiz, exam, or answer-key materials.")}><CircleHelp size={20}/></button>
            <span className="avatar top-avatar">{displayName[0]?.toUpperCase() || "S"}</span>
          </div>
        </header>
        {toast && <div className="toast" role="status"><span>{toast}</span><button onClick={() => setToast("")} aria-label="Dismiss"><X size={15}/></button></div>}
        <main className="content">
          {active === "home" && <>
            <div className="section-heading"><div><div className="eyebrow">YOUR LEARNING SPACE</div><h1>Hey, {greeting}! <span className="wave">✳</span></h1><p>Everything you need to make studying a little easier.</p></div><span className="today">Your study space</span></div>
            <section className="hero">
              <div className="hero-copy"><span className="hero-label"><Sparkles size={14}/> MADE FOR STUDENTS, BY STUDENTS</span><h2>Better notes.<br/><em>Brighter minds.</em></h2><p>Never feel behind again. Share what you know, find what you missed, and learn with your people.</p>
                <button className="primary-button hero-button" onClick={() => openModal("note")}>Share your notes <ArrowUpRight size={17}/></button>
              </div>
              <div className="hero-art" aria-hidden="true"><div className="art-orbit"></div><div className="art-note art-note-back"><span>✦</span><div></div><div></div><div></div></div><div className="art-note art-note-front"><span className="art-note-title">study notes ♡</span><div></div><div></div><div></div><div className="art-highlight"></div></div><div className="art-star star-one">✳</div><div className="art-star star-two">✦</div><div className="art-bubble"><UsersRound size={19}/> + study buddies</div></div>
            </section>
            <div className="stats-row">
              <div className="stat-card"><div className="stat-icon lilac-soft"><BookOpen size={20}/></div><div><strong>{myCourseList.length.toString().padStart(2, "0")}</strong><span>My courses</span></div></div>
              <div className="stat-card"><div className="stat-icon peach-soft"><FileText size={20}/></div><div><strong>{notes.length.toString().padStart(2, "0")}</strong><span>Shared notes</span></div></div>
              <div className="stat-card"><div className="stat-icon mint-soft"><Users size={20}/></div><div><strong>{groups.length.toString().padStart(2, "0")}</strong><span>Study groups</span></div></div>
            </div>
            <div className="split-grid">
              <section className="panel"><div className="panel-heading"><div><h3>Your courses</h3><p>Keep all your classes in one place</p></div><button className="text-button" onClick={() => changePage("courses")}>View all <ArrowUpRight size={16}/></button></div>
                {myCourseList.length ? <div className="course-list">{myCourseList.slice(0, 4).map((course) => <button className="course-row" key={course.id} onClick={() => { setFilterCourse(course.id); setActive("notes"); }}>
                  <span className={"course-icon " + course.accent}><BookOpen size={22}/></span><span className="course-row-info"><b>{course.code}</b><small>{course.title}</small></span><ChevronRight size={18} className="muted-icon"/></button>)}</div> : <div className="empty-state"><BookOpen size={25}/><p>Join a course to get started!</p><button onClick={() => openModal("course")}>Join a course</button></div>}
                <button className="dashed-button" onClick={() => openModal("course")}><Plus size={17}/> Add a course</button>
              </section>
              <section className="panel"><div className="panel-heading"><div><h3>Fresh from your classmates</h3><p>Notes worth taking a look at</p></div><button className="text-button" onClick={() => changePage("notes")}>Browse all <ArrowUpRight size={16}/></button></div>
                <div className="recent-list">{notes.slice(0, 3).map((note) => <button className="recent-row" key={note.id} onClick={() => setSelectedNote(note)}><span className="file-tile"><FileText size={20}/></span><span className="recent-info"><b>{note.title}</b><small>{courseOf(note.course_id)?.code || "Course"} · Shared notes</small></span><ArrowUpRight size={17} className="muted-icon"/></button>)}</div>
                {!notes.length && <div className="empty-state"><FileText size={25}/><p>No notes yet. Be the first to share!</p></div>}
                <button className="dashed-button" onClick={() => openModal("note")}><Plus size={17}/> Upload notes</button>
              </section>
            </div>
            <div className="bottom-promo"><span className="promo-icon"><WandSparkles size={25}/></span><div><b>Two sets of notes are better than one.</b><p>Spot missing concepts by comparing notes side by side.</p></div><button onClick={() => changePage("ai")}>Try note assistant <ArrowUpRight size={16}/></button></div>
          </>}

          {active === "courses" && <>
            <div className="page-title-line"><div><div className="eyebrow">STAY ON TOP OF CLASS</div><h1>My courses<span className="title-dot">.</span></h1><p>Join a course to see classmates&apos; notes and study groups.</p></div><button className="primary-button" onClick={() => openModal("course")}><Plus size={18}/> Add a course</button></div>
            <div className="category-heading"><h3>Courses you&apos;re in <span className="count-label">{myCourseList.length}</span></h3></div>
            <div className="cards-grid">{myCourseList.map((course) => <article className="course-card" key={course.id}><div className={"course-card-top " + course.accent}><span className="course-mini-tag">COURSE</span><BookOpen size={42} strokeWidth={1.5}/></div><div className="course-card-body"><b>{course.code}</b><h3>{course.title}</h3><span>{notes.filter((n) => n.course_id === course.id).length} shared notes</span><button onClick={() => {setFilterCourse(course.id); changePage("notes"); setFilterCourse(course.id);}}>View notes <ArrowUpRight size={16}/></button></div></article>)}</div>
            {!myCourseList.length && <div className="empty-state large-empty"><GraduationCap size={35}/><h3>Your courses will show up here.</h3><p>Use the button above to add your first course.</p></div>}
            <div className="category-heading second-category"><h3>Discover courses</h3><p>Explore classes other students have created</p></div>
            <div className="discover-list">{courses.filter((c) => !myCourses.includes(c.id)).map((course) => <div className="discover-row" key={course.id}><span className={"course-icon " + course.accent}><BookOpen size={22}/></span><div><b>{course.code}</b><p>{course.title}</p></div><button className="outline-button" onClick={() => void joinCourse(course)}><Plus size={16}/> Join course</button></div>)}</div>
            {!courses.filter((c) => !myCourses.includes(c.id)).length && <p className="no-more">You&apos;re all caught up — create another course using the button above.</p>}
          </>}

          {active === "notes" && <>
            <div className="page-title-line"><div><div className="eyebrow">NOTES, WITHOUT THE STRESS</div><h1>Note library<span className="title-dot">.</span></h1><p>Find what you missed and help someone else catch up.</p></div><button className="primary-button" onClick={() => openModal("note")}><Plus size={18}/> Share notes</button></div>
            <div className="library-tools"><label className="search-field"><Search size={19}/><input aria-label="Search notes" placeholder="Search notes or topics..." value={search} onChange={(e) => setSearch(e.target.value)}/></label><label className="select-wrap"><Layers3 size={17}/><select aria-label="Filter course" value={filterCourse} onChange={(e) => setFilterCourse(e.target.value)}><option value="all">All courses</option>{myCourseList.map((course) => <option key={course.id} value={course.id}>{course.code}</option>)}</select><ChevronDown size={15}/></label></div>
            <div className="note-grid">{visibleNotes.map((note) => <button className="note-card" key={note.id} onClick={() => setSelectedNote(note)}><div className="note-card-top"><span className="file-tile"><FileText size={22}/></span><ArrowUpRight size={17}/></div><span className="note-course">{courseOf(note.course_id)?.code || "Course"}</span><h3>{note.title}</h3><p>{note.content}</p><div className="note-card-bottom"><span><Clock3 size={14}/> {new Date(note.created_at).toLocaleDateString()}</span><span>Read notes <ChevronRight size={15}/></span></div></button>)}</div>
            {!visibleNotes.length && <div className="empty-state large-empty"><FolderOpen size={35}/><h3>Nothing here yet</h3><p>Try another search or share the first notes for this course.</p></div>}
          </>}

          {active === "groups" && <>
            <div className="page-title-line"><div><div className="eyebrow">FIND YOUR PEOPLE</div><h1>Study groups<span className="title-dot">.</span></h1><p>Studying is better when you don&apos;t have to do it alone.</p></div><button className="primary-button" onClick={() => openModal("group")}><Plus size={18}/> Create a group</button></div>
            <div className="group-banner"><div className="group-banner-icon"><UsersRound size={27}/></div><div><b>Find your study circle</b><p>Join a group for a class you&apos;re taking, or start one yourself.</p></div></div>
            <div className="group-grid">{groups.map((group, i) => {
              const joined = members.some((m) => m.group_id === group.id && m.user_id === currentUser);
              return <article className="group-card" key={group.id}><div className="group-card-head"><span className={"group-avatar " + colorFor(i)}><UsersRound size={24}/></span><span className="course-chip">{courseOf(group.course_id)?.code || "Course"}</span></div><h3>{group.title}</h3><p>{group.description}</p><div className="group-meta"><span><CalendarDays size={16}/>{timeLabel(group.meet_at)}</span><span><GraduationCap size={16}/>{group.location}</span><span><Users size={16}/>{memberCount(group.id)} studying together</span></div><button className={joined ? "joined-button" : "primary-button"} onClick={() => void toggleGroup(group.id)}>{joined ? <><Check size={17}/> Joined · Leave</> : <>Join study group <ArrowUpRight size={17}/></>}</button></article>;
            })}</div>
            {!groups.length && <div className="empty-state large-empty"><UsersRound size={35}/><h3>Be the first to start a group.</h3><p>Invite classmates to study together.</p></div>}
          </>}

          {active === "ai" && <>
            <div className="page-title-line"><div><div className="eyebrow">A LITTLE EXTRA HELP</div><h1>AI note assistant<span className="title-dot">.</span></h1><p>Compare classmates&apos; notes to spot concepts you may have missed.</p></div><span className="ai-heading-icon"><Sparkles size={27}/></span></div>
            <div className="ai-layout"><div className="ai-main panel"><div className="ai-intro"><span className="ai-intro-icon"><WandSparkles size={25}/></span><div><h3>Find the missing pieces</h3><p>Select two notes from the same course. PeerNote will compare their coverage.</p></div></div>
              <label className="form-label">Your first set of notes</label><select className="form-control" value={firstNote} onChange={(e) => {setFirstNote(e.target.value); setAnalysis("");}}><option value="">Choose the first note...</option>{notes.map((n) => <option key={n.id} value={n.id}>{courseOf(n.course_id)?.code} — {n.title}</option>)}</select>
              <div className="compare-connector"><span>+</span> <span>COMPARE WITH</span></div>
              <label className="form-label">Another student&apos;s notes</label><select className="form-control" value={secondNote} onChange={(e) => {setSecondNote(e.target.value); setAnalysis("");}}><option value="">Choose another note...</option>{notes.filter((n) => n.id !== firstNote && (!firstNote || n.course_id === notes.find((x) => x.id === firstNote)?.course_id)).map((n) => <option key={n.id} value={n.id}>{courseOf(n.course_id)?.code} — {n.title}</option>)}</select>
              <button className="primary-button compare-button" onClick={() => void compareNotes()} disabled={loading || !firstNote || !secondNote}><Sparkles size={18}/>{loading ? "Comparing notes..." : "Compare my notes"}</button>
              {analysis && <div className="analysis-result"><div><Sparkles size={18}/><b>Your note comparison</b></div><p>{analysis}</p></div>}
            </div>
            <aside className="ai-sidebar"><div className="tips-card"><Lightbulb size={23}/><h3>How it works</h3><div className="tip-row"><b>01</b><p>Choose two sets of shared notes from the same course.</p></div><div className="tip-row"><b>02</b><p>Compare coverage, concepts, and potential gaps.</p></div><div className="tip-row"><b>03</b><p>Review the original notes and check against class materials.</p></div></div><div className="integrity-card"><ShieldCheck size={20}/><b>Made for honest learning</b><p>AI may be mistaken. This tool supports studying, not cheating. Never upload actual exams, quizzes, or answer keys.</p></div></aside></div>
          </>}
        </main>
      </div>
      <nav className="mobile-bottom-nav" aria-label="Mobile navigation">{menu.map(({ key, icon: Icon }) => <button key={key} className={active === key ? "selected" : ""} onClick={() => changePage(key)} aria-label={menu.find((m) => m.key === key)?.label}><Icon size={21}/><span>{key === "home" ? "Home" : key === "courses" ? "Courses" : key === "notes" ? "Notes" : key === "groups" ? "Groups" : "AI"}</span></button>)}</nav>
      {(modal || selectedNote) && <div className="modal-overlay" onMouseDown={(e) => {if (e.target === e.currentTarget) {setModal(null);setSelectedNote(null);}}}>
        <section className="dialog" role="dialog" aria-modal="true" aria-label={selectedNote ? "Shared note" : modal || "Dialog"}>
          <button className="close-dialog" onClick={() => {setModal(null);setSelectedNote(null);}} aria-label="Close"><X size={20}/></button>
          {selectedNote ? <><div className="dialog-icon"><FileText size={23}/></div><div className="eyebrow">{courseOf(selectedNote.course_id)?.code}</div><h2>{selectedNote.title}</h2><p className="dialog-subtitle">Shared {new Date(selectedNote.created_at).toLocaleDateString()}</p><div className="note-full">{selectedNote.content}</div><button className="primary-button full-width" onClick={() => {setSelectedNote(null);setActive("ai");setFirstNote(selectedNote.id);setSecondNote("");setAnalysis("");}}>Compare with another note <Sparkles size={16}/></button></>
          : modal === "auth" ? <><div className="dialog-icon"><BookOpenCheck size={23}/></div><h2>{authMode === "signup" ? "Join the learning circle" : "Welcome back"}</h2><p className="dialog-subtitle">Your classes, notes, and study groups in one place.</p><form onSubmit={submitAuth}>{authMode === "signup" && <label className="form-label">Your name<input className="form-control" required placeholder="Your full name" value={form.name} onChange={(e)=>setValue("name",e.target.value)}/></label>}<label className="form-label">School email<input type="email" className="form-control" required placeholder="you@university.edu" value={form.email} onChange={(e)=>setValue("email",e.target.value)}/></label><label className="form-label">Password<input type="password" minLength={6} className="form-control" required placeholder="At least 6 characters" value={form.password} onChange={(e)=>setValue("password",e.target.value)}/></label><button disabled={loading} className="primary-button full-width">{loading ? "One moment..." : authMode === "signup" ? "Create my account" : "Log in"} <LogIn size={17}/></button></form><button className="switch-auth" onClick={()=>setAuthMode(authMode === "signup" ? "login" : "signup")}>{authMode === "signup" ? "Already have an account? Log in" : "New here? Create an account"}</button></>
          : modal === "course" ? <><div className="dialog-icon"><BookOpen size={23}/></div><h2>Add a course</h2><p className="dialog-subtitle">Enter an existing course code to join, or add a title to create one.</p><form onSubmit={submitCourse}><label className="form-label">Course code<input className="form-control" required maxLength={24} placeholder="e.g. PSYC 3130" value={form.code} onChange={(e)=>setValue("code",e.target.value)}/></label><label className="form-label">Course name <span className="optional">(new courses only)</span><input className="form-control" maxLength={120} placeholder="e.g. Research Methods" value={form.title} onChange={(e)=>setValue("title",e.target.value)}/></label><button disabled={loading} className="primary-button full-width">{loading ? "Adding..." : "Join or create course"} <ArrowUpRight size={17}/></button></form></>
          : modal === "note" ? <><div className="dialog-icon"><PenLine size={23}/></div><h2>Share class notes</h2><p className="dialog-subtitle">Paste your own course notes to help classmates learn. File attachments are not included in this first version.</p><form onSubmit={submitNote}><label className="form-label">Course<select className="form-control" required value={selectedCourse} onChange={(e)=>setSelectedCourse(e.target.value)}><option value="">Choose a course...</option>{myCourseList.map((c)=><option key={c.id} value={c.id}>{c.code} — {c.title}</option>)}</select></label><label className="form-label">Note title<input className="form-control" required minLength={3} maxLength={140} placeholder="e.g. Lecture 5: Factorial designs" value={form.title} onChange={(e)=>setValue("title",e.target.value)}/></label><label className="form-label">Your notes<textarea className="form-control large-textarea" required minLength={20} maxLength={20000} placeholder="Paste your own lecture notes here..." value={form.content} onChange={(e)=>setValue("content",e.target.value)}/></label><label className="integrity-checkbox"><input type="checkbox" checked={form.confirm} onChange={(e)=>setValue("confirm",e.target.checked)}/><span>These are my own permitted study notes, not protected exam or quiz materials.</span></label><button disabled={loading} className="primary-button full-width">{loading ? "Sharing..." : "Share my notes"} <ArrowUpRight size={17}/></button></form></>
          : modal === "group" ? <><div className="dialog-icon"><UsersRound size={23}/></div><h2>Start a study group</h2><p className="dialog-subtitle">Make it easy for classmates to study together.</p><form onSubmit={submitGroup}><label className="form-label">Course<select className="form-control" value={selectedCourse} required onChange={(e)=>setSelectedCourse(e.target.value)}><option value="">Choose a course...</option>{myCourseList.map((c)=><option key={c.id} value={c.id}>{c.code}</option>)}</select></label><label className="form-label">Group name<input className="form-control" required maxLength={120} placeholder="e.g. Sunday study circle" value={form.title} onChange={(e)=>setValue("title",e.target.value)}/></label><label className="form-label">What will you work on?<textarea className="form-control" maxLength={500} placeholder="Topics, goals, or activities..." value={form.description} onChange={(e)=>setValue("description",e.target.value)}/></label><label className="form-label">Location<input className="form-control" maxLength={120} placeholder="Library, cafe, or online" value={form.location} onChange={(e)=>setValue("location",e.target.value)}/></label><label className="form-label">Meet-up date and time <span className="optional">(optional)</span><input type="datetime-local" className="form-control" value={form.meet} onChange={(e)=>setValue("meet",e.target.value)}/></label><button disabled={loading} className="primary-button full-width">{loading ? "Creating..." : "Create study group"} <ArrowUpRight size={17}/></button></form></> : null}
        </section>
      </div>}
    </div>
  );
}
