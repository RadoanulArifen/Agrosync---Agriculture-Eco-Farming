import { Users, Award, Tractor, Leaf } from 'lucide-react';

const FEATURES = [
  {
    icon: Leaf,
    title: 'Organic Products',
    desc: 'Certified organic fertilizers, seeds and inputs for healthier farming',
    color: 'bg-green-50 text-green-700',
    border: 'border-green-100',
    img: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=300&q=80',
  },
  {
    icon: Award,
    title: 'Quality Standards',
    desc: 'All products meet BARI & DAE quality benchmarks for Bangladesh',
    color: 'bg-yellow-50 text-yellow-700',
    border: 'border-yellow-100',
    img: 'https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=300&q=80',
  },
  {
    icon: Tractor,
    title: 'Modern Farming',
    desc: 'AI-driven advisory and data insights for precision agriculture',
    color: 'bg-blue-50 text-blue-700',
    border: 'border-blue-100',
    img: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=300&q=80',
  },
];

export function FeatureBar() {
  return (
    <section className="py-12 bg-white">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className={`relative overflow-hidden rounded-2xl border ${f.border} p-0 group`}>
                <div
                  className="h-40 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                  style={{ backgroundImage: `url(${f.img})` }}
                />
                <div className="p-5">
                  <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold mb-2 ${f.color}`}>
                    <Icon className="w-3.5 h-3.5" />
                    {f.title}
                  </div>
                  <p className="text-gray-500 text-sm">{f.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default function AboutSection() {
  return (
    <section id="about" className="py-20 bg-gray-50 leaf-bg">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          {/* Image collage */}
          <div className="relative mb-6 lg:mb-0">
            <div className="grid grid-cols-2 gap-4">
              <div
                className="h-48 sm:h-64 rounded-2xl bg-cover bg-center shadow-lg"
                style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600&q=80)' }}
              />
              <div className="flex flex-col gap-4">
                <div
                  className="h-32 sm:h-44 rounded-2xl bg-cover bg-center shadow-lg"
                  style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&q=80)' }}
                />
                <div
                  className="h-16 rounded-2xl bg-cover bg-center shadow-lg"
                  style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=400&q=80)' }}
                />
              </div>
            </div>
            {/* Year badge */}
            <div className="mt-4 sm:mt-0 sm:absolute sm:-bottom-4 sm:-left-4 inline-block bg-harvest text-white rounded-2xl px-6 py-4 shadow-xl">
              <div className="text-3xl font-bold">৳100</div>
              <div className="text-xs opacity-80">Starting price</div>
            </div>
          </div>

          {/* Text content */}
          <div>
            <div className="section-subheading">Welcome to AgriculMS</div>
            <h2 className="section-heading">
              Better Agriculture<br />
              <span className="gradient-text">for Better Future</span>
            </h2>
            <p className="text-gray-500 leading-relaxed mb-6">
              AgriculMS connects Bangladeshi farmers with AI-powered crop advisory, expert agricultural officers, quality input marketplace, and direct crop buyers — all in one digital ecosystem.
            </p>
            <p className="text-gray-500 leading-relaxed mb-8">
              Our platform serves farmers in all 64 districts, supporting advisory in Bangla, offline PWA access, and SMS fallback for rural areas with limited connectivity.
            </p>

            <div className="grid sm:grid-cols-2 gap-4 mb-8">
              <div className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-100">
                <div className="w-10 h-10 bg-forest/10 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-forest" />
                </div>
                <div>
                  <div className="text-sm font-bold text-gray-800">Professional</div>
                  <div className="text-xs text-gray-500">DAE-trained Farmers</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-100">
                <div className="w-10 h-10 bg-harvest/10 rounded-lg flex items-center justify-center">
                  <Leaf className="w-5 h-5 text-harvest" />
                </div>
                <div>
                  <div className="text-sm font-bold text-gray-800">Organic &amp; Eco</div>
                  <div className="text-xs text-gray-500">Solutions</div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <a href="/auth/farmer-login" className="btn-primary text-sm">Discover More</a>
              <a href="#contact" className="btn-outline text-sm">Leave a Message</a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
