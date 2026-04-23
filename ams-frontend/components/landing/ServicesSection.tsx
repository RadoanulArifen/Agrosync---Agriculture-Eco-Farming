import Link from 'next/link';
import { Bot, ShoppingCart, CloudRain, Leaf, Package } from 'lucide-react';

const SERVICES = [
  {
    icon: Bot,
    title: 'Agriculture Products',
    desc: 'Access AI-powered crop disease diagnosis and get expert advisory from qualified DAE officers. Available in Bangla.',
    color: 'from-green-500 to-green-700',
    img: 'https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=400&q=80',
    href: '/agriculture-products?group=agriculture',
    cta: 'View Products',
  },
  {
    icon: Leaf,
    title: 'Organic Products',
    desc: 'Browse a curated marketplace of certified organic fertilizers, seeds, and agricultural medicines at fair prices.',
    color: 'from-emerald-400 to-teal-600',
    img: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&q=80',
    href: '/agriculture-products?category=Organic',
    cta: 'Shop Organic',
  },
  {
    icon: ShoppingCart,
    title: 'Fresh Vegetables',
    desc: 'List your fresh produce and connect directly with agricultural buying companies across Bangladesh.',
    color: 'from-lime-500 to-green-700',
    img: 'https://images.unsplash.com/photo-1566385101042-1a0aa0c1268c?w=400&q=80',
    href: '/agriculture-products?category=Fresh%20Vegetables',
    cta: 'Browse Fresh',
  },
  {
    icon: Package,
    title: 'Dairy Products',
    desc: 'Manage dairy cooperative listings, track cold-chain delivery, and connect with food processors directly.',
    color: 'from-blue-400 to-blue-600',
    img: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400&q=80',
    href: '/agriculture-products?category=Dairy',
    cta: 'Explore Dairy',
  },
  {
    icon: CloudRain,
    title: 'Weather Alerts',
    desc: 'Receive hyper-local 7-day weather forecasts with crop-specific advisory alerts via SMS and push notifications.',
    color: 'from-cyan-400 to-blue-600',
    img: 'https://images.unsplash.com/photo-1533757704860-384b14ade8d7?w=400&q=80',
    href: '/weather-alerts',
    cta: 'Check Weather',
  },
];

export default function ServicesSection() {
  return (
    <section id="services" className="py-20 bg-white">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-14">
          <div className="section-subheading">Welcome to AgriculMS</div>
          <h2 className="section-heading">What We&apos;re Offering</h2>
          <p className="text-gray-500 max-w-xl mx-auto">
            A complete agricultural ecosystem connecting farmers, officers, vendors, and buyers across Bangladesh.
          </p>
        </div>

        {/* Services grid */}
        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-8">
          {SERVICES.map((service) => {
            const Icon = service.icon;
            return (
              <Link
                key={service.title}
                href={service.href}
                className="group relative block overflow-hidden rounded-2xl cursor-pointer"
              >
                {/* Background image */}
                <div
                  className="h-60 bg-cover bg-center transition-transform duration-500 group-hover:scale-110 md:h-64"
                  style={{ backgroundImage: `url(${service.img})` }}
                />
                {/* Overlay */}
                <div className={`absolute inset-0 bg-gradient-to-t ${service.color} opacity-70 group-hover:opacity-80 transition-opacity duration-300`} />

                {/* Icon */}
                <div className="absolute top-5 right-5 w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                  <Icon className="w-6 h-6 text-white" />
                </div>

                {/* Content */}
                <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                  <h3 className="font-bold text-lg mb-1">{service.title}</h3>
                  <p className="text-white/80 text-xs line-clamp-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    {service.desc}
                  </p>
                  <span className="mt-4 inline-flex items-center rounded-full bg-white px-4 py-2 text-xs font-bold text-forest shadow-lg transition-all duration-300 group-hover:translate-y-0 group-hover:bg-harvest group-hover:text-white">
                    {service.cta}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
