// Bangladesh Districts GeoJSON data with coordinates for map visualization
// Includes division, district names and approximate center coordinates

export interface District {
  id: string;
  name: string;
  division: string;
  lat: number;
  lng: number;
  region: string;
}

export const bangladeshDistricts: District[] = [
  // Dhaka Division
  { id: 'dhaka', name: 'Dhaka', division: 'Dhaka', lat: 23.8103, lng: 90.4125, region: 'dhaka' },
  { id: 'gazipur', name: 'Gazipur', division: 'Dhaka', lat: 23.9909, lng: 90.4155, region: 'dhaka' },
  { id: 'narayanganj', name: 'Narayanganj', division: 'Dhaka', lat: 23.6468, lng: 90.5027, region: 'dhaka' },
  { id: 'tangail', name: 'Tangail', division: 'Dhaka', lat: 24.2513, lng: 89.9176, region: 'dhaka' },
  { id: 'manikganj', name: 'Manikganj', division: 'Dhaka', lat: 23.8644, lng: 90.0047, region: 'dhaka' },
  { id: 'munshiganj', name: 'Munshiganj', division: 'Dhaka', lat: 23.5418, lng: 90.5305, region: 'dhaka' },
  { id: 'shariatpur', name: 'Shariatpur', division: 'Dhaka', lat: 23.2423, lng: 90.4343, region: 'dhaka' },
  { id: 'faridpur', name: 'Faridpur', division: 'Dhaka', lat: 23.6085, lng: 89.8521, region: 'dhaka' },
  { id: 'rajbari', name: 'Rajbari', division: 'Dhaka', lat: 23.7529, lng: 89.6711, region: 'dhaka' },
  { id: 'madaripur', name: 'Madaripur', division: 'Dhaka', lat: 23.1636, lng: 90.1978, region: 'dhaka' },

  // Chittagong Division
  { id: 'chattogram', name: 'Chattogram', division: 'Chittagong', lat: 22.3569, lng: 91.7832, region: 'chittagong' },
  { id: 'cox-bazar', name: 'Cox\'s Bazar', division: 'Chittagong', lat: 21.4272, lng: 92.0058, region: 'chittagong' },
  { id: 'bandarban', name: 'Bandarban', division: 'Chittagong', lat: 22.1953, lng: 92.2183, region: 'chittagong' },
  { id: 'khagrachhari', name: 'Khagrachhari', division: 'Chittagong', lat: 23.1801, lng: 91.9971, region: 'chittagong' },
  { id: 'rangamati', name: 'Rangamati', division: 'Chittagong', lat: 23.0926, lng: 92.1585, region: 'chittagong' },
  { id: 'feni', name: 'Feni', division: 'Chittagong', lat: 23.0159, lng: 91.3976, region: 'chittagong' },
  { id: 'noakhali', name: 'Noakhali', division: 'Chittagong', lat: 22.8245, lng: 91.0992, region: 'chittagong' },
  { id: 'lakshmipur', name: 'Lakshmipur', division: 'Chittagong', lat: 22.9331, lng: 90.8154, region: 'chittagong' },

  // Khulna Division
  { id: 'khulna', name: 'Khulna', division: 'Khulna', lat: 22.8456, lng: 89.5403, region: 'khulna' },
  { id: 'satkhira', name: 'Satkhira', division: 'Khulna', lat: 22.6851, lng: 89.0976, region: 'khulna' },
  { id: 'bagerhat', name: 'Bagerhat', division: 'Khulna', lat: 22.6509, lng: 89.7841, region: 'khulna' },
  { id: 'jhenaidah', name: 'Jhenaidah', division: 'Khulna', lat: 23.5424, lng: 89.1648, region: 'khulna' },
  { id: 'pirojpur', name: 'Pirojpur', division: 'Khulna', lat: 22.5644, lng: 89.7729, region: 'khulna' },
  { id: 'narail', name: 'Narail', division: 'Khulna', lat: 23.8953, lng: 89.5028, region: 'khulna' },
  { id: 'chuadanga', name: 'Chuadanga', division: 'Khulna', lat: 23.6401, lng: 88.8241, region: 'khulna' },
  { id: 'magura', name: 'Magura', division: 'Khulna', lat: 23.4832, lng: 89.4204, region: 'khulna' },

  // Barishal Division
  { id: 'barishal', name: 'Barishal', division: 'Barishal', lat: 22.7010, lng: 90.3635, region: 'barishal' },
  { id: 'bhola', name: 'Bhola', division: 'Barishal', lat: 22.6858, lng: 90.6521, region: 'barishal' },
  { id: 'jhalokati', name: 'Jhalokati', division: 'Barishal', lat: 22.6419, lng: 90.2129, region: 'barishal' },
  { id: 'patuakhali', name: 'Patuakhali', division: 'Barishal', lat: 22.3596, lng: 90.3299, region: 'barishal' },
  { id: 'barguna', name: 'Barguna', division: 'Barishal', lat: 21.8317, lng: 90.1124, region: 'barishal' },

  // Sylhet Division
  { id: 'sylhet', name: 'Sylhet', division: 'Sylhet', lat: 24.8949, lng: 91.8687, region: 'sylhet' },
  { id: 'moulvibazar', name: 'Moulvibazar', division: 'Sylhet', lat: 24.4829, lng: 91.7271, region: 'sylhet' },
  { id: 'sunamganj', name: 'Sunamganj', division: 'Sylhet', lat: 25.0658, lng: 91.3950, region: 'sylhet' },
  { id: 'habiganj', name: 'Habiganj', division: 'Sylhet', lat: 24.3735, lng: 91.4157, region: 'sylhet' },

  // Rajshahi Division
  { id: 'rajshahi', name: 'Rajshahi', division: 'Rajshahi', lat: 24.3745, lng: 88.6042, region: 'rajshahi' },
  { id: 'pabna', name: 'Pabna', division: 'Rajshahi', lat: 23.9875, lng: 89.2337, region: 'rajshahi' },
  { id: 'sirajganj', name: 'Sirajganj', division: 'Rajshahi', lat: 24.4533, lng: 89.7006, region: 'rajshahi' },
  { id: 'natore', name: 'Natore', division: 'Rajshahi', lat: 24.4200, lng: 88.9761, region: 'rajshahi' },
  { id: 'naogaon', name: 'Naogaon', division: 'Rajshahi', lat: 24.7936, lng: 88.1373, region: 'rajshahi' },
  { id: 'bogura', name: 'Bogura', division: 'Rajshahi', lat: 24.8465, lng: 89.6256, region: 'rajshahi' },
  { id: 'joypurhat', name: 'Joypurhat', division: 'Rajshahi', lat: 25.1658, lng: 89.0226, region: 'rajshahi' },
  { id: 'nawabganj', name: 'Nawabganj', division: 'Rajshahi', lat: 23.2684, lng: 88.2750, region: 'rajshahi' },

  // Rangpur Division
  { id: 'rangpur', name: 'Rangpur', division: 'Rangpur', lat: 25.7439, lng: 88.5919, region: 'rangpur' },
  { id: 'dinajpur', name: 'Dinajpur', division: 'Rangpur', lat: 25.6271, lng: 88.6389, region: 'rangpur' },
  { id: 'kurigram', name: 'Kurigram', division: 'Rangpur', lat: 26.0038, lng: 89.6370, region: 'rangpur' },
  { id: 'nilphamari', name: 'Nilphamari', division: 'Rangpur', lat: 25.9493, lng: 88.8570, region: 'rangpur' },
  { id: 'thakurgaon', name: 'Thakurgaon', division: 'Rangpur', lat: 26.2163, lng: 88.4611, region: 'rangpur' },
  { id: 'panchagarh', name: 'Panchagarh', division: 'Rangpur', lat: 26.5392, lng: 88.5541, region: 'rangpur' },
  { id: 'gaibandha', name: 'Gaibandha', division: 'Rangpur', lat: 25.3280, lng: 89.5272, region: 'rangpur' },
  { id: 'lalmonirhat', name: 'Lalmonirhat', division: 'Rangpur', lat: 25.9145, lng: 89.2852, region: 'rangpur' },

  // Mymensingh Division
  { id: 'mymensingh', name: 'Mymensingh', division: 'Mymensingh', lat: 24.7465, lng: 90.4203, region: 'mymensingh' },
  { id: 'jamalpur', name: 'Jamalpur', division: 'Mymensingh', lat: 24.9144, lng: 90.9773, region: 'mymensingh' },
  { id: 'sherpur', name: 'Sherpur', division: 'Mymensingh', lat: 25.2142, lng: 90.6519, region: 'mymensingh' },
  { id: 'netrokona', name: 'Netrokona', division: 'Mymensingh', lat: 24.4778, lng: 90.7294, region: 'mymensingh' },
];

export const bangladeshDivisions = [
  'Dhaka',
  'Chittagong',
  'Khulna',
  'Barishal',
  'Sylhet',
  'Rajshahi',
  'Rangpur',
  'Mymensingh',
];

export const getDistrictsByDivision = (division: string): District[] => {
  return bangladeshDistricts.filter(d => d.division === division);
};

export const getDistrictCoordinates = (districtName: string): { lat: number; lng: number } | null => {
  const district = bangladeshDistricts.find(
    d => d.name.toLowerCase() === districtName.toLowerCase()
  );
  return district ? { lat: district.lat, lng: district.lng } : null;
};

// Bangladesh bounds for map centering
export const bangladeshBounds = {
  north: 26.6367,
  south: 20.7413,
  east: 92.6727,
  west: 88.0094,
  center: { lat: 23.6850, lng: 90.3563 },
};
