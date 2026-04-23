import Navbar from '@/components/landing/Navbar';
import HeroSection from '@/components/landing/HeroSection';
import AboutSection, { FeatureBar } from '@/components/landing/AboutSection';
import ServicesSection from '@/components/landing/ServicesSection';
import {
  ProductsSection, CTABanner, TestimonialsSection,
  BlogSection, GrowthBanner, ContactSection, PartnersSection, Footer,
} from '@/components/landing/Sections';

export default function HomePage() {
  return (
    <main>
      <Navbar />
      <HeroSection />
      <FeatureBar />
      <AboutSection />
      <ServicesSection />
      <ProductsSection
        eyebrow="Farmer Products"
        heading="Organic, Fresh & Dairy Products"
        group="farmer"
        showViewAll={false}
      />
      <ProductsSection
        eyebrow="Latest Projects List"
        heading="Agriculture Products"
        group="agriculture"
        viewAllHref="/agriculture-products?group=agriculture"
      />
      <CTABanner />
      <TestimonialsSection />
      <BlogSection />
      <GrowthBanner />
      <ContactSection />
      <PartnersSection />
      <Footer />
    </main>
  );
}
