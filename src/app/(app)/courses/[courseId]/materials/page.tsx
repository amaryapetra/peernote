import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteCourseMaterial } from "@/app/actions/materials";
import { UploadMaterialForm, LinkMaterialForm } from "@/components/material-forms";
import { ReportContentForm } from "@/components/report-content-form";
import { Card, EmptyState, Badge } from "@/components/ui";
import { getCourse } from "@/lib/data";
import { formatDate } from "@/lib/format";
import { fileKindLabel, isInlineImage } from "@/lib/material-files";
import type { Tables } from "@/lib/database.types";

export const metadata: Metadata = { title: "Class materials" };
type Material = Tables<"course_materials">;

export default async function MaterialsPage({ params, searchParams }: PageProps<"/courses/[courseId]/materials">) {
  const { courseId } = await params;
  const { course, user, supabase, enrolled } = await getCourse(courseId);
  if (!enrolled) notFound();
  const query = await searchParams;
  const q = typeof query.q === "string" ? query.q.trim().replace(/[%_,()*\\]/g," ").slice(0,80) : "";
  const page = Math.min(10000,Math.max(1,Number.parseInt(String(query.page ?? "1"),10)||1));
  const pageSize = 24;
  const pageHref = (next:number) => {
    const params = new URLSearchParams(q?{q}:{});
    params.set("page",String(next));
    return `/courses/${courseId}/materials?${params.toString()}`;
  };
  let list = supabase.from("course_materials")
    .select("*", {count:"exact"}).eq("course_id", course.id)
    .order("lecture_date", { ascending: false })
    .order("created_at", { ascending: false }).range((page-1)*pageSize,page*pageSize-1);
  if (q) list = list.ilike("title", `%${q}%`);
  const { data, error, count } = await list;
  const totalPages = Math.max(1,Math.ceil((count??0)/pageSize));
  const materials = (data ?? []) as Material[];
  const byDate = new Map<string, Material[]>();
  for (const item of materials) {
    const list = byDate.get(item.lecture_date) ?? [];
    list.push(item);
    byDate.set(item.lecture_date, list);
  }
  return (
    <div className="space-y-8">
      <header>
        <h2 className="font-display text-2xl font-semibold">Class materials</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Keep authorized slides, handouts, readings, and Canvas links alongside your course notes. Only joined members can see shared files.
        </p>
      </header>
      <form role="search" className="flex max-w-md gap-2">
        <label htmlFor="material-search" className="sr-only">Search class materials</label>
        <input id="material-search" name="q" defaultValue={q} placeholder="Search by title" className="h-10 min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 text-sm"/>
        <button type="submit" className="rounded-lg bg-brand px-4 text-sm font-medium text-on-brand">Search</button>
      </form>
      <div className="flex items-center justify-between gap-2 text-sm text-muted">
        <span>{count??0} item{count===1?"":"s"} · page {page} of {totalPages}</span>
        <div className="flex gap-2">
          {page>1 && <Link href={pageHref(page-1)} className="rounded-md border border-line px-3 py-1">Previous</Link>}
          {page<totalPages && <Link href={pageHref(page+1)} className="rounded-md border border-line px-3 py-1">Next</Link>}
        </div>
      </div>
      {query.added === "1" && <p role="status" className="rounded-lg border border-line bg-brand-soft p-3 text-sm">Class material link added.</p>}
      {query.deleted === "1" && <p role="status" className="rounded-lg border border-line bg-brand-soft p-3 text-sm">Material removed.</p>}
      {error ? (
        <p role="alert" className="text-sm text-danger">Unable to load class materials.</p>
      ) : byDate.size === 0 ? (
        <EmptyState title={q?"No matching materials":"No class materials yet"}>{q?"Try another search term.":"Upload authorized class files or link to materials in Canvas to get started."}</EmptyState>
      ) : (
        <div className="space-y-7">
          {[...byDate.entries()].map(([date, items]) => (
            <section key={date} aria-label={formatDate(date)} className="space-y-3">
              <h3 className="font-display text-lg font-semibold">{formatDate(date)}</h3>
              <ul className="grid gap-3 md:grid-cols-2">
                {items.map((item) => (
                  <li key={item.id} id={`material-${item.id}`} className="scroll-mt-24 rounded-xl border border-line bg-surface p-4">
                    <div className="flex items-center justify-between gap-3">
                      <Badge tone={item.source_type === "file" ? "brand" : "neutral"}>
                        {fileKindLabel(item.file_type)}
                      </Badge>
                      {item.uploaded_by !== user.id && <ReportContentForm courseId={course.id} targetId={item.id} targetType="material" />}
                      {item.uploaded_by === user.id && (
                        <form action={deleteCourseMaterial}>
                          <input type="hidden" name="materialId" value={item.id} />
                          <button className="text-xs text-muted hover:text-danger" type="submit" aria-label={`Remove ${item.title}`}>Remove</button>
                        </form>
                      )}
                    </div>
                    <h4 className="mt-2 font-display text-lg font-semibold">{item.title}</h4>
                    {item.description && <p className="mt-1 text-sm text-muted">{item.description}</p>}
                    {item.ai_allowed && item.extracted_text && <p className="mt-2 text-xs text-brand">Available to AI study tools</p>}
                    {item.source_type === "link" && item.link_url ? (
                      <a href={item.link_url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-sm font-medium text-brand hover:underline">
                        Open in Canvas / source site
                      </a>
                    ) : (
                      <div className="mt-3 space-y-2">
                        <Link href={`/api/materials/${item.id}`} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-brand hover:underline">
                          {item.file_type === "pdf" ? "Open PDF" : isInlineImage(item.file_type) ? "Open image" : `Download ${item.file_name ?? "file"}`}
                        </Link>
                        {item.file_type === "pdf" ? (
                          <details className="rounded-lg border border-line p-3">
                            <summary className="cursor-pointer text-sm font-medium">Preview PDF slides</summary>
                            <iframe title={`Preview ${item.title}`} src={`/api/materials/${item.id}`}
                              loading="lazy" className="mt-3 h-[28rem] w-full rounded-md border border-line" />
                          </details>
                        ) : isInlineImage(item.file_type) ? (
                          <details className="rounded-lg border border-line p-3">
                            <summary className="cursor-pointer text-sm font-medium">Preview image</summary>
                            {/* eslint-disable-next-line @next/next/no-img-element -- private, short-lived signed URL */}
                            <img src={`/api/materials/${item.id}`} alt={item.title} loading="lazy" className="mt-3 max-h-[28rem] w-full rounded-md border border-line object-contain" />
                          </details>
                        ) : item.extracted_text ? (
                          <details className="rounded-lg border border-line p-3">
                            <summary className="cursor-pointer text-sm font-medium">Preview text</summary>
                            <p className="mt-2 text-xs text-muted">Text-only preview. Download the file to see its full layout.</p>
                            <pre className="mt-2 max-h-96 overflow-auto whitespace-pre-wrap break-words text-sm text-muted">{item.extracted_text}</pre>
                          </details>
                        ) : null}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <h3 className="font-display text-xl font-semibold">Upload class materials</h3>
          <p className="mb-5 mt-1 text-sm text-muted">Share slides, handouts, readings, or any other class file, only when the instructor or copyright holder allows it.</p>
          <UploadMaterialForm courseId={course.id} />
        </Card>
        <Card>
          <h3 className="font-display text-xl font-semibold">Link to Canvas materials</h3>
          <p className="mb-5 mt-1 text-sm text-muted">For materials that cannot be redistributed, link to the original restricted source instead.</p>
          <LinkMaterialForm courseId={course.id} />
        </Card>
      </div>
    </div>
  );
}
