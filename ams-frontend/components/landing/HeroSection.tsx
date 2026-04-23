'use client';
import Link from 'next/link';
import { ArrowRight, Leaf, ShieldCheck, TrendingUp } from 'lucide-react';

const HERO_STATS = [
  { label: 'Registered Farmers', value: '12,450+' },
  { label: 'Advisory Cases Resolved', value: '45,890+' },
  { label: 'Districts Covered', value: '64' },
];

export default function HeroSection() {
  return (
    <section
      id="home"
      className="relative min-h-screen flex items-center overflow-hidden pt-24 sm:pt-28 lg:pt-0"
      style={{
        background: 'linear-gradient(135deg, #0d2818 0%, #1a4731 40%, #2d6a4f 70%, #1a4731 100%)',
      }}
    >
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      {/* Decorative circles */}
      <div className="absolute top-20 right-0 sm:right-10 w-72 sm:w-96 h-72 sm:h-96 rounded-full bg-harvest/10 blur-3xl" />
      <div className="absolute bottom-10 left-0 sm:left-10 w-48 sm:w-64 h-48 sm:h-64 rounded-full bg-primary-500/10 blur-3xl" />

      {/* Floating image collage */}
      <div className="absolute right-0 top-0 bottom-0 w-1/2 hidden lg:block">
        <div className="relative h-full">
          <div
            className="absolute top-24 right-8 w-56 h-56 rounded-2xl overflow-hidden shadow-2xl rotate-3"
            style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=400&q=80)', backgroundSize: 'cover', backgroundPosition: 'center' }}
          />
          <div
            className="absolute top-40 right-72 w-48 h-48 rounded-2xl overflow-hidden shadow-2xl -rotate-2"
            style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=400&q=80)', backgroundSize: 'cover', backgroundPosition: 'center' }}
          />
          <div
            className="absolute bottom-32 right-20 w-64 h-44 rounded-2xl overflow-hidden shadow-2xl rotate-1"
            style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&q=80)', backgroundSize: 'cover', backgroundPosition: 'center' }}
          />
          {/* Windmill graphic */}
          <div className="absolute top-16 right-32 text-7xl opacity-20 select-none">⚡</div>
        </div>
      </div>

      {/* Content */}
      <div className="relative container mx-auto px-4 py-16 sm:py-20 lg:py-0 lg:w-1/2">
        {/* Label */}
        <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2 mb-6">
          <Leaf className="w-4 h-4 text-harvest" />
          <span className="text-white/90 text-sm font-medium">Welcome to Agriculture Farm</span>
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl xl:text-7xl font-bold text-white leading-tight mb-6">
          Agriculture
          <span className="block text-harvest">&amp; Eco Farming</span>
        </h1>

        <p className="text-white/70 text-base sm:text-lg md:text-xl mb-8 max-w-xl leading-relaxed">
          Bangladesh&apos;s first AI-powered agricultural platform. Get expert crop advisory, buy quality inputs, and sell your harvest — all in one place.
        </p>

        {/* Feature pills */}
        <div className="flex flex-wrap gap-3 mb-10">
          {[
            { icon: ShieldCheck, label: 'AI Crop Diagnosis' },
            { icon: Leaf, label: 'Organic Products' },
            { icon: TrendingUp, label: 'Price Tracking' },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
              <Icon className="w-4 h-4 text-harvest" />
              <span className="text-white/90 text-sm">{label}</span>
            </div>
          ))}
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-4 mb-14 max-w-xl">
          <Link href="/auth/farmer-login" className="btn-primary flex items-center justify-center gap-2">
            Get Started
            <ArrowRight className="w-4 h-4" />
          </Link>
          <a href="#about" className="border-2 border-white/40 text-white hover:bg-white/10 font-semibold px-6 py-3 rounded-full transition-all text-center">
            Learn More
          </a>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-1 min-[420px]:grid-cols-3 gap-6 sm:gap-8 max-w-xl">
          {HERO_STATS.map((s) => (
            <div key={s.label}>
              <div className="text-3xl font-bold text-harvest">{s.value}</div>
              <div className="text-white/60 text-sm mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom wave */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0 80L1440 80L1440 40C1200 80 960 0 720 40C480 80 240 0 0 40L0 80Z" fill="white" />
        </svg>
      </div>
    </section>
  );
}
