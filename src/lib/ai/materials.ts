import "server-only";
import type { createClient } from "@/lib/supabase/server";
import type { PromptNote } from "./notes-format";

type Db = Awaited<ReturnType<typeof createClient>>;

/** Only user-approved, text-extracted files in a joined course enter AI prompts. */
export async function getAiMaterialNotes(db: Db, courseId: string, lectureDate?: string): Promise<PromptNote[]> {
  let query = db.from("course_materials")
    .select("id, title, lecture_date, extracted_text, ai_allowed")
    .eq("course_id", courseId)
    .eq("source_type", "file")
    .eq("ai_allowed", true)
    .neq("extracted_text", "")
    .order("lecture_date", { ascending: false })
    .limit(4);
  if (lectureDate) query = query.eq("lecture_date", lectureDate);
  const { data, error } = await query;
  if (error) {
    console.error("Unable to load AI-approved course materials", error);
    throw new Error("Couldn't load the approved course materials.");
  }
  return (data ?? []).map((item) => ({
    id: item.id,
    title: item.title,
    topic: "Authorized lecture slides",
    lecture_date: item.lecture_date,
    content: item.extracted_text,
    author: "Course material",
  }));
}
