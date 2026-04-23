import Navbar from '@/components/landing/Navbar';
import { Footer } from '@/components/landing/Sections';
import { SUBSCRIPTION_PLANS } from '@/constants';
import { Check } from 'lucide-react';

export default function PricingPage() {
  return (
    <main>
      <Navbar />
      <section className="pt-32 pb-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <div className="text-harvest-dark font-semibold text-sm uppercase tracking-widest mb-3">Pricing</div>
            <h1 className="text-4xl md:text-5xl font-bold text-forest mb-4">Simple, Transparent Pricing</h1>
            <p className="text-gray-500 max-w-xl mx-auto">
              Choose the plan that fits your cooperative or organization. All plans include a 30-day free trial. Annual billing saves 20%.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {SUBSCRIPTION_PLANS.map((plan) => (
              <div key={plan.id}
                className={`rounded-2xl p-6 border transition-shadow hover:shadow-lg ${plan.id === 'professional' ? 'bg-forest text-white border-forest shadow-xl scale-105' : 'bg-white border-gray-100'}`}>
                {plan.id === 'professional' && (
                  <div className="bg-harvest text-white text-xs font-bold px-3 py-1 rounded-full inline-block mb-4">Most Popular</div>
                )}
                <h3 className={`text-xl font-bold mb-2 ${plan.id === 'professional' ? 'text-white' : 'text-gray-900'}`}>{plan.name}</h3>
                <div className="mb-6">
                  {plan.priceMonthly > 0 ? (
                    <>
                      <span className={`text-4xl font-bold ${plan.id === 'professional' ? 'text-white' : 'text-forest'}`}>৳{plan.priceMonthly.toLocaleString()}</span>
                      <span className={`text-sm ml-1 ${plan.id === 'professional' ? 'text-white/70' : 'text-gray-400'}`}>/month</span>
                    </>
                  ) : (
                    <span className={`text-2xl font-bold ${plan.id === 'professional' ? 'text-white' : 'text-forest'}`}>Custom</span>
                  )}
                </div>

                <div className="space-y-3 mb-8">
                  {Object.entries(plan.features).map(([key, value]) => (
                    <div key={key} className="flex items-start gap-2 text-sm">
                      <Check className={`w-4 h-4 flex-shrink-0 mt-0.5 ${plan.id === 'professional' ? 'text-harvest' : 'text-forest'}`} />
                      <span className={plan.id === 'professional' ? 'text-white/80' : 'text-gray-600'}>
                        {typeof value === 'boolean' ? key.replace(/([A-Z])/g, ' $1') : value}
                      </span>
                    </div>
                  ))}
                </div>

                <button className={`w-full font-semibold py-3 rounded-xl transition-colors ${plan.id === 'professional' ? 'bg-harvest text-white hover:bg-harvest-dark' : 'bg-forest text-white hover:bg-forest-light'}`}>
                  {plan.id === 'enterprise' ? 'Contact Sales' : 'Get Started Free'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
