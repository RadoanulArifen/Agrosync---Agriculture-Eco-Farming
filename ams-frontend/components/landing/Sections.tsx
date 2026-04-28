'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Star, ShoppingCart, ArrowRight, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { authService, productService } from '@/services';
import { MOCK_TESTIMONIALS } from '@/services/mockData';
import { MOCK_BLOG_POSTS } from '@/services/mockData';
import { DASHBOARD_ROUTES } from '@/constants';
import type { Product } from '@/types';
import { formatBDT, formatDate } from '@/utils';

// ===================== PRODUCTS SECTION =====================
type ProductsSectionProps = {
  eyebrow?: string;
  heading?: string;
  showViewAll?: boolean;
  viewAllHref?: string;
  category?: string;
  group?: 'agriculture' | 'farmer';
};

const AGRICULTURE_PRODUCT_CATEGORIES = ['Fertilizer', 'Pesticide', 'Seed', 'Medicine', 'Equipment'];
const FARMER_PRODUCT_CATEGORIES = ['Organic', 'Fresh Vegetables', 'Dairy'];

export function ProductsSection({
  eyebrow = 'Latest Projects List',
  heading = 'Featured Products',
  showViewAll = true,
  viewAllHref = '/agriculture-products',
  category,
  group,
}: ProductsSectionProps) {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    let isMounted = true;

    productService.getPublicProducts(category).then((items) => {
      if (!isMounted) return;
      const filteredItems = items.filter((item) => {
        if (group === 'agriculture') return AGRICULTURE_PRODUCT_CATEGORIES.includes(item.category);
        if (group === 'farmer') return FARMER_PRODUCT_CATEGORIES.includes(item.category);
        return true;
      });
      setProducts([...filteredItems].sort(() => Math.random() - 0.5));
    });

    return () => {
      isMounted = false;
    };
  }, [category, group]);

  const handlePurchaseFromHome = (product: Product) => {
    const currentFarmer = authService.getCurrentFarmer();
    if (currentFarmer?.id) {
      router.push(`/dashboard/farmer/marketplace?addProduct=${encodeURIComponent(product.id)}`);
      return;
    }

    const currentUser = authService.getCurrentUser();
    if (currentUser?.role === 'farmer') {
      router.push(`/dashboard/farmer/marketplace?addProduct=${encodeURIComponent(product.id)}`);
      return;
    }

    if (currentUser?.role && currentUser.role in DASHBOARD_ROUTES) {
      router.push(DASHBOARD_ROUTES[currentUser.role as keyof typeof DASHBOARD_ROUTES]);
      return;
    }

    router.push('/auth/farmer-login');
  };

  return (
    <section id="products" className="py-20 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-14">
          <div className="section-subheading">{eyebrow}</div>
          <h2 className="section-heading">{heading}</h2>
        </div>

        {products.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center text-gray-500">
            No {category ? `${category.toLowerCase()} ` : ''}products uploaded yet. New seller products will appear here automatically.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
            <div key={product.id} className="card overflow-hidden group">
              <div className="relative overflow-hidden">
                <div
                  className="h-52 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                  style={{ backgroundImage: `url(${product.photos[0]})` }}
                />
                <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-lg px-2 py-1">
                  <span className="text-xs font-semibold text-gray-700">{product.category}</span>
                </div>
              </div>

              <div className="p-5">
                <h3 className="font-bold text-gray-800 mb-1 line-clamp-1">{product.nameEn}</h3>
                <p className="text-gray-400 text-xs mb-3 line-clamp-2">{product.description}</p>

                <div className="flex items-center gap-1 mb-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`w-3.5 h-3.5 ${i < Math.floor(product.rating) ? 'text-harvest fill-harvest' : 'text-gray-200 fill-gray-200'}`}
                    />
                  ))}
                  <span className="text-xs text-gray-400 ml-1">({product.reviewCount})</span>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xl font-bold text-forest">{formatBDT(product.price)}</div>
                    <div className="text-xs text-gray-400">per {product.unit}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handlePurchaseFromHome(product)}
                    className="flex items-center gap-2 bg-forest text-white text-sm px-4 py-2 rounded-xl hover:bg-forest-light transition-colors"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    Add to Cart
                  </button>
                </div>
              </div>
            </div>
            ))}
          </div>
        )}

        {showViewAll && (
          <div className="text-center mt-10">
            <a href={viewAllHref} className="btn-primary inline-flex items-center gap-2">
              View All Products <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        )}
      </div>
    </section>
  );
}

