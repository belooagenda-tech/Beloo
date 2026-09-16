import { LandingHeader } from "@/components/landing/landing-header";
import { HeroSection } from "@/components/landing/hero-section";
import { AudienceSection } from "@/components/landing/audience-section";
import { HowItWorksSection } from "@/components/landing/how-it-works-section";
import { TryDemoSection } from "@/components/landing/try-demo-section";
import { FeaturesSection } from "@/components/landing/features-section";
import { CtaSection } from "@/components/landing/cta-section";
import { LandingFooter } from "@/components/landing/landing-footer";
import { SignupTicker } from "@/components/landing/signup-ticker";
import { LandingImageBlock } from "@/components/landing/landing-image-block";
import { getPublishedLanding } from "@/lib/layout-editor/get-published";
import type { LandingSectionKey } from "@/lib/layout-editor/landing-schema";

export const revalidate = 30;

export default async function Home() {
  const content = await getPublishedLanding();

  function imageBlocksAfter(section: LandingSectionKey) {
    return (content.imageBlocks ?? [])
      .filter((block) => block.afterSection === section)
      .map((block) => <LandingImageBlock key={block.id} block={block} />);
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <LandingHeader />
      <main className="flex-1">
        <HeroSection content={content.hero} />
        {imageBlocksAfter("hero")}
        <AudienceSection content={content.audience} />
        {imageBlocksAfter("audience")}
        <HowItWorksSection content={content.howItWorks} />
        {imageBlocksAfter("how-it-works")}
        <TryDemoSection content={content.tryDemo} />
        {imageBlocksAfter("try-demo")}
        <FeaturesSection content={content.features} />
        {imageBlocksAfter("features")}
        <CtaSection content={content.cta} />
        {imageBlocksAfter("cta")}
      </main>
      <LandingFooter content={content.footer} />
      <SignupTicker />
    </div>
  );
}
