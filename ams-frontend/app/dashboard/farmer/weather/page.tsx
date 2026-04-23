'use client';

import { useEffect, useState } from 'react';
import { CloudRain } from 'lucide-react';
import DashboardShell from '@/components/dashboard/DashboardShell';
import { Card, EmptyState, PageHeader, SectionHeader } from '@/components/dashboard/DashboardComponents';
import { FARMER_NAV_ITEMS, useFarmerContext } from '@/components/dashboard/useFarmerContext';
import { weatherService } from '@/services';
import type { WeatherForecast } from '@/types';

export default function FarmerWeatherPage() {
  const { farmer, unreadNotifications, loading } = useFarmerContext();
  const [weather, setWeather] = useState<WeatherForecast | null>(null);

  useEffect(() => {
    if (!farmer) return;
    weatherService.getWeatherForecast(farmer.district, farmer.upazila).then(setWeather);
  }, [farmer]);

  if (loading || !farmer) {
    return (
      <DashboardShell navItems={FARMER_NAV_ITEMS} role="farmer" userName="Farmer" userSubtitle="Loading profile..." notificationCount={0}>
        <PageHeader title="Loading weather..." subtitle="Preparing your account" />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell navItems={FARMER_NAV_ITEMS} role="farmer" userName={farmer.name} userSubtitle={`FID: ${farmer.fid}`} notificationCount={unreadNotifications}>
      <PageHeader title="Weather" subtitle={`Forecast and advisory for ${farmer.upazila ? `${farmer.upazila}, ` : ''}${farmer.district}`} />

      {!weather ? (
        <Card>
          <EmptyState icon={CloudRain} title="No weather data yet" description="Weather information will appear here shortly." />
        </Card>
      ) : (
        <div className="space-y-6">
          <Card>
            <SectionHeader title="Current Condition" subtitle={weather.current.condition} />
            <div className="grid md:grid-cols-4 gap-4">
              <div className="rounded-xl bg-gray-50 p-4">
                <div className="text-xs text-gray-400">Temperature</div>
                <div className="text-xl font-bold">{weather.current.tempMax}°C</div>
              </div>
              <div className="rounded-xl bg-gray-50 p-4">
                <div className="text-xs text-gray-400">Humidity</div>
                <div className="text-xl font-bold">{weather.current.humidity}%</div>
              </div>
              <div className="rounded-xl bg-gray-50 p-4">
                <div className="text-xs text-gray-400">Rainfall</div>
                <div className="text-xl font-bold">{weather.current.rainfall} mm</div>
              </div>
              <div className="rounded-xl bg-gray-50 p-4">
                <div className="text-xs text-gray-400">Wind</div>
                <div className="text-xl font-bold">{weather.current.windSpeed} km/h</div>
              </div>
            </div>
            {weather.current.advisory && (
              <div className="mt-4 rounded-xl border border-green-100 bg-green-50 p-4 text-sm text-green-700">
                {weather.current.advisory}
              </div>
            )}
          </Card>

          <div className="grid md:grid-cols-2 xl:grid-cols-5 gap-4">
            {weather.forecast.slice(0, 5).map((day) => (
              <Card key={day.date}>
                <div className="text-sm font-semibold text-gray-800">{day.date}</div>
                <div className="text-xs text-gray-400 mt-1">{day.condition}</div>
                <div className="text-2xl font-bold text-forest mt-3">{day.tempMax}°</div>
                <div className="text-xs text-gray-500 mt-2">Humidity {day.humidity}%</div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
