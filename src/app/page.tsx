import { createAdminClient } from "@/lib/supabase/admin";
import { LandingHeader } from "@/components/landing/landing-header";
import { HeroSection } from "@/components/landing/hero-section";
import { FeaturesSection } from "@/components/landing/features-section";
import { HowItWorksSection } from "@/components/landing/how-it-works-section";
import { ScreenshotsSection } from "@/components/landing/screenshots-section";
import { AudienceSection } from "@/components/landing/audience-section";
import { TestimonialsSection } from "@/components/landing/testimonials-section";
import { PricingSection } from "@/components/landing/pricing-section";
import { FaqSection } from "@/components/landing/faq-section";
import { CtaSection } from "@/components/landing/cta-section";
import { LandingFooter } from "@/components/landing/landing-footer";

export const revalidate = 30;

export default async function Home() {
  const admin = createAdminClient();
  const { data: plan } = await admin
    .from("saas_plans")
    .select("valor_mensal_pro, valor_mensal_studio")
    .limit(1)
    .maybeSingle();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <LandingHeader />
      <main className="flex-1">
        <HeroSection />
        <FeaturesSection />
        <HowItWorksSection />
        <ScreenshotsSection />
        <AudienceSection />
        <TestimonialsSection />
        <PricingSection
          valorPro={plan?.valor_mensal_pro ?? 49.9}
          valorStudio={plan?.valor_mensal_studio ?? 89.9}
        />
        <FaqSection />
        <CtaSection />
      </main>
      <LandingFooter />
    </div>
  );
}
