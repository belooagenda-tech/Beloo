import { notFound } from "next/navigation";
import { getOwnProfile } from "@/lib/supabase/session";
import { isPageKey, EDITABLE_PAGES } from "@/lib/layout-editor/pages";
import { getLayoutMeta } from "@/lib/layout-editor/get-published";
import { themeContentSchema } from "@/lib/layout-editor/theme-schema";
import { landingContentSchema } from "@/lib/layout-editor/landing-schema";
import { ThemeEditor } from "./theme-editor";
import { LandingEditor } from "./landing-editor";

export default async function EditorPageKeyPage({
  params,
}: {
  params: Promise<{ pageKey: string }>;
}) {
  const { pageKey } = await params;
  if (!isPageKey(pageKey)) notFound();

  const profile = await getOwnProfile();
  const isAdmin = profile?.is_admin ?? false;

  const row = await getLayoutMeta(pageKey);
  const pageInfo = EDITABLE_PAGES.find((p) => p.key === pageKey)!;

  const hasUnpublishedDraft =
    JSON.stringify(row?.draft_content ?? {}) !== JSON.stringify(row?.published_content ?? {});

  if (pageKey === "global-theme") {
    const draft = themeContentSchema.safeParse(row?.draft_content ?? {});
    const published = themeContentSchema.safeParse(row?.published_content ?? {});
    return (
      <ThemeEditor
        pageKey={pageKey}
        pageLabel={pageInfo.label}
        isAdmin={isAdmin}
        initialDraft={draft.success ? draft.data : {}}
        initialPublished={published.success ? published.data : {}}
        hasUnpublishedDraft={hasUnpublishedDraft}
        publishedAt={row?.published_at ?? null}
      />
    );
  }

  const draft = landingContentSchema.safeParse(row?.draft_content ?? {});
  const published = landingContentSchema.safeParse(row?.published_content ?? {});
  return (
    <LandingEditor
      pageKey={pageKey}
      pageLabel={pageInfo.label}
      isAdmin={isAdmin}
      initialDraft={draft.success ? draft.data : {}}
      initialPublished={published.success ? published.data : {}}
      hasUnpublishedDraft={hasUnpublishedDraft}
      publishedAt={row?.published_at ?? null}
    />
  );
}
