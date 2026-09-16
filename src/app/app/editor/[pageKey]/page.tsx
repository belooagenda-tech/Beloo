import { notFound } from "next/navigation";
import { getOwnProfile } from "@/lib/supabase/session";
import { isPageKey, getPageInfo } from "@/lib/layout-editor/pages";
import { getLayoutMeta } from "@/lib/layout-editor/get-published";
import { themeContentSchema } from "@/lib/layout-editor/theme-schema";
import { landingContentSchema } from "@/lib/layout-editor/landing-schema";
import { blocksContentSchema } from "@/lib/layout-editor/blocks-schema";
import { ThemeEditor } from "./theme-editor";
import { LandingEditor } from "./landing-editor";
import { BlocksEditor } from "./blocks-editor";

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
  const pageInfo = getPageInfo(pageKey);

  const hasUnpublishedDraft =
    JSON.stringify(row?.draft_content ?? {}) !== JSON.stringify(row?.published_content ?? {});

  if (pageInfo.type === "theme") {
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

  if (pageInfo.type === "landing") {
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

  const draft = blocksContentSchema.safeParse(row?.draft_content ?? {});
  const published = blocksContentSchema.safeParse(row?.published_content ?? {});
  return (
    <BlocksEditor
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
