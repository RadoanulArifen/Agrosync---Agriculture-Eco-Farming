'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, CloudRain, Droplets, Gauge, MapPin, Search, ThermometerSun, Wind } from 'lucide-react';
import Navbar from '@/components/landing/Navbar';
import { Footer } from '@/components/landing/Sections';
import { weatherService } from '@/services';
import type { WeatherForecast } from '@/types';

const QUICK_DISTRICTS = ['Dhaka', 'Mymensingh', 'Rajshahi', 'Sylhet', 'Khulna', 'Barishal'];

export default function WeatherAlertsPage() {
  const [district, setDistrict] = useState('Dhaka');
  const [query, setQuery] = useState('Dhaka');
  const [weather, setWeather] = useState<WeatherForecast | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    weatherService.getWeatherForecast(district).then((forecast) => {
      if (!isMounted) return;
      setWeather(forecast);
      setLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [district]);

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextDistrict = query.trim();
    if (nextDistrict) setDistrict(nextDistrict);
  };

  const current = weather?.current;

  return (
    <main className="min-h-screen overflow-hidden bg-slate-950 text-white">
      <Navbar />

      <section className="relative px-4 pb-20 pt-28">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(14,165,233,0.35),transparent_28%),radial-gradient(circle_at_80%_5%,rgba(34,197,94,0.25),transparent_26%),linear-gradient(145deg,#082f49_0%,#0f172a_48%,#132e1f_100%)]" />
        <div className="absolute left-10 top-40 h-52 w-52 rounded-full bg-cyan-300/10 blur-3xl" />
        <div className="absolute bottom-10 right-10 h-64 w-64 rounded-full bg-harvest/10 blur-3xl" />

        <div className="container relative mx-auto">
          <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-cyan-100 backdrop-blur">
                <CloudRain className="h-4 w-4" />
                Real-time WeatherAPI forecast
              </div>
              <h1 className="font-display text-4xl font-bold leading-tight md:text-6xl">
                Weather Alerts for Smarter Farming
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-slate-200">
                Check current temperature, humidity, rain, wind, and crop-friendly advisories in a dedicated weather page.
              </p>

              <form onSubmit={handleSearch} className="mt-8 flex max-w-xl flex-col gap-3 rounded-2xl border border-white/15 bg-white/10 p-3 backdrop-blur sm:flex-row">
                <div className="flex flex-1 items-center gap-3 rounded-xl bg-white px-4 py-3 text-slate-900">
                  <Search className="h-5 w-5 text-slate-400" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    className="w-full bg-transparent text-base outline-none"
                    placeholder="Search district, e.g. Mymensingh"
                  />
                </div>
                <button className="rounded-xl bg-harvest px-6 py-3 font-bold text-white transition hover:bg-harvest-dark">
                  Show Weather
                </button>
              </form>

              <div className="mt-5 flex flex-wrap gap-2">
                {QUICK_DISTRICTS.map((name) => (
                  <button
                    key={name}
                    onClick={() => {
                      setQuery(name);
                      setDistrict(name);
                    }}
                    className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white/85 transition hover:bg-white/20"
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/15 bg-white/10 p-5 shadow-2xl shadow-cyan-950/40 backdrop-blur-xl">
              {loading || !current ? (
                <div className="flex min-h-[360px] items-center justify-center text-cyan-100">
                  Loading live weather...
                </div>
              ) : (
                <div className="relative overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-sky-400 via-cyan-500 to-emerald-500 p-6">
                  <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/20 blur-2xl" />
                  <div className="relative">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 text-sm font-semibold text-white/80">
                          <MapPin className="h-4 w-4" />
                          {weather.location}
                        </div>
                        <h2 className="mt-4 text-6xl font-black leading-none">{current.tempMax}°C</h2>
                        <p className="mt-2 text-lg font-semibold">{current.condition}</p>
                      </div>
                      <div className="text-7xl drop-shadow-lg">{current.icon}</div>
                    </div>

                    <div className="mt-8 grid grid-cols-2 gap-3">
                      <WeatherMetric icon={Droplets} label="Humidity" value={`${current.humidity}%`} />
                      <WeatherMetric icon={CloudRain} label="Rainfall" value={`${current.rainfall} mm`} />
                      <WeatherMetric icon={Wind} label="Wind" value={`${current.windSpeed} km/h`} />
                      <WeatherMetric icon={ThermometerSun} label="Low / High" value={`${current.tempMin}° / ${current.tempMax}°`} />
                    </div>

                    {current.advisory && (
                      <div className="mt-5 rounded-2xl border border-white/20 bg-white/20 p-4 text-sm font-medium leading-6 text-white">
                        {current.advisory}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {weather && !loading && (
            <div className="mt-10 grid gap-6 lg:grid-cols-[0.7fr_1.3fr]">
              <div className="rounded-3xl border border-white/10 bg-white/10 p-6 backdrop-blur">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-amber-400/20 p-3 text-amber-200">
                    <AlertTriangle className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Weather Alerts</h2>
                    <p className="text-sm text-slate-300">Auto-generated from live forecast data.</p>
                  </div>
                </div>
                <div className="mt-5 space-y-3">
                  {(weather.alerts.length ? weather.alerts : ['No severe weather alert right now. Conditions look manageable for regular farm activity.']).map((alert) => (
                    <div key={alert} className="rounded-2xl border border-white/10 bg-slate-950/35 p-4 text-sm leading-6 text-slate-100">
                      {alert}
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {weather.forecast.slice(0, 4).map((day) => (
                  <div key={day.date} className="rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur transition hover:-translate-y-1 hover:bg-white/15">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-sm font-bold text-white">{new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</div>
                        <div className="mt-1 text-xs text-slate-300">{day.condition}</div>
                      </div>
                      <div className="text-4xl">{day.icon}</div>
                    </div>
                    <div className="mt-5 flex items-end gap-2">
                      <span className="text-4xl font-black">{day.tempMax}°</span>
                      <span className="pb-1 text-sm text-slate-300">/{day.tempMin}°</span>
                    </div>
                    <div className="mt-5 space-y-2 text-sm text-slate-200">
                      <div className="flex items-center justify-between">
                        <span>Rain</span>
                        <span className="font-semibold">{day.rainfall} mm</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Humidity</span>
                        <span className="font-semibold">{day.humidity}%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Wind</span>
                        <span className="font-semibold">{day.windSpeed} km/h</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-10 text-center">
            <Link href="/" className="inline-flex items-center gap-2 rounded-full border border-white/15 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/10">
              Back to Home
              <Gauge className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}

function WeatherMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Droplets;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-white/20 p-4">
      <Icon className="mb-3 h-5 w-5 text-white/85" />
      <div className="text-xs font-semibold uppercase tracking-wider text-white/70">{label}</div>
      <div className="mt-1 text-lg font-bold text-white">{value}</div>
    </div>
  );
}
