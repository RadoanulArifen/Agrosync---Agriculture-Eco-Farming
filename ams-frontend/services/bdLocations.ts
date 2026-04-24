export interface BdLocationOption {
  id: string;
  name: string;
  bnName: string;
}

interface BdApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

interface BdApiLocationItem {
  id: string;
  name: string;
  bn_name: string;
}

const BD_API_BASE_URL = 'https://bdapis.vercel.app/geo/v2.0';

const DIVISION_IDS: Record<string, string> = {
  Chattogram: '1',
  Rajshahi: '2',
  Khulna: '3',
  Barishal: '4',
  Sylhet: '5',
  Dhaka: '6',
  Rangpur: '7',
  Mymensingh: '8',
};

const districtCache = new Map<string, BdLocationOption[]>();
const upazilaCache = new Map<string, BdLocationOption[]>();

const mapLocationItem = (item: BdApiLocationItem): BdLocationOption => ({
  id: item.id,
  name: item.name,
  bnName: item.bn_name,
});

async function fetchBdLocations(path: string): Promise<BdLocationOption[]> {
  const response = await fetch(`${BD_API_BASE_URL}${path}`, { cache: 'force-cache' });

  if (!response.ok) {
    throw new Error(`Location API request failed: ${response.status}`);
  }

  const payload = await response.json() as BdApiResponse<BdApiLocationItem[]>;

  if (!payload.success) {
    throw new Error(payload.message || 'Location API request failed.');
  }

  return (payload.data || []).map(mapLocationItem);
}

export async function getDistrictsByDivision(division: string): Promise<BdLocationOption[]> {
  const divisionId = DIVISION_IDS[division];

  if (!divisionId) {
    return [];
  }

  if (districtCache.has(divisionId)) {
    return districtCache.get(divisionId) || [];
  }

  const districts = await fetchBdLocations(`/districts/${divisionId}`);
  districtCache.set(divisionId, districts);
  return districts;
}

export async function getUpazilasByDistrictId(districtId: string): Promise<BdLocationOption[]> {
  if (!districtId) {
    return [];
  }

  if (upazilaCache.has(districtId)) {
    return upazilaCache.get(districtId) || [];
  }

  const upazilas = await fetchBdLocations(`/upazilas/${districtId}`);
  upazilaCache.set(districtId, upazilas);
  return upazilas;
}