// ===================== CTA BANNER =====================
export function CTABanner() {
  return (
    <section className="py-20 relative overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1600&q=80)' }}
      />
      <div className="absolute inset-0 bg-forest/80" />
      <div className="relative container mx-auto px-4 text-center">
        <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
          Providing High Quality Products
        </h2>
        <a href="/auth/farmer-login" className="btn-primary">
          Discover More
        </a>
      </div>
    </section>
  );
}

// ===================== TESTIMONIALS SECTION =====================
export function TestimonialsSection() {
  const [idx, setIdx] = useState(0);
  const t = MOCK_TESTIMONIALS[idx];

  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4 max-w-3xl text-center">
        <div className="flex justify-center gap-1 mb-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} className="w-5 h-5 text-harvest fill-harvest" />
          ))}
        </div>

        <blockquote className="text-gray-600 text-lg leading-relaxed mb-8 min-h-[80px]">
          &ldquo;{t.text}&rdquo;
        </blockquote>

        <div className="flex items-center justify-center gap-4 mb-8">
          <img
            src={t.avatar}
            alt={t.name}
            className="w-14 h-14 rounded-full object-cover border-2 border-harvest"
          />
          <div className="text-left">
            <div className="font-bold text-gray-800">{t.name}</div>
            <div className="text-sm text-gray-400">{t.role}, {t.district}</div>
          </div>
        </div>

        <div className="flex justify-center gap-3">
          <button
            onClick={() => setIdx((idx - 1 + MOCK_TESTIMONIALS.length) % MOCK_TESTIMONIALS.length)}
            className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center hover:bg-forest hover:text-white hover:border-forest transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            {MOCK_TESTIMONIALS.map((_, i) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                className={`w-2.5 h-2.5 rounded-full transition-colors ${i === idx ? 'bg-harvest' : 'bg-gray-200'}`}
              />
            ))}
          </div>
          <button
            onClick={() => setIdx((idx + 1) % MOCK_TESTIMONIALS.length)}
            className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center hover:bg-forest hover:text-white hover:border-forest transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </section>
  );
}

