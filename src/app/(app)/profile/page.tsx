import type { Metadata } from "next";
import { ProfileForm } from "@/components/profile-form";
import { Alert, Card, PageHeader } from "@/components/ui";
import { getViewer } from "@/lib/auth";

export const metadata: Metadata = { title: "Your profile" };

export default async function ProfilePage({ searchParams }: PageProps<"/profile">) {
  const { user, profile, supabase } = await getViewer();
  const sp = await searchParams;
  const { data: contact } = await supabase.from("contact_cards").select("contact, phone").eq("user_id", user.id).maybeSingle();

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Your profile" description="Classmates in your courses see your name, major, bio, and study preferences." />
      {sp.welcome === "1" && (
        <div className="mb-6">
          <Alert tone="success">
            Welcome to PeerNote! Tell classmates a bit about how you study, then head to Courses to join your classes.
          </Alert>
        </div>
      )}
      <Card>
        <ProfileForm
          initial={{
            full_name: profile?.full_name ?? "",
            school: profile?.school ?? "Tulane University",
            major: profile?.major ?? "",
            grad_year: profile?.grad_year ?? null,
            bio: profile?.bio ?? "",
            study_styles: profile?.study_styles ?? [],
            availability: profile?.availability ?? [],
            contact: contact?.contact ?? "",
            phone: contact?.phone ?? "",
          }}
        />
      </Card>
      <p className="mt-4 text-sm text-muted">Signed in as {user.email}</p>
    </div>
  );
}
