<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Throwable;

class AgroSyncController extends Controller
{
    private const OTP_EXPIRY_MINUTES = 10;

    private function ok(mixed $data = null, int $status = 200): JsonResponse
    {
        return response()->json(['status' => 'success', 'data' => $data], $status);
    }

    private function fail(string $message, int $status = 422): JsonResponse
    {
        return response()->json(['status' => 'error', 'message' => $message], $status);
    }

    private function arrayValue(mixed $value): array
    {
        if (is_array($value)) {
            return $value;
        }

        if (! is_string($value) || $value === '') {
            return [];
        }

        $decoded = json_decode($value, true);

        return is_array($decoded) ? $decoded : [];
    }

    private function avatarValue(Request $request): ?string
    {
        $avatar = $request->input('avatar');

        if (! is_string($avatar)) {
            return null;
        }

        $avatar = trim($avatar);

        return $avatar === '' ? null : $avatar;
    }

    private function normalizedEmail(?string $email): string
    {
        return strtolower(trim((string) $email));
    }

    private function weatherEmoji(string $condition): string
    {
        $label = strtolower($condition);

        return match (true) {
            str_contains($label, 'sunny'), str_contains($label, 'clear') => '☀️',
            str_contains($label, 'partly cloudy'), str_contains($label, 'cloudy') => '⛅',
            str_contains($label, 'overcast') => '☁️',
            str_contains($label, 'mist'), str_contains($label, 'fog') => '🌫️',
            str_contains($label, 'thunder') => '⛈️',
            str_contains($label, 'snow'), str_contains($label, 'sleet'), str_contains($label, 'ice') => '❄️',
            str_contains($label, 'drizzle'), str_contains($label, 'rain'), str_contains($label, 'shower') => '🌧️',
            default => '🌤️',
        };
    }

    private function weatherAdvisory(float $rainfall, float $windSpeed, float $tempMax, string $condition): string
    {
        $label = strtolower($condition);

        return match (true) {
            $rainfall >= 25 => 'Heavy rain expected. Avoid pesticide spraying and keep harvested crops covered.',
            $windSpeed >= 35 => 'Strong wind is possible. Secure seedbeds, nets, and lightweight farm structures.',
            $tempMax >= 36 => 'High heat expected. Irrigate early morning or evening and protect workers from midday sun.',
            str_contains($label, 'thunder') => 'Thunderstorm risk. Pause open-field work when lightning is nearby.',
            default => 'Good conditions for routine field work. Keep monitoring humidity before spraying.',
        };
    }

    private function weatherLocation(Request $request): array
    {
        $upazila = trim((string) $request->input('upazila'));
        $district = trim((string) $request->input('district', $request->input('q')));
        $division = trim((string) $request->input('division'));
        $parts = array_values(array_filter([$upazila, $district, $division ?: 'Bangladesh']));

        return [
            'district' => $district !== '' ? $district : 'Dhaka',
            'query' => implode(', ', $parts ?: ['Dhaka', 'Bangladesh']),
        ];
    }