// ===================== BLOG SECTION =====================
export function BlogSection() {
  return (
    <section id="blog" className="py-20 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-start">
          <div>
            <div className="section-subheading">Our Blog</div>
            <h2 className="section-heading">Latest News &amp; Articles<br />Directly from Blog</h2>
          </div>
          <div>
            <p className="text-gray-500 leading-relaxed">
              Stay up to date with agricultural tips, seasonal advisories, success stories from our farmers, and the latest news from the world of smart farming in Bangladesh.
            </p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-10">
          {MOCK_BLOG_POSTS.map((post) => (
            <article key={post.id} className="card overflow-hidden group cursor-pointer">
              <div className="overflow-hidden">
                <div
                  className="h-48 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                  style={{ backgroundImage: `url(${post.thumbnail})` }}
                />
              </div>
              <div className="p-5">
                <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
                  <span className="bg-harvest/10 text-harvest px-2 py-0.5 rounded-full font-medium">{post.category}</span>
                  <span>{formatDate(post.publishedAt)}</span>
                  <span>{post.readTime} min read</span>
                </div>
                <h3 className="font-bold text-gray-800 mb-2 group-hover:text-forest transition-colors">{post.title}</h3>
                <p className="text-gray-400 text-sm line-clamp-2">{post.excerpt}</p>
                <button className="mt-4 text-forest text-sm font-semibold flex items-center gap-1 hover:text-harvest transition-colors">
                  Read More <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

// ===================== GROWTH BANNER =====================
export function GrowthBanner() {
  return (
    <section className="py-12 bg-white border-y border-gray-100">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center gap-8">
        <div className="flex-1">
          <div className="section-subheading">Our Commitment</div>
          <h3 className="text-2xl font-bold text-forest">We Care About Our Agriculture Growth</h3>
          <p className="text-gray-500 mt-3 text-sm leading-relaxed">
            Every farmer registered on AgriculMS gets access to AI-powered advice, a quality marketplace, and direct market connections — helping transform Bangladesh agriculture.
          </p>
        </div>
          <div
            className="w-full md:w-72 h-40 sm:h-48 rounded-2xl bg-cover bg-center shadow-lg flex-shrink-0"
            style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=600&q=80)' }}
          />
      </div>
    </section>
  );
}

// ===================== CONTACT SECTION =====================
export function ContactSection() {
  return (
    <section id="contact" className="py-20 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-12 items-center">
          {/* Farmer image */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="w-56 h-56 sm:w-72 sm:h-72 rounded-full overflow-hidden border-8 border-white shadow-2xl">
                <div
                  className="w-full h-full bg-cover bg-center"
                  style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1589923188900-85dae523342b?w=600&q=80)' }}
                />
              </div>
              <div className="absolute -top-4 -right-4 w-16 h-16 bg-harvest rounded-full flex items-center justify-center shadow-lg">
                <span className="text-2xl">🌱</span>
              </div>
              <div className="absolute -bottom-4 -left-4 w-12 h-12 bg-forest rounded-full shadow-lg" />
            </div>
          </div>

          {/* Contact form */}
          <div>
            <div className="section-subheading">Get In Touch</div>
            <h2 className="section-heading">Leave Us a Message</h2>

            <form className="mt-8 space-y-4" onSubmit={(e) => e.preventDefault()}>
              <input type="text" placeholder="Your Name" className="input-field" />
              <input type="email" placeholder="Email Address" className="input-field" />
              <input type="tel" placeholder="Phone Number (+880...)" className="input-field" />
              <textarea rows={4} placeholder="Your Message" className="input-field resize-none" />
              <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2">
                Send Message
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}

// ===================== PARTNER LOGOS =====================
const PARTNERS = ['OrganicFood', 'BanglaSeed', 'BARI', 'DAE', 'BRRI'];

export function PartnersSection() {
  return (
    <section className="py-12 bg-white border-t border-gray-100">
      <div className="container mx-auto px-4">
        <div className="flex flex-wrap items-center justify-center gap-10">
          {PARTNERS.map((name) => (
            <div key={name} className="text-gray-300 font-bold text-lg tracking-wide hover:text-gray-400 transition-colors cursor-pointer">
              {name}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ===================== FOOTER =====================
export function Footer() {
  const LINKS = {
    Links: ['Home', 'About Us', 'Services', 'Products', 'Blog', 'Contact'],
    News: ['Latest Projects', 'Blog Posts', 'Press Release', 'Partnership', 'Careers'],
    Contact: [
      '📍 Mymensingh, Bangladesh',
      '📞 +880 1711-234567',
      '✉️ info@agriculms.com.bd',
      '🌐 www.agriculms.com.bd',
    ],
  };

  return (
    <footer className="bg-forest text-white">
      <div className="container mx-auto px-4 py-16">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div>
            <div className="text-2xl font-bold mb-4">Agricul<span className="text-harvest">MS</span></div>
            <p className="text-white/60 text-sm leading-relaxed mb-6">
              AI-Powered Digital Agriculture Platform for Bangladesh — connecting farmers, officers, vendors, and buyers.
            </p>
            <div className="flex gap-3">
              {['f', 'tw', 'in', 'yt'].map((s) => (
                <div key={s} className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-harvest transition-colors cursor-pointer text-xs font-bold">
                  {s.toUpperCase()}
                </div>
              ))}
            </div>
          </div>

          {Object.entries(LINKS).map(([title, items]) => (
            <div key={title}>
              <h4 className="font-bold text-white mb-4">{title}</h4>
              <ul className="space-y-2">
                {items.map((item) => (
                  <li key={item}>
                    <a href="#" className="text-white/60 text-sm hover:text-harvest transition-colors">{item}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-white/10 py-6">
        <div className="container mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-white/50 text-sm">
          <span>© 2026 AgriculMS. All rights reserved.</span>
          <span>Built for Bangladeshi Farmers 🇧🇩</span>
        </div>
      </div>
    </footer>
  );
}
