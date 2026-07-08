import {
  Navbar,
  Hero,
  FeaturesSection,
  PricingSection,
  FaqSection,
  Footer,
} from "@/features/landing";

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <FeaturesSection />
        <PricingSection />
        <FaqSection />
      </main>
      <Footer />
    </>
  );
}
