import type { Metadata } from "next";
import Link from "next/link";
import { getCourse } from "@/lib/data";
import { Card } from "@/components/ui";
export const metadata: Metadata = { title: "Video study rooms" };
export default async function VideoStudyRoomPage({params}: PageProps<"/courses/[courseId]/video">) {
 const {courseId}=await params;const {course}=await getCourse(courseId);
 return <Card className="mx-auto max-w-2xl"><h2 className="font-display text-2xl font-semibold">Private video rooms are being secured</h2><p className="mt-3 text-muted">The previous external Jitsi link did not enforce PeerNote membership. Calls are paused until a provider with authenticated access is configured.</p><Link className="mt-4 inline-block font-medium text-brand hover:underline" href={`/courses/${course.id}/groups`}>Organize a study group instead</Link></Card>;
}