    private function generateAndSendOtp(object $recipient, string $purpose = 'login'): array
    {
        $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        $token = Str::random(64);
        $expiresAt = now()->addMinutes(self::OTP_EXPIRY_MINUTES);
        $email = $this->normalizedEmail($recipient->email ?? null);
        $role = $recipient->role ?? null;
        $name = $recipient->name ?? 'User';

        DB::table('auth_otps')
            ->where('email', $email)
            ->where('purpose', $purpose)
            ->delete();

        DB::table('auth_otps')->insert([
            'id' => (string) Str::uuid(),
            'user_id' => $recipient->public_id ?? null,
            'email' => $email,
            'role' => $role,
            'purpose' => $purpose,
            'token' => $token,
            'otp_hash' => Hash::make($code),
            'expires_at' => $expiresAt,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        try {
            Mail::raw(
                "Your AgriculMS OTP code is {$code}. This code will expire in ".self::OTP_EXPIRY_MINUTES.' minutes.',
                function ($message) use ($email, $name, $purpose): void {
                    $message
                        ->to($email, $name)
                        ->subject($purpose === 'registration' ? 'Your AgriculMS registration OTP' : 'Your AgriculMS login OTP');
                }
            );
        } catch (Throwable $exception) {
            DB::table('auth_otps')->where('token', $token)->delete();
            report($exception);

            throw $exception;
        }

        return [
            'token' => $token,
            'expiresAt' => $expiresAt->toIso8601String(),
        ];
    }

    private function consumeOtpRecord(Request $request, string $purpose = 'login'): ?object
    {
        $otpToken = trim((string) $request->input('otpToken'));
        $email = $this->normalizedEmail($request->input('email'));

        $record = DB::table('auth_otps')
            ->when($otpToken !== '', fn ($query) => $query->where('token', $otpToken))
            ->when($otpToken === '' && $email !== '', fn ($query) => $query->where('email', $email))
            ->when($request->filled('role'), fn ($query) => $query->where('role', $request->input('role')))
            ->where('purpose', $purpose)
            ->whereNull('consumed_at')
            ->where('expires_at', '>', now())
            ->orderByDesc('created_at')
            ->first();

        if (! $record || ! Hash::check((string) $request->input('otp'), $record->otp_hash)) {
            return null;
        }

        DB::table('auth_otps')->where('id', $record->id)->update([
            'consumed_at' => now(),
            'updated_at' => now(),
        ]);

        return $record;
    }

    private function verifiedRegistrationOtp(Request $request): ?object
    {
        return DB::table('auth_otps')
            ->where('token', (string) $request->input('registrationOtpToken'))
            ->where('purpose', 'registration')
            ->where('email', $this->normalizedEmail($request->input('email')))
            ->where('role', 'farmer')
            ->whereNotNull('consumed_at')
            ->where('expires_at', '>', now())
            ->first();
    }

    private function user(object $user): array
    {
        $roleRows = [
            'farmer' => DB::table('farmers')->where('user_id', $user->public_id)->first(),
            'officer' => DB::table('officers')->where('user_id', $user->public_id)->first(),
            'vendor' => DB::table('vendors')->where('user_id', $user->public_id)->first(),
            'company' => DB::table('companies')->where('user_id', $user->public_id)->first(),
        ];

        $payload = [
            'id' => $user->public_id,
            'name' => $user->name,
            'nameBn' => $user->name_bn,
            'email' => $user->email,
            'phone' => $user->phone,
            'role' => $user->role,
            'tenantId' => $user->tenant_id,
            'avatar' => $user->avatar,
            'createdAt' => $user->created_at,
            'password' => '',
            'division' => $user->division,
            'district' => $user->district,
            'upazila' => $user->upazila,
            'designation' => $user->designation,
            'accessLabel' => $user->access_label,
        ];

        if ($farmer = $roleRows['farmer']) {
            $payload += [
                'fid' => $farmer->fid,
                'nidHash' => $farmer->nid_hash,
                'landAcres' => (float) $farmer->land_size,
                'cropTypes' => $this->arrayValue($farmer->crop_types),
                'bkashAccount' => $farmer->bkash_account,
            ];
        }

        if ($officer = $roleRows['officer']) {
            $payload += [
                'officerId' => $officer->officer_id,
                'specialtyTags' => $this->arrayValue($officer->specialty_tags),
                'regionDistricts' => $this->arrayValue($officer->region_districts),
                'maxActiveCases' => (int) $officer->max_active_cases,
                'availabilityStatus' => $officer->availability_status,
            ];
        }

        if ($vendor = $roleRows['vendor']) {
            $payload += [
                'vendorId' => $vendor->vendor_id,
                'companyName' => $vendor->company_name,
                'deliveryDistricts' => $this->arrayValue($vendor->delivery_districts),
            ];
        }

        if ($company = $roleRows['company']) {
            $payload += [
                'companyId' => $company->company_id,
                'companyName' => $company->company_name,
                'registrationNo' => $company->registration_no,
                'cropInterests' => $this->arrayValue($company->crop_interests),
            ];
        }

        return $payload;
    }

    private function farmer(object $farmer): array
    {
        $user = DB::table('users')->where('public_id', $farmer->user_id)->first();

        return [
            'id' => $farmer->id,
            'fid' => $farmer->fid,
            'nidHash' => $farmer->nid_hash,
            'name' => $farmer->name_en,
            'nameBn' => $farmer->name_bn,
            'email' => $user?->email,
            'phone' => $farmer->phone,
            'role' => 'farmer',
            'tenantId' => $farmer->tenant_id,
            'avatar' => $user?->avatar,
            'createdAt' => $farmer->created_at,
            'district' => $farmer->district,
            'upazila' => $farmer->upazila,
            'division' => $farmer->division,
            'landAcres' => (float) $farmer->land_size,
            'cropTypes' => $this->arrayValue($farmer->crop_types),
            'cooperativeId' => $farmer->cooperative_id,
            'bkashAccount' => $farmer->bkash_account,
            'verified' => (bool) $farmer->verified,
            'blocked' => (bool) $farmer->blocked,
        ];
    }

    public function users(Request $request): JsonResponse
    {
        $users = DB::table('users')
            ->whereNotNull('public_id')
            ->when($request->filled('role'), fn ($query) => $query->where('role', $request->input('role')))
            ->orderByDesc('created_at')
            ->get()
            ->map(fn ($user) => $this->user($user));

        return $this->ok($users);
    }

    private function product(object $product): array
    {
        $vendor = DB::table('vendors')->where('id', $product->vendor_id)->first();

        return [
            'id' => $product->id,
            'vendorId' => $product->vendor_id,
            'vendorName' => $vendor?->company_name ?? $product->vendor_id,
            'nameEn' => $product->name_en,
            'nameBn' => $product->name_bn,
            'category' => $product->category,
            'price' => (float) $product->price,
            'unit' => $product->unit,
            'stockQty' => (int) $product->stock_qty,
            'description' => $product->description,
            'manufacturer' => $product->manufacturer,
            'photos' => $this->arrayValue($product->photos),
            'deliveryDistricts' => $this->arrayValue($product->delivery_districts),
            'estimatedDeliveryDays' => (int) $product->estimated_delivery_days,
            'rating' => (float) $product->rating,
            'reviewCount' => (int) $product->review_count,
            'isRecommended' => (bool) $product->is_recommended,
        ];
    }

    private function cropListingProduct(object $listing): array
    {
        $farmer = DB::table('farmers')->where('id', $listing->farmer_id)->first();
        $photos = $this->arrayValue($listing->photos);
        $district = $listing->district ?? $farmer?->district ?? '';
        $upazila = $listing->upazila ?? $farmer?->upazila ?? '';
        $cropType = trim((string) $listing->crop_type);
        $variety = trim((string) $listing->variety);
        $location = implode(', ', array_values(array_filter([$upazila, $district])));

        return [
            'id' => 'listing_'.$listing->id,
            'vendorId' => $listing->farmer_id,
            'vendorName' => $farmer?->name_en ?? 'Farmer',
            'nameEn' => $variety !== '' ? "{$cropType} ({$variety})" : $cropType,
            'nameBn' => $cropType,
            'category' => $listing->product_category ?: 'Fresh Vegetables',
            'price' => (float) $listing->asking_price,
            'unit' => 'kg',
            'stockQty' => (int) $listing->quantity_kg,
            'description' => trim(implode(' ', array_filter([
                $listing->quality_grade ? "{$listing->quality_grade} grade {$cropType}." : null,
                $location !== '' ? "Location: {$location}." : null,
                $listing->harvest_date ? "Harvest date: {$listing->harvest_date}." : null,
            ]))),
            'manufacturer' => $farmer?->name_en ?? 'Farmer',
            'photos' => $photos,
            'deliveryDistricts' => array_values(array_filter([$district])),
            'estimatedDeliveryDays' => 2,
            'rating' => 4.6,
            'reviewCount' => max(12, (int) round(((int) $listing->quantity_kg) / 20)),
            'isRecommended' => false,
        ];
    }

    private function advisoryCase(object $case): array
    {
        $farmer = DB::table('farmers')->where('id', $case->farmer_id)->first();
        $officer = $case->officer_id ? DB::table('officers')->where('id', $case->officer_id)->first() : null;
        $officerUser = $officer ? DB::table('users')->where('public_id', $officer->user_id)->first() : null;

        return [
            'id' => $case->id,
            'farmerId' => $case->farmer_id,
            'farmerName' => $farmer?->name_en ?? 'Farmer',
            'farmerDistrict' => $farmer?->district ?? '',
            'cropType' => $case->crop_type,
            'description' => $case->description,
            'photos' => $this->arrayValue($case->photos),
            'status' => $case->status,
            'aiDiagnosis' => $case->ai_diagnosis,
            'aiConfidence' => $case->ai_confidence ? (int) $case->ai_confidence : null,
            'officerId' => $case->officer_id,
            'officerName' => $officerUser?->name,
            'officerResponse' => $case->officer_response,
            'internalNote' => $case->internal_note,
            'overriddenDiagnosis' => $case->overridden_diagnosis,
            'createdAt' => $case->created_at,
            'respondedAt' => $case->responded_at,
            'closedAt' => $case->resolved_at,
        ];
    }

    private function order(object $order): array
    {
        $farmer = DB::table('farmers')->where('id', $order->farmer_id)->first();
        $vendor = DB::table('vendors')->where('id', $order->vendor_id)->first();
        $items = DB::table('order_items')->where('order_id', $order->id)->get()->map(fn ($item) => [
            'productId' => $item->product_id,
            'productName' => $item->product_name,
            'quantity' => (int) $item->quantity,
            'price' => (float) $item->price,
            'unit' => $item->unit,
        ])->values();

        return [
            'id' => $order->id,
            'farmerId' => $order->farmer_id,
            'farmerName' => $farmer?->name_en ?? 'Farmer',
            'vendorId' => $order->vendor_id,
            'vendorName' => $vendor?->company_name ?? 'Vendor',
            'items' => $items,
            'totalAmount' => (float) $order->total_amount,
            'status' => $order->status,
            'paymentGateway' => $order->payment_gateway,
            'paymentStatus' => $order->payment_status,
            'placedAt' => $order->placed_at,
            'deliveredAt' => $order->delivered_at,
            'estimatedDelivery' => $order->estimated_delivery,
        ];
    }

    private function cropListing(object $listing): array
    {
        $farmer = DB::table('farmers')->where('id', $listing->farmer_id)->first();

        return [
            'id' => $listing->id,
            'farmerId' => $listing->farmer_id,
            'farmerName' => $farmer?->name_en ?? 'Farmer',
            'farmerDistrict' => $farmer?->district ?? $listing->district,
            'productCategory' => $listing->product_category,
            'cropType' => $listing->crop_type,
            'variety' => $listing->variety,
            'quantityKg' => (int) $listing->quantity_kg,
            'qualityGrade' => $listing->quality_grade,
            'askingPrice' => (float) $listing->asking_price,
            'harvestDate' => $listing->harvest_date,
            'district' => $listing->district,
            'upazila' => $listing->upazila,
            'photos' => $this->arrayValue($listing->photos),
            'status' => $listing->status,
            'createdAt' => $listing->created_at,
            'matchedCompanyId' => $listing->matched_company_id,
        ];
    }

    public function weatherForecast(Request $request): JsonResponse
    {
        $apiKey = env('WEATHER_API_KEY');

        if (! $apiKey) {
            return $this->fail('Weather API key is not configured.', 500);
        }

        $location = $this->weatherLocation($request);

        try {
            $response = Http::timeout(15)->get('https://api.weatherapi.com/v1/forecast.json', [
                'key' => $apiKey,
                'q' => $location['query'],
                'days' => 7,
                'aqi' => 'no',
                'alerts' => 'yes',
            ]);

            if ($response->failed()) {
                return $this->fail('Unable to load weather forecast right now.', 502);
            }

            $payload = $response->json();
            $forecastDays = collect(data_get($payload, 'forecast.forecastday', []));
            $currentTemp = (float) data_get($payload, 'current.temp_c', 0);
            $today = $forecastDays->first();
            $currentCondition = (string) data_get($payload, 'current.condition.text', 'Changing Weather');

            $forecast = $forecastDays->map(function (array $day) use ($location) {
                $condition = (string) data_get($day, 'day.condition.text', 'Changing Weather');
                $rainfall = (float) data_get($day, 'day.totalprecip_mm', 0);
                $windSpeed = (float) data_get($day, 'day.maxwind_kph', 0);
                $tempMax = (float) data_get($day, 'day.maxtemp_c', 0);

                return [
                    'district' => $location['district'],
                    'date' => data_get($day, 'date'),
                    'tempMin' => (int) round((float) data_get($day, 'day.mintemp_c', 0)),
                    'tempMax' => (int) round($tempMax),
                    'rainfall' => (int) round($rainfall),
                    'humidity' => (int) round((float) data_get($day, 'day.avghumidity', 0)),
                    'windSpeed' => (int) round($windSpeed),
                    'condition' => $condition,
                    'icon' => $this->weatherEmoji($condition),
                    'advisory' => $this->weatherAdvisory($rainfall, $windSpeed, $tempMax, $condition),
                ];
            })->values();

            foreach ($forecast as $day) {
                DB::table('weather_forecasts')->updateOrInsert(
                    ['district' => $day['district'], 'forecast_date' => $day['date']],
                    [
                        'temp_min' => $day['tempMin'],
                        'temp_max' => $day['tempMax'],
                        'rainfall' => $day['rainfall'],
                        'humidity' => $day['humidity'],
                        'wind_speed' => $day['windSpeed'],
                        'condition' => $day['condition'],
                        'icon' => $day['icon'],
                        'advisory' => $day['advisory'],
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]
                );
            }

            $currentRainfall = (float) data_get($payload, 'current.precip_mm', data_get($today, 'day.totalprecip_mm', 0));
            $currentWind = (float) data_get($payload, 'current.wind_kph', data_get($today, 'day.maxwind_kph', 0));
            $current = [
                'district' => $location['district'],
                'date' => (string) Str::before((string) data_get($payload, 'current.last_updated', now()->toDateTimeString()), ' '),
                'tempMin' => (int) round((float) data_get($today, 'day.mintemp_c', $currentTemp)),
                'tempMax' => (int) round($currentTemp),
                'rainfall' => (int) round($currentRainfall),
                'humidity' => (int) round((float) data_get($payload, 'current.humidity', data_get($today, 'day.avghumidity', 0))),
                'windSpeed' => (int) round($currentWind),
                'condition' => $currentCondition,
                'icon' => $this->weatherEmoji($currentCondition),
                'advisory' => $this->weatherAdvisory($currentRainfall, $currentWind, $currentTemp, $currentCondition),
            ];

            $alerts = collect(data_get($payload, 'alerts.alert', []))
                ->map(function (array $alert) {
                    $headline = trim((string) data_get($alert, 'headline', 'Weather alert issued.'));
                    $instruction = trim((string) data_get($alert, 'instruction', ''));

                    return trim($headline.' '.$instruction);
                })
                ->filter()
                ->values()
                ->all();

            return $this->ok([
                'location' => (string) data_get($payload, 'location.name', $location['district']).', '.(string) data_get($payload, 'location.region', 'Bangladesh'),
                'district' => $location['district'],
                'current' => $current,
                'forecast' => $forecast,
                'alerts' => $alerts,
            ]);
        } catch (Throwable) {
            return $this->fail('Unable to load weather forecast right now.', 500);
        }
    }

    public function login(Request $request): JsonResponse
    {
        $user = DB::table('users')
            ->whereRaw('lower(email) = ?', [$this->normalizedEmail($request->input('email'))])
            ->when($request->filled('role'), fn ($query) => $query->where('role', $request->input('role')))
            ->first();

        if (! $user || ! Hash::check((string) $request->input('password'), $user->password)) {
            return $this->fail('Invalid credentials.', 401);
        }

        if ($user->role === 'farmer') {
            $farmer = DB::table('farmers')->where('user_id', $user->public_id)->first();

            if ($farmer?->blocked) {
                return $this->fail('This farmer account is blocked.', 403);
            }
        }

        return $this->ok([
            'success' => true,
            'role' => $user->role,
            'token' => 'local_api_'.Str::random(40),
            'user' => $this->user($user),
        ]);
    }

    public function sendOtp(Request $request): JsonResponse
    {
        $purpose = $request->input('purpose', 'login');
        $role = $request->input('role', 'farmer');
        $email = $this->normalizedEmail($request->input('email'));

        if ($purpose === 'registration') {
            if ($role !== 'farmer') {
                return $this->ok(['success' => false, 'message' => 'Registration OTP is enabled for farmer accounts only.']);
            }

            if ($email === '' || ! str_contains($email, '@')) {
                return $this->ok(['success' => false, 'message' => 'Enter a valid email address.']);
            }

            if (DB::table('users')->whereRaw('lower(email) = ?', [$email])->exists()) {
                return $this->ok(['success' => false, 'message' => 'This email is already registered for another account.']);
            }

            $recipient = (object) [
                'public_id' => null,
                'email' => $email,
                'role' => 'farmer',
                'name' => (string) $request->input('name', 'Farmer'),
            ];
        } else {
            $recipient = DB::table('users')
                ->whereRaw('lower(email) = ?', [$email])
                ->when($request->filled('role'), fn ($query) => $query->where('role', $request->input('role')))
                ->first();

            if (! $recipient) {
                return $this->ok(['success' => false, 'message' => 'No account found with this email.']);
            }
        }

        try {
            $otp = $this->generateAndSendOtp($recipient, $purpose);
        } catch (Throwable) {
            return $this->fail('Unable to send OTP email right now. Please try again.', 500);
        }

        return $this->ok([
            'success' => true,
            'otpToken' => $otp['token'],
            'expiresAt' => $otp['expiresAt'],
            'message' => 'OTP sent successfully to email',
        ]);
    }

    public function verifyOtp(Request $request): JsonResponse
    {
        $purpose = $request->input('purpose', 'login');
        $record = $this->consumeOtpRecord($request, $purpose);

        if (! $record) {
            return $this->ok(['success' => false]);
        }

        if ($purpose === 'registration') {
            return $this->ok([
                'success' => true,
                'verifiedToken' => $record->token,
                'email' => $record->email,
                'role' => $record->role,
            ]);
        }

        $user = DB::table('users')->where('public_id', $record->user_id)->first();

        return $user
            ? $this->ok(['success' => true, 'user' => $this->user($user), 'role' => $user->role, 'token' => 'local_api_'.Str::random(40)])
            : $this->ok(['success' => false]);
    }

    public function registerRoleUser(Request $request): JsonResponse
    {
        if ($request->filled('email') && DB::table('users')->whereRaw('lower(email) = ?', [$this->normalizedEmail($request->input('email'))])->exists()) {
            return $this->ok(['success' => false, 'message' => 'This email is already registered for another account.']);
        }

        $role = $request->input('role', 'farmer');
        $verifiedRegistrationOtp = null;

        if ($role === 'farmer') {
            $verifiedRegistrationOtp = $this->verifiedRegistrationOtp($request);

            if (! $verifiedRegistrationOtp) {
                return $this->ok(['success' => false, 'message' => 'Please verify the registration OTP sent to your email before submitting.']);
            }
        }

        $suffix = str_pad((string) (DB::table('users')->where('role', $role)->count() + 1), 3, '0', STR_PAD_LEFT);
        $publicId = $request->input('id') ?: 'usr_'.substr($role, 0, 3).'_'.$suffix;
        $now = now();

        DB::transaction(function () use ($request, $role, $publicId, $suffix, $now, $verifiedRegistrationOtp): void {
            DB::table('users')->insert([
                'public_id' => $publicId,
                'tenant_id' => $request->input('tenantId', 'tenant_001'),
                'role' => $role,
                'name' => $request->input('name', 'New User'),
                'name_bn' => $request->input('nameBn'),
                'email' => $this->normalizedEmail($request->input('email')),
                'phone' => $request->input('phone'),
                'avatar' => $this->avatarValue($request),
                'division' => $request->input('division'),
                'district' => $request->input('district'),
                'upazila' => $request->input('upazila'),
                'designation' => $request->input('designation'),
                'access_label' => $request->input('accessLabel'),
                'password' => Hash::make($request->input('password', 'password123')),
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            if ($role === 'farmer') {
                $id = $publicId;
                DB::table('farmers')->insert([
                    'id' => $id,
                    'user_id' => $publicId,
                    'tenant_id' => $request->input('tenantId', 'tenant_001'),
                    'fid' => $request->input('fid') ?: 'AGS-'.$now->year.'-'.str_pad((string) random_int(1, 9999999), 7, '0', STR_PAD_LEFT),
                    'nid_hash' => $request->input('nidHash', 'nid_'.Str::random(12)),
                    'name_bn' => $request->input('nameBn'),
                    'name_en' => $request->input('name', 'New Farmer'),
                    'division' => $request->input('division', ''),
                    'district' => $request->input('district', ''),
                    'upazila' => $request->input('upazila', ''),
                    'land_size' => $request->input('landAcres', 0),
                    'crop_types' => json_encode($request->input('cropTypes', [])),
                    'phone' => $request->input('phone', ''),
                    'bkash_account' => $request->input('bkashAccount', $request->input('phone')),
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }

            if ($role === 'officer') {
                DB::table('officers')->insert([
                    'id' => $publicId,
                    'user_id' => $publicId,
                    'tenant_id' => $request->input('tenantId', 'tenant_001'),
                    'officer_id' => $request->input('officerId', 'OFF-'.$suffix),
                    'specialty_tags' => json_encode($request->input('specialtyTags', [])),
                    'region_districts' => json_encode($request->input('regionDistricts', [])),
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }

            if ($verifiedRegistrationOtp) {
                DB::table('auth_otps')->where('id', $verifiedRegistrationOtp->id)->delete();
            }
        });

        $created = DB::table('users')->where('public_id', $publicId)->first();

        return $this->ok(['success' => true, 'user' => $this->user($created)]);
    }

    public function farmers(Request $request): JsonResponse
    {
        $farmers = DB::table('farmers')
            ->when($request->filled('q'), function ($query) use ($request) {
                $q = '%'.strtolower($request->input('q')).'%';
                $query->whereRaw('lower(name_en) like ? or lower(fid) like ? or lower(district) like ?', [$q, $q, $q]);
            })
            ->orderByDesc('created_at')
            ->get()
            ->map(fn ($farmer) => $this->farmer($farmer));

        return $this->ok($farmers);
    }

    public function advisoryCases(Request $request): JsonResponse
    {
        $cases = DB::table('advisory_cases')
            ->when($request->filled('farmerId'), fn ($query) => $query->where('farmer_id', $request->input('farmerId')))
            ->orderByDesc('created_at')
            ->get()
            ->map(fn ($case) => $this->advisoryCase($case));

        return $this->ok($cases);
    }

    public function submitAdvisory(Request $request): JsonResponse
    {
        $farmer = DB::table('farmers')->where('id', $request->input('farmerId'))->first();
        if (! $farmer) {
            return $this->fail('Farmer not found.');
        }

        $caseId = 'ADV-'.now()->year.'-'.str_pad((string) random_int(1, 9999999), 7, '0', STR_PAD_LEFT);
        DB::table('advisory_cases')->insert([
            'id' => $caseId,
            'tenant_id' => $farmer->tenant_id,
            'farmer_id' => $farmer->id,
            'crop_type' => $request->input('cropType'),
            'description' => $request->input('description'),
            'photos' => json_encode($request->input('photos', [])),
            'status' => 'pending',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->createNotification($farmer->id, 'advisory', 'Advisory Submitted', "Your advisory case {$caseId} has been submitted.", ['push', 'email']);

        return $this->ok(['success' => true, 'caseId' => $caseId]);
    }

    public function respondToCase(Request $request, string $caseId): JsonResponse
    {
        $officer = DB::table('officers')->where('id', $request->input('officerId'))->orWhere('officer_id', $request->input('officerId'))->first();
        DB::table('advisory_cases')->where('id', $caseId)->update([
            'status' => 'responded',
            'officer_id' => $officer?->id ?? $request->input('officerId'),
            'officer_response' => $request->input('response'),
            'responded_at' => now(),
            'updated_at' => now(),
        ]);

        return $this->ok(['success' => true]);
    }

    public function products(Request $request): JsonResponse
    {
        $products = DB::table('products')
            ->when($request->filled('category'), fn ($query) => $query->where('category', $request->input('category')))
            ->when($request->filled('vendorId'), fn ($query) => $query->where('vendor_id', $request->input('vendorId')))
            ->orderByDesc('created_at')
            ->get()
            ->map(fn ($product) => [
                ...$this->product($product),
                '__sortCreatedAt' => $product->created_at,
            ]);

        if (! $request->filled('vendorId')) {
            $listingProducts = DB::table('crop_listings')
                ->where('status', 'active')
                ->when($request->filled('category'), fn ($query) => $query->where('product_category', $request->input('category')))
                ->orderByDesc('created_at')
                ->get()
                ->map(fn ($listing) => [
                    ...$this->cropListingProduct($listing),
                    '__sortCreatedAt' => $listing->created_at,
                ]);

            $products = $products
                ->concat($listingProducts)
                ->sortByDesc('__sortCreatedAt')
                ->values();
        }

        $products = $products
            ->map(function (array $product) {
                unset($product['__sortCreatedAt']);

                return $product;
            })
            ->values();

        return $this->ok($products);
    }

    public function createProduct(Request $request): JsonResponse
    {
        $id = 'prod_'.substr((string) time(), -6).random_int(10, 99);
        DB::table('products')->insert([
            'id' => $id,
            'tenant_id' => $request->input('tenantId', 'tenant_001'),
            'vendor_id' => $request->input('vendorId'),
            'name_en' => $request->input('nameEn'),
            'name_bn' => $request->input('nameBn'),
            'category' => $request->input('category'),
            'price' => $request->input('price', 0),
            'unit' => $request->input('unit'),
            'stock_qty' => $request->input('stockQty', 0),
            'description' => $request->input('description'),
            'manufacturer' => $request->input('manufacturer'),
            'photos' => json_encode($request->input('photos', [])),
            'delivery_districts' => json_encode($request->input('deliveryDistricts', [])),
            'estimated_delivery_days' => $request->input('estimatedDeliveryDays', 3),
            'rating' => $request->input('rating', 4.5),
            'review_count' => $request->input('reviewCount', 0),
            'is_recommended' => $request->boolean('isRecommended'),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return $this->ok(['success' => true, 'productId' => $id]);
    }

    public function updateProduct(Request $request, string $productId): JsonResponse
    {
        $map = [
            'nameEn' => 'name_en',
            'nameBn' => 'name_bn',
            'stockQty' => 'stock_qty',
            'deliveryDistricts' => 'delivery_districts',
            'estimatedDeliveryDays' => 'estimated_delivery_days',
            'isRecommended' => 'is_recommended',
            'reviewCount' => 'review_count',
        ];
        $data = [];
        foreach ($request->all() as $key => $value) {
            $column = $map[$key] ?? Str::snake($key);
            $data[$column] = in_array($key, ['photos', 'deliveryDistricts'], true) ? json_encode($value) : $value;
        }
        $data['updated_at'] = now();

        DB::table('products')->where('id', $productId)->update($data);

        return $this->ok(['success' => true]);
    }

    public function deleteProduct(string $productId): JsonResponse
    {
        DB::table('products')->where('id', $productId)->delete();

        return $this->ok(['success' => true]);
    }

    public function cart(string $farmerId): JsonResponse
    {
        $cartId = 'cart_'.$farmerId;
        DB::table('carts')->updateOrInsert(['id' => $cartId], ['farmer_id' => $farmerId, 'updated_at' => now(), 'created_at' => now()]);

        $items = DB::table('cart_items')
            ->where('cart_id', $cartId)
            ->get()
            ->map(function ($item) {
                $product = DB::table('products')->where('id', $item->product_id)->first();

                return $product ? ['product' => $this->product($product), 'quantity' => (int) $item->quantity] : null;
            })
            ->filter()
            ->values();

        return $this->ok($items);
    }

    public function addToCart(Request $request, string $farmerId): JsonResponse
    {
        $cartId = 'cart_'.$farmerId;
        DB::table('carts')->updateOrInsert(['id' => $cartId], ['farmer_id' => $farmerId, 'updated_at' => now(), 'created_at' => now()]);
        $existing = DB::table('cart_items')->where('cart_id', $cartId)->where('product_id', $request->input('productId'))->first();

        DB::table('cart_items')->updateOrInsert(
            ['cart_id' => $cartId, 'product_id' => $request->input('productId')],
            ['quantity' => ($existing?->quantity ?? 0) + (int) $request->input('quantity', 1), 'updated_at' => now(), 'created_at' => now()]
        );

        return $this->ok(['success' => true]);
    }

    public function updateCartItem(Request $request, string $farmerId, string $productId): JsonResponse
    {
        $cartId = 'cart_'.$farmerId;
        if ((int) $request->input('quantity') <= 0) {
            DB::table('cart_items')->where('cart_id', $cartId)->where('product_id', $productId)->delete();
        } else {
            DB::table('cart_items')->where('cart_id', $cartId)->where('product_id', $productId)->update(['quantity' => $request->input('quantity'), 'updated_at' => now()]);
        }

        return $this->ok(['success' => true]);
    }

    public function clearCart(string $farmerId): JsonResponse
    {
        DB::table('cart_items')->where('cart_id', 'cart_'.$farmerId)->delete();

        return $this->ok(['success' => true]);
    }

    public function orders(Request $request): JsonResponse
    {
        $orders = DB::table('orders')
            ->when($request->filled('farmerId'), fn ($query) => $query->where('farmer_id', $request->input('farmerId')))
            ->orderByDesc('placed_at')
            ->get()
            ->map(fn ($order) => $this->order($order));

        return $this->ok($orders);
    }

    public function placeOrder(Request $request): JsonResponse
    {
        $items = collect($request->input('items', []));
        if ($items->isEmpty()) {
            return $this->ok(['success' => false, 'message' => 'Cart is empty.']);
        }

        $farmer = DB::table('farmers')->where('id', $request->input('farmerId'))->first();
        $products = $items->map(fn ($item) => ['item' => $item, 'product' => DB::table('products')->where('id', $item['productId'])->first()]);
        if (! $farmer || $products->contains(fn ($entry) => ! $entry['product'])) {
            return $this->ok(['success' => false, 'message' => 'Some cart items are unavailable.']);
        }

        $vendorId = $products->first()['product']->vendor_id;
        if ($products->contains(fn ($entry) => $entry['product']->vendor_id !== $vendorId)) {
            return $this->ok(['success' => false, 'message' => 'Please checkout products from one vendor at a time.']);
        }

        $orderId = 'ORD-'.now()->year.'-'.str_pad((string) random_int(1, 99999999), 8, '0', STR_PAD_LEFT);
        $total = $products->sum(fn ($entry) => ((float) $entry['product']->price) * ((int) $entry['item']['quantity']));
        $maxDays = $products->max(fn ($entry) => (int) $entry['product']->estimated_delivery_days);

        DB::transaction(function () use ($request, $farmer, $products, $vendorId, $orderId, $total, $maxDays): void {
            DB::table('orders')->insert([
                'id' => $orderId,
                'tenant_id' => $farmer->tenant_id,
                'farmer_id' => $farmer->id,
                'vendor_id' => $vendorId,
                'status' => $request->input('paymentGateway') === 'cod' ? 'pending' : 'confirmed',
                'total_amount' => $total,
                'payment_gateway' => $request->input('paymentGateway', 'cod'),
                'payment_status' => $request->input('paymentGateway') === 'cod' ? 'pending' : 'paid',
                'estimated_delivery' => now()->addDays($maxDays)->toDateString(),
                'placed_at' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            foreach ($products as $entry) {
                DB::table('order_items')->insert([
                    'order_id' => $orderId,
                    'product_id' => $entry['product']->id,
                    'product_name' => $entry['product']->name_en,
                    'quantity' => $entry['item']['quantity'],
                    'price' => $entry['product']->price,
                    'unit' => $entry['product']->unit,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
                DB::table('products')->where('id', $entry['product']->id)->decrement('stock_qty', min((int) $entry['product']->stock_qty, (int) $entry['item']['quantity']));
            }

            DB::table('cart_items')->where('cart_id', 'cart_'.$farmer->id)->delete();
        });

        $this->createNotification($farmer->id, 'order', 'Order Placed Successfully', "Order {$orderId} has been placed.", ['push', 'sms']);

        return $this->ok(['success' => true, 'orderId' => $orderId]);
    }

    public function updateOrderStatus(Request $request, string $orderId): JsonResponse
    {
        DB::table('orders')->where('id', $orderId)->update([
            'status' => $request->input('status'),
            'delivered_at' => $request->input('status') === 'delivered' ? now() : DB::raw('delivered_at'),
            'updated_at' => now(),
        ]);
        DB::table('order_status_history')->insert(['order_id' => $orderId, 'status' => $request->input('status'), 'created_at' => now(), 'updated_at' => now()]);

        return $this->ok(['success' => true]);
    }

    public function cropListings(Request $request): JsonResponse
    {
        $listings = DB::table('crop_listings')
            ->when($request->filled('farmerId'), fn ($query) => $query->where('farmer_id', $request->input('farmerId')))
            ->orderByDesc('created_at')
            ->get()
            ->map(fn ($listing) => $this->cropListing($listing));

        return $this->ok($listings);
    }

    public function createCropListing(Request $request): JsonResponse
    {
        $farmer = DB::table('farmers')->where('id', $request->input('farmerId'))->first();
        $id = 'CRP-'.str_pad((string) random_int(1, 999), 3, '0', STR_PAD_LEFT);
        DB::table('crop_listings')->insert([
            'id' => $id,
            'tenant_id' => $farmer?->tenant_id ?? 'tenant_001',
            'farmer_id' => $request->input('farmerId'),
            'product_category' => $request->input('productCategory', 'Fresh Vegetables'),
            'crop_type' => $request->input('cropType'),
            'variety' => $request->input('variety'),
            'quantity_kg' => $request->input('quantityKg', 0),
            'quality_grade' => $request->input('qualityGrade', 'A'),
            'asking_price' => $request->input('askingPrice', 0),
            'harvest_date' => $request->input('harvestDate'),
            'district' => $request->input('district', $farmer?->district),
            'upazila' => $request->input('upazila', $farmer?->upazila),
            'photos' => json_encode($request->input('photos', [])),
            'status' => $request->input('status', 'active'),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return $this->ok(['success' => true, 'listingId' => $id]);
    }

    public function expressInterest(Request $request): JsonResponse
    {
        $listing = DB::table('crop_listings')->where('id', $request->input('listingId'))->first();
        if (! $listing) {
            return $this->ok(['success' => false, 'message' => 'Listing not found.']);
        }

        $existing = DB::table('crop_deals')->where('listing_id', $listing->id)->where('company_id', $request->input('companyId'))->first();
        if ($existing) {
            return $this->ok(['success' => true, 'matchId' => $existing->id, 'message' => 'Interest already sent.']);
        }

        $id = 'deal_'.substr((string) time(), -6).random_int(10, 99);
        DB::table('crop_deals')->insert([
            'id' => $id,
            'listing_id' => $listing->id,
            'company_id' => $request->input('companyId'),
            'farmer_id' => $listing->farmer_id,
            'agreed_price' => $listing->asking_price,
            'quantity_kg' => $listing->quantity_kg,
            'commission_pct' => 3,
            'commission_amt' => round(((float) $listing->asking_price) * ((int) $listing->quantity_kg) * 0.03),
            'status' => 'pending',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        DB::table('crop_listings')->where('id', $listing->id)->update(['status' => 'matched', 'matched_company_id' => $request->input('companyId'), 'updated_at' => now()]);

        return $this->ok(['success' => true, 'matchId' => $id]);
    }

    public function cropDeals(Request $request): JsonResponse
    {
        $deals = DB::table('crop_deals')
            ->when($request->filled('companyId'), fn ($query) => $query->where('company_id', $request->input('companyId')))
            ->orderByDesc('created_at')
            ->get()
            ->map(function ($deal) {
                $company = DB::table('companies')->where('id', $deal->company_id)->first();
                $farmer = DB::table('farmers')->where('id', $deal->farmer_id)->first();

                return [
                    'id' => $deal->id,
                    'listingId' => $deal->listing_id,
                    'companyId' => $deal->company_id,
                    'companyName' => $company?->company_name ?? 'Company',
                    'farmerId' => $deal->farmer_id,
                    'farmerName' => $farmer?->name_en ?? 'Farmer',
                    'agreedPrice' => (float) $deal->agreed_price,
                    'quantityKg' => (int) $deal->quantity_kg,
                    'commissionPct' => (float) $deal->commission_pct,
                    'commissionAmt' => (float) $deal->commission_amt,
                    'status' => $deal->status,
                    'confirmedAt' => $deal->confirmed_at,
                ];
            });

        return $this->ok($deals);
    }

    public function updateDealStatus(Request $request, string $dealId): JsonResponse
    {
        DB::table('crop_deals')->where('id', $dealId)->update([
            'status' => $request->input('status'),
            'confirmed_at' => $request->input('status') === 'confirmed' ? now() : DB::raw('confirmed_at'),
            'updated_at' => now(),
        ]);

        return $this->ok(['success' => true]);
    }

    public function cropPrices(): JsonResponse
    {
        $prices = DB::table('crop_prices')->orderBy('crop_type')->get()->map(fn ($price) => [
            'cropType' => $price->crop_type,
            'currentPrice' => (float) $price->current_price,
            'unit' => $price->unit,
            'change7d' => (float) $price->change_7d,
            'changePercent' => (float) $price->change_percent,
            'trend' => $price->trend,
            'lastUpdated' => $price->updated_at,
            'history' => $this->arrayValue($price->history),
        ]);

        return $this->ok($prices);
    }

    public function subscribePriceAlert(Request $request): JsonResponse
    {
        DB::table('price_alerts')->insert(['farmer_id' => $request->input('farmerId'), 'crop_type' => $request->input('cropType'), 'created_at' => now(), 'updated_at' => now()]);

        return $this->ok(['success' => true]);
    }

    public function notifications(string $userId): JsonResponse
    {
        $notifications = DB::table('notifications')->where('user_id', $userId)->orderByDesc('created_at')->get()->map(fn ($notification) => [
            'id' => $notification->id,
            'userId' => $notification->user_id,
            'type' => $notification->type,
            'title' => $notification->title,
            'message' => $notification->message,
            'channel' => $this->arrayValue($notification->channel),
            'isRead' => (bool) $notification->is_read,
            'createdAt' => $notification->created_at,
        ]);

        return $this->ok($notifications);
    }

    public function markNotificationRead(string $notificationId): JsonResponse
    {
        DB::table('notifications')->where('id', $notificationId)->update(['is_read' => true, 'updated_at' => now()]);

        return $this->ok(['success' => true]);
    }

    public function markAllNotificationsRead(string $userId): JsonResponse
    {
        DB::table('notifications')->where('user_id', $userId)->update(['is_read' => true, 'updated_at' => now()]);

        return $this->ok(['success' => true]);
    }

    public function settings(string $userId): JsonResponse
    {
        $settings = DB::table('user_settings')->where('user_id', $userId)->first();

        return $this->ok([
            'emailNotifications' => $settings ? (bool) $settings->email_notifications : true,
            'pushNotifications' => $settings ? (bool) $settings->push_notifications : true,
            'outbreakWarnings' => $settings ? (bool) $settings->outbreak_warnings : true,
            'urgentAdvisory' => $settings ? (bool) $settings->urgent_advisory : true,
            'newCaseAlert' => $settings ? (bool) $settings->new_case_alert : true,
        ]);
    }

    public function updateSettings(Request $request, string $userId): JsonResponse
    {
        DB::table('user_settings')->updateOrInsert(['user_id' => $userId], [
            'email_notifications' => $request->boolean('emailNotifications'),
            'push_notifications' => $request->boolean('pushNotifications'),
            'outbreak_warnings' => $request->boolean('outbreakWarnings'),
            'urgent_advisory' => $request->boolean('urgentAdvisory'),
            'new_case_alert' => $request->boolean('newCaseAlert'),
            'updated_at' => now(),
            'created_at' => now(),
        ]);

        return $this->ok(['success' => true]);
    }

    public function tenants(): JsonResponse
    {
        return $this->ok(DB::table('tenants')->orderByDesc('created_at')->get()->map(fn ($tenant) => [
            'id' => $tenant->id,
            'name' => $tenant->name,
            'subdomain' => $tenant->subdomain,
            'planTier' => $tenant->plan_tier,
            'adminUserId' => $tenant->admin_user_id,
            'status' => $tenant->status,
            'farmerCount' => (int) $tenant->farmer_count,
            'createdAt' => $tenant->created_at,
            'mrr' => (float) $tenant->mrr,
        ]));
    }

    public function createTenant(Request $request): JsonResponse
    {
        $id = 'tenant_'.substr((string) time(), -5);
        $priceMap = ['basic' => 999, 'standard' => 2999, 'professional' => 5999, 'enterprise' => 0];
        DB::table('tenants')->insert([
            'id' => $id,
            'name' => $request->input('name'),
            'subdomain' => $request->input('subdomain'),
            'plan_tier' => $request->input('planTier', 'basic'),
            'admin_user_id' => 'usr_adm_001',
            'status' => 'trial',
            'farmer_count' => 0,
            'mrr' => $priceMap[$request->input('planTier', 'basic')] ?? 999,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return $this->ok(['success' => true, 'tenantId' => $id]);
    }

    public function updateTenant(Request $request, string $tenantId): JsonResponse
    {
        $data = [];
        foreach ($request->all() as $key => $value) {
            $data[match ($key) {
                'planTier' => 'plan_tier',
                'adminUserId' => 'admin_user_id',
                'farmerCount' => 'farmer_count',
                default => Str::snake($key),
            }] = $value;
        }
        $data['updated_at'] = now();
        DB::table('tenants')->where('id', $tenantId)->update($data);

        return $this->ok(['success' => true]);
    }

    public function adminStats(): JsonResponse
    {
        return $this->ok([
            'totalFarmers' => DB::table('farmers')->count(),
            'totalOfficers' => DB::table('officers')->count(),
            'totalVendors' => DB::table('vendors')->count(),
            'totalAdvisories' => DB::table('advisory_cases')->count(),
            'activeAdvisories' => DB::table('advisory_cases')->whereNotIn('status', ['closed', 'responded'])->count(),
            'mrr' => (float) DB::table('tenants')->sum('mrr'),
            'uptime' => 99.98,
            'advisoryDeliveryRate' => 96.4,
        ]);
    }

    public function auditLogs(): JsonResponse
    {
        return $this->ok(DB::table('audit_logs')->orderByDesc('created_at')->get()->map(fn ($log) => [
            'id' => $log->id,
            'entity' => $log->entity,
            'action' => $log->action,
            'actor' => $log->actor,
            'details' => $log->details,
            'createdAt' => $log->created_at,
        ]));
    }

    private function createNotification(string $userId, string $type, string $title, string $message, array $channel): void
    {
        DB::table('notifications')->insert([
            'id' => 'notif_'.Str::random(12),
            'user_id' => $userId,
            'type' => $type,
            'title' => $title,
            'message' => $message,
            'channel' => json_encode($channel),
            'is_read' => false,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
}
