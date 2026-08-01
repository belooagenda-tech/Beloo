import { LandingHeader } from "@/components/landing/landing-header";
import { HeroSection } from "@/components/landing/hero-section";
import { AudienceSection } from "@/components/landing/audience-section";
import { HowItWorksSection } from "@/components/landing/how-it-works-section";
import { FeaturesSection } from "@/components/landing/features-section";
import { CtaSection } from "@/components/landing/cta-section";
import { LandingFooter } from "@/components/landing/landing-footer";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <LandingHeader />
      <main className="flex-1">
        <HeroSection />
        <AudienceSection />
        <HowItWorksSection />
        <FeaturesSection />
        <CtaSection />
      </main>
      <LandingFooter />
    </div>
  );
}
