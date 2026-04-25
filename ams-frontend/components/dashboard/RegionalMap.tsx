'use client';

import React, { useEffect, useState } from 'react';
import { bangladeshDistricts, bangladeshBounds } from '@/utils/bangladeshDistricts';
import { advisoryService } from '@/services';

interface RegionalStat {
  division: string;
  district: string;
  total_cases: number;
  pending_cases: number;
  responded_cases: number;
  resolved_cases: number;
}

interface DistrictData extends RegionalStat {
  id: string;
  lat: number;
  lng: number;
  intensity: number;
}

export default function RegionalMap() {
  const [stats, setStats] = useState<DistrictData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<DistrictData | null>(null);
  const [filteredDivision, setFilteredDivision] = useState<string>('All');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    const fetchStats = async () => {
      try {
        setLoading(true);
        const regionalStats = await advisoryService.getRegionalStats();
        
        // Map statistics to districts with coordinates
        const districtData: DistrictData[] = regionalStats
          .map((stat) => {
            const district = bangladeshDistricts.find(
              (d) => d.name.toLowerCase() === stat.district.toLowerCase()
            );
            if (!district) return null;

            const intensity = Math.min(100, (stat.total_cases / 50) * 100); // Normalize intensity
            return {
              id: district.id,
              division: stat.division,
              district: stat.district,
              lat: district.lat,
              lng: district.lng,
              total_cases: stat.total_cases,
              pending_cases: stat.pending_cases,
              responded_cases: stat.responded_cases,
              resolved_cases: stat.resolved_cases,
              intensity,
            };
          })
          .filter((d): d is DistrictData => d !== null);

        setStats(districtData);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load regional statistics');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [isMounted]);

  const getColorByIntensity = (intensity: number): string => {
    if (intensity === 0) return 'bg-gray-200';
    if (intensity < 20) return 'bg-green-200';
    if (intensity < 40) return 'bg-yellow-300';
    if (intensity < 60) return 'bg-orange-400';
    if (intensity < 80) return 'bg-red-500';
    return 'bg-red-700';
  };

  const getTextColorByIntensity = (intensity: number): string => {
    if (intensity > 60) return 'text-white';
    return 'text-gray-900';
  };

  const filteredStats =
    filteredDivision === 'All'
      ? stats
      : stats.filter((d) => d.division === filteredDivision);

  const divisions = Array.from(new Set(stats.map((d) => d.division))).sort();

  const totalCases = stats.reduce((sum, d) => sum + d.total_cases, 0);
  const maxCases = Math.max(...stats.map((d) => d.total_cases), 1);

  if (!isMounted) {
    return (
      <div className="w-full h-96 bg-white rounded-lg shadow-lg p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading regional map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-white rounded-lg shadow-lg p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Regional Advisory Cases Distribution
        </h2>
        <p className="text-gray-600 mb-4">
          Interactive map showing the distribution of advisory cases by district and division
        </p>

        {/* Statistics Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <p className="text-sm text-gray-600">Total Cases</p>
            <p className="text-3xl font-bold text-blue-600">{totalCases}</p>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
            <p className="text-sm text-gray-600">Pending</p>
            <p className="text-3xl font-bold text-yellow-600">
              {stats.reduce((sum, d) => sum + d.pending_cases, 0)}
            </p>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <p className="text-sm text-gray-600">Responded</p>
            <p className="text-3xl font-bold text-blue-600">
              {stats.reduce((sum, d) => sum + d.responded_cases, 0)}
            </p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <p className="text-sm text-gray-600">Resolved</p>
            <p className="text-3xl font-bold text-green-600">
              {stats.reduce((sum, d) => sum + d.resolved_cases, 0)}
            </p>
          </div>
        </div>

        {/* Division Filter */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setFilteredDivision('All')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filteredDivision === 'All'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            All Divisions
          </button>
          {divisions.map((division) => (
            <button
              key={division}
              onClick={() => setFilteredDivision(division)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filteredDivision === division
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {division}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center h-96 bg-gray-50 rounded-lg">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading regional data...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {!loading && !error && (
        <div>
          {/* Heatmap Grid */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">District Heatmap</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {filteredStats.map((district) => (
                <button
                  key={district.id}
                  onClick={() => setSelectedDistrict(district)}
                  className={`p-3 rounded-lg transition-all transform hover:scale-105 cursor-pointer ${getColorByIntensity(
                    district.intensity
                  )} ${getTextColorByIntensity(district.intensity)} border-2 ${
                    selectedDistrict?.id === district.id
                      ? 'border-gray-900 shadow-lg'
                      : 'border-transparent hover:border-gray-400'
                  }`}
                >
                  <p className="font-bold text-sm">{district.district}</p>
                  <p className="text-xs opacity-90">{district.total_cases} cases</p>
                </button>
              ))}
            </div>
          </div>

          {/* Color Legend */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="text-sm font-semibold mb-3 text-gray-900">Color Intensity Legend</h3>
            <div className="flex flex-wrap gap-3 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-gray-200 rounded"></div>
                <span>No data</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-green-200 rounded"></div>
                <span>Low (&lt;20)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-yellow-300 rounded"></div>
                <span>Medium (20-40)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-orange-400 rounded"></div>
                <span>High (40-60)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-red-500 rounded"></div>
                <span>Very High (60-80)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-red-700 rounded"></div>
                <span>Critical (&gt;80)</span>
              </div>
            </div>
          </div>

          {/* Detailed View */}
          {selectedDistrict && (
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {selectedDistrict.district}, {selectedDistrict.division}
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Total Cases</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {selectedDistrict.total_cases}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {selectedDistrict.pending_cases}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Responded</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {selectedDistrict.responded_cases}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Resolved</p>
                  <p className="text-2xl font-bold text-green-600">
                    {selectedDistrict.resolved_cases}
                  </p>
                </div>
              </div>
              {selectedDistrict.total_cases > 0 && (
                <div className="mt-4 pt-4 border-t border-blue-200">
                  <p className="text-xs text-gray-600 mb-2">Status Distribution</p>
                  <div className="flex h-2 rounded-full overflow-hidden gap-0.5">
                    <div
                      className="bg-yellow-500"
                      style={{
                        width: `${
                          (selectedDistrict.pending_cases /
                            selectedDistrict.total_cases) *
                          100
                        }%`,
                      }}
                    ></div>
                    <div
                      className="bg-blue-500"
                      style={{
                        width: `${
                          (selectedDistrict.responded_cases /
                            selectedDistrict.total_cases) *
                          100
                        }%`,
                      }}
                    ></div>
                    <div
                      className="bg-green-500"
                      style={{
                        width: `${
                          (selectedDistrict.resolved_cases /
                            selectedDistrict.total_cases) *
                          100
                        }%`,
                      }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
