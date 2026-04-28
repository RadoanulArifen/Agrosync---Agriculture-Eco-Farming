<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response as HttpResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Throwable;

class AgroSyncController extends Controller
{
    private const OTP_EXPIRY_MINUTES = 10;
    private ?bool $cropDealPaymentColumnsAvailable = null;
    private ?bool $orderSettlementColumnsAvailable = null;

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

    private function cropDealPaymentColumnsAvailable(): bool
    {
        if ($this->cropDealPaymentColumnsAvailable !== null) {
            return $this->cropDealPaymentColumnsAvailable;
        }

        $this->cropDealPaymentColumnsAvailable = Schema::hasColumns('crop_deals', ['payment_gateway', 'payment_status']);

        return $this->cropDealPaymentColumnsAvailable;
    }

    private function orderSettlementColumnsAvailable(): bool
    {
        if ($this->orderSettlementColumnsAvailable !== null) {
            return $this->orderSettlementColumnsAvailable;
        }

        $this->orderSettlementColumnsAvailable = Schema::hasColumns('orders', [
            'settlement_status',
            'settlement_released_at',
            'settlement_released_by',
        ]);

        return $this->orderSettlementColumnsAvailable;
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

    private function verifiedRegistrationOtp(Request $request, string $role): ?object
    {
        return DB::table('auth_otps')
            ->where('token', (string) $request->input('registrationOtpToken'))
            ->where('purpose', 'registration')
            ->where('email', $this->normalizedEmail($request->input('email')))
            ->where('role', $role)
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
                'active' => (bool) $officer->active,
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
            'farmerDivision' => $case->farmer_division ?? $farmer?->division ?? '',
            'farmerDistrict' => $case->farmer_district ?? $farmer?->district ?? '',
            'farmerUpazila' => $case->farmer_upazila ?? $farmer?->upazila ?? '',
            'cropType' => $case->crop_type,
            'description' => $case->description,
            'photos' => $this->arrayValue($case->photos),
            'status' => $case->status,
            'priority' => $case->priority ?: 'normal',
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

    private function demoAdvisoryCaseIds(): array
    {
        return [
            'ADV-2026-0000001',
            'ADV-2026-0000002',
            'ADV-2026-0000003',
            'ADV-2026-0000004',
        ];
    }

    public function updateUserProfile(Request $request, string $userId): JsonResponse
    {
        $user = DB::table('users')->where('public_id', $userId)->first();

        if (! $user) {
            return $this->fail('User not found.', 404);
        }

        $now = now();

        DB::transaction(function () use ($request, $user, $now): void {
            DB::table('users')
                ->where('public_id', $user->public_id)
                ->update([
                    'name' => $request->input('name', $user->name),
                    'name_bn' => $request->input('nameBn', $user->name_bn),
                    'email' => $this->normalizedEmail($request->input('email', $user->email)),
                    'phone' => $request->input('phone', $user->phone),
                    'division' => $request->input('division', $user->division),
                    'district' => $request->input('district', $user->district),
                    'upazila' => $request->input('upazila', $user->upazila),
                    'designation' => $request->input('designation', $user->designation),
                    'access_label' => $request->input('accessLabel', $user->access_label),
                    'updated_at' => $now,
                ]);

            if ($user->role === 'farmer') {
                DB::table('farmers')
                    ->where('user_id', $user->public_id)
                    ->update([
                        'name_bn' => $request->input('nameBn'),
                        'name_en' => $request->input('name', $user->name),
                        'division' => $request->input('division', $user->division),
                        'district' => $request->input('district', $user->district),
                        'upazila' => $request->input('upazila', $user->upazila),
                        'land_size' => $request->input('landAcres', 0),
                        'crop_types' => json_encode($request->input('cropTypes', [])),
                        'phone' => $request->input('phone', $user->phone),
                        'bkash_account' => $request->input('bkashAccount'),
                        'updated_at' => $now,
                    ]);
            }

            if ($user->role === 'officer') {
                DB::table('officers')
                    ->where('user_id', $user->public_id)
                    ->update([
                        'specialty_tags' => json_encode($request->input('specialtyTags', [])),
                        'region_districts' => json_encode($request->input('regionDistricts', [])),
                        'updated_at' => $now,
                    ]);
            }

            if ($user->role === 'vendor') {
                DB::table('vendors')
                    ->where('user_id', $user->public_id)
                    ->update([
                        'company_name' => $request->input('companyName', $user->name),
                        'delivery_districts' => json_encode($request->input('deliveryDistricts', [])),
                        'updated_at' => $now,
                    ]);
            }

            if ($user->role === 'company') {
                DB::table('companies')
                    ->where('user_id', $user->public_id)
                    ->update([
                        'company_name' => $request->input('companyName', $user->name),
                        'registration_no' => $request->input('registrationNo'),
                        'crop_interests' => json_encode($request->input('cropInterests', [])),
                        'updated_at' => $now,
                    ]);
            }
        });

        $updatedUser = DB::table('users')->where('public_id', $userId)->first();

        return $this->ok([
            'success' => true,
            'user' => $this->user($updatedUser),
        ]);
    }

    private function order(object $order): array
    {
        $farmer = DB::table('farmers')->where('id', $order->farmer_id)->first();
        $vendor = DB::table('vendors')->where('id', $order->vendor_id)->first();
        $supportsSettlement = $this->orderSettlementColumnsAvailable();
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
            'settlementStatus' => $supportsSettlement ? ($order->settlement_status ?? 'held') : 'held',
            'settlementReleasedAt' => $supportsSettlement ? ($order->settlement_released_at ?? null) : null,
            'settlementReleasedBy' => $supportsSettlement ? ($order->settlement_released_by ?? null) : null,
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
            if ($email === '' || ! str_contains($email, '@')) {
                return $this->ok(['success' => false, 'message' => 'Enter a valid email address.']);
            }

            if (DB::table('users')->whereRaw('lower(email) = ?', [$email])->exists()) {
                return $this->ok(['success' => false, 'message' => 'This email is already registered for another account.']);
            }

            $recipient = (object) [
                'public_id' => null,
                'email' => $email,
                'role' => $role,
                'name' => (string) $request->input('name', $role === 'officer' ? 'Officer' : 'Farmer'),
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

        if (in_array($role, ['farmer', 'officer', 'admin', 'vendor', 'company'], true)) {
            $verifiedRegistrationOtp = $this->verifiedRegistrationOtp($request, $role);

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

            if ($role === 'vendor') {
                DB::table('vendors')->insert([
                    'id' => $publicId,
                    'user_id' => $publicId,
                    'tenant_id' => $request->input('tenantId', 'tenant_001'),
                    'vendor_id' => $request->input('vendorId', 'VND-'.$suffix),
                    'company_name' => $request->input('companyName', $request->input('name', 'New Vendor')),
                    'delivery_districts' => json_encode($request->input('deliveryDistricts', [])),
                    'status' => 'approved',
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }

            if ($role === 'company') {
                DB::table('companies')->insert([
                    'id' => $publicId,
                    'user_id' => $publicId,
                    'tenant_id' => $request->input('tenantId', 'tenant_001'),
                    'company_id' => $request->input('companyId', 'CMP-'.$suffix),
                    'company_name' => $request->input('companyName', $request->input('name', 'New Company')),
                    'registration_no' => $request->input('registrationNo', 'COMP-'.$now->year.'-'.$suffix),
                    'crop_interests' => json_encode($request->input('cropInterests', [])),
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
            ->when($request->filled('officerId'), function ($query) use ($request) {
                $officerId = trim((string) $request->input('officerId'));
                if ($officerId === '') {
                    return;
                }

                $matchedOfficerIds = DB::table('officers')
                    ->where('officer_id', $officerId)
                    ->pluck('id')
                    ->filter()
                    ->values()
                    ->all();

                $query->where(function ($innerQuery) use ($officerId, $matchedOfficerIds): void {
                    $innerQuery->where('officer_id', $officerId);
                    if (! empty($matchedOfficerIds)) {
                        $innerQuery->orWhereIn('officer_id', $matchedOfficerIds);
                    }
                });
            })
            ->when($request->filled('status'), fn ($query) => $query->where('status', $request->input('status')))
            ->when($request->filled('q'), function ($query) use ($request) {
                $search = '%'.strtolower(trim((string) $request->input('q'))).'%';
                $farmerIds = DB::table('farmers')
                    ->whereRaw('lower(name_en) like ?', [$search])
                    ->pluck('id')
                    ->filter()
                    ->values()
                    ->all();

                $query->where(function ($innerQuery) use ($search, $farmerIds): void {
                    $innerQuery
                        ->whereRaw('lower(id) like ?', [$search])
                        ->orWhereRaw('lower(crop_type) like ?', [$search])
                        ->orWhereRaw('lower(description) like ?', [$search]);

                    if (! empty($farmerIds)) {
                        $innerQuery->orWhereIn('farmer_id', $farmerIds);
                    }
                });
            })
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

        $priority = strtolower(trim((string) $request->input('priority'))) === 'urgent' ? 'urgent' : 'normal';
        $caseId = 'ADV-'.now()->year.'-'.str_pad((string) random_int(1, 9999999), 7, '0', STR_PAD_LEFT);
        DB::table('advisory_cases')->insert([
            'id' => $caseId,
            'tenant_id' => $farmer->tenant_id,
            'farmer_id' => $farmer->id,
            'farmer_division' => $farmer->division,
            'farmer_district' => $farmer->district,
            'farmer_upazila' => $farmer->upazila,
            'crop_type' => $request->input('cropType'),
            'description' => $request->input('description'),
            'photos' => json_encode($request->input('photos', [])),
            'status' => 'pending',
            'priority' => $priority,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        DB::table('advisory_messages')->insert([
            'case_id' => $caseId,
            'sender_id' => $farmer->id,
            'sender_role' => 'farmer',
            'message' => trim((string) $request->input('description', '')),
            'attachments' => json_encode($request->input('photos', [])),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->createNotification($farmer->id, 'advisory', 'Advisory Submitted', "Your advisory case {$caseId} has been submitted.", ['push', 'email']);
        $this->notifyOfficersForAdvisory($farmer, $caseId, $request->input('cropType'), $priority);

        return $this->ok(['success' => true, 'caseId' => $caseId]);
    }

    public function respondToCase(Request $request, string $caseId): JsonResponse
    {
        $case = DB::table('advisory_cases')->where('id', $caseId)->first();
        if (! $case) {
            return $this->fail('Advisory case not found.', 404);
        }

        $responseText = trim((string) $request->input('response'));
        if ($responseText === '') {
            return $this->fail('Response is required.');
        }

        $requestedOfficerId = trim((string) $request->input('officerId'));
        $officer = DB::table('officers')
            ->where('id', $requestedOfficerId)
            ->orWhere('officer_id', $requestedOfficerId)
            ->first();

        DB::table('advisory_cases')->where('id', $caseId)->update([
            'status' => 'responded',
            'officer_id' => $officer?->id ?? ($case->officer_id ?: $requestedOfficerId),
            'officer_response' => $responseText,
            'responded_at' => now(),
            'updated_at' => now(),
        ]);
        DB::table('advisory_messages')->insert([
            'case_id' => $caseId,
            'sender_id' => $officer?->user_id ?? $requestedOfficerId,
            'sender_role' => 'officer',
            'message' => $responseText,
            'attachments' => json_encode([]),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $this->createNotification(
            (string) $case->farmer_id,
            'advisory',
            'Officer Response Received',
            "An officer has responded to your advisory case {$caseId}.",
            ['push', 'sms'],
        );

        return $this->ok(['success' => true]);
    }

    public function regionalAdvisoryStats(Request $request): JsonResponse
    {
        $stats = DB::table('advisory_cases')
            ->whereNotIn('advisory_cases.id', $this->demoAdvisoryCaseIds())
            ->join('farmers', 'advisory_cases.farmer_id', '=', 'farmers.id')
            ->whereRaw("COALESCE(NULLIF(advisory_cases.farmer_district, ''), farmers.district) is not null")
            ->whereRaw("COALESCE(NULLIF(advisory_cases.farmer_district, ''), farmers.district) != ''")
            ->select(
                DB::raw("COALESCE(NULLIF(advisory_cases.farmer_division, ''), farmers.division) as division"),
                DB::raw("COALESCE(NULLIF(advisory_cases.farmer_district, ''), farmers.district) as district"),
                DB::raw('COUNT(advisory_cases.id) as count'),
                DB::raw("SUM(CASE WHEN advisory_cases.status = 'pending' THEN 1 ELSE 0 END) as pending_count"),
                DB::raw("SUM(CASE WHEN advisory_cases.status = 'responded' THEN 1 ELSE 0 END) as responded_count"),
                DB::raw("SUM(CASE WHEN advisory_cases.status IN ('resolved', 'closed') THEN 1 ELSE 0 END) as resolved_count")
            )
            ->groupBy(
                DB::raw("COALESCE(NULLIF(advisory_cases.farmer_division, ''), farmers.division)"),
                DB::raw("COALESCE(NULLIF(advisory_cases.farmer_district, ''), farmers.district)")
            )
            ->orderByDesc(DB::raw('COUNT(advisory_cases.id)'))
            ->get()
            ->map(fn ($row) => [
                'division' => $row->division,
                'district' => $row->district,
                'total_cases' => $row->count,
                'pending_cases' => $row->pending_count,
                'responded_cases' => $row->responded_count,
                'resolved_cases' => $row->resolved_count,
            ]);

        return $this->ok($stats);
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

        if (! $request->filled('vendorId') && $request->boolean('includeCropListings', false)) {
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
        DB::table('carts')->updateOrInsert(['id' => $cartId], 
        ['farmer_id' => $farmerId, 'updated_at' => now(), 'created_at' => now()]);

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
            ->when($request->filled('vendorId'), fn ($query) => $query->where('vendor_id', $request->input('vendorId')))
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
        $paymentGateway = trim((string) $request->input('paymentGateway', 'cod'));
        $initialPaymentStatus = $paymentGateway === 'cod'
            ? 'pending'
            : ($paymentGateway === 'stripe' ? 'pending' : 'paid');

        $supportsSettlement = $this->orderSettlementColumnsAvailable();
        DB::transaction(function () use ($farmer, $products, $vendorId, $orderId, $total, $maxDays, $supportsSettlement, $paymentGateway, $initialPaymentStatus): void {
            $orderPayload = [
                'id' => $orderId,
                'tenant_id' => $farmer->tenant_id,
                'farmer_id' => $farmer->id,
                'vendor_id' => $vendorId,
                'status' => 'pending',
                'total_amount' => $total,
                'payment_gateway' => $paymentGateway,
                'payment_status' => $initialPaymentStatus,
                'estimated_delivery' => now()->addDays($maxDays)->toDateString(),
                'placed_at' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ];
            if ($supportsSettlement) {
                $orderPayload['settlement_status'] = 'held';
                $orderPayload['settlement_released_at'] = null;
                $orderPayload['settlement_released_by'] = null;
            }
            DB::table('orders')->insert($orderPayload);

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
        $vendorUserId = DB::table('vendors')->where('id', $vendorId)->value('user_id');
        if ($vendorUserId) {
            $this->createNotification(
                (string) $vendorUserId,
                'order',
                'New Order Received',
                "New order {$orderId} has been placed and is waiting for your confirmation.",
                ['push', 'sms'],
            );
        }

        return $this->ok(['success' => true, 'orderId' => $orderId]);
    }

    public function updateOrderStatus(Request $request, string $orderId): JsonResponse
    {
        $order = DB::table('orders')->where('id', $orderId)->first();
        if (! $order) {
            return $this->fail('Order not found.', 404);
        }

        $nextStatus = (string) $request->input('status');
        $supportsSettlement = $this->orderSettlementColumnsAvailable();
        $nextPaymentStatus = (string) $order->payment_status;
        if ($order->payment_gateway === 'cod' && in_array($nextStatus, ['delivered', 'completed'], true)) {
            $nextPaymentStatus = 'paid';
        }

        $updatePayload = [
            'status' => $nextStatus,
            'payment_status' => $nextPaymentStatus,
            'delivered_at' => $nextStatus === 'delivered' ? now() : DB::raw('delivered_at'),
            'updated_at' => now(),
        ];
        if ($supportsSettlement) {
            $currentSettlement = $order->settlement_status ?? 'held';
            if ($currentSettlement !== 'released') {
                $updatePayload['settlement_status'] = in_array($nextStatus, ['delivered', 'completed'], true) && $nextPaymentStatus === 'paid'
                    ? 'ready_for_release'
                    : 'held';
            }
        }

        DB::table('orders')->where('id', $orderId)->update($updatePayload);
        DB::table('order_status_history')->insert([
            'order_id' => $orderId,
            'status' => $nextStatus,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        if ($nextStatus === 'confirmed') {
            $this->createNotification(
                (string) $order->farmer_id,
                'order',
                'Order Confirmed',
                "Vendor confirmed order {$orderId}.",
                ['push', 'sms'],
            );
        }

        return $this->ok(['success' => true]);
    }

    public function adminOrders(Request $request): JsonResponse
    {
        $orders = DB::table('orders')
            ->when($request->filled('status'), fn ($query) => $query->where('status', $request->input('status')))
            ->when($request->filled('paymentStatus'), fn ($query) => $query->where('payment_status', $request->input('paymentStatus')))
            ->when($request->filled('settlementStatus') && $this->orderSettlementColumnsAvailable(), fn ($query) => $query->where('settlement_status', $request->input('settlementStatus')))
            ->orderByDesc('placed_at')
            ->get()
            ->map(fn ($order) => $this->order($order));

        return $this->ok($orders);
    }

    public function updateOrderSettlement(Request $request, string $orderId): JsonResponse
    {
        if (! $this->orderSettlementColumnsAvailable()) {
            return $this->fail('Order settlement module is not available.', 422);
        }

        $order = DB::table('orders')->where('id', $orderId)->first();
        if (! $order) {
            return $this->fail('Order not found.', 404);
        }

        $action = strtolower(trim((string) $request->input('action', 'release')));
        if (! in_array($action, ['release', 'hold'], true)) {
            return $this->fail('Invalid settlement action.', 422);
        }

        if ($action === 'release') {
            if (! in_array($order->status, ['delivered', 'completed'], true)) {
                return $this->fail('Payment can be released only after delivery confirmation.');
            }
            if (($order->payment_status ?? 'pending') !== 'paid') {
                return $this->fail('Order payment is not completed yet.');
            }

            DB::table('orders')->where('id', $orderId)->update([
                'settlement_status' => 'released',
                'settlement_released_at' => now(),
                'settlement_released_by' => trim((string) $request->input('adminId', 'usr_adm_001')),
                'updated_at' => now(),
            ]);

            $vendor = DB::table('vendors')->where('id', $order->vendor_id)->first();
            if ($vendor?->user_id) {
                $this->createNotification(
                    $vendor->user_id,
                    'payment',
                    'Vendor Payout Released',
                    "Admin released settlement for order {$orderId}.",
                    ['push', 'sms']
                );
            }
            $this->createNotification(
                $order->farmer_id,
                'payment',
                'Order Settlement Completed',
                "Payment for order {$orderId} was released to the vendor after delivery confirmation.",
                ['push']
            );
            $this->createAuditLog(
                'order',
                'settlement_release',
                'Super Admin',
                "Released vendor settlement for order {$orderId}."
            );

            return $this->ok(['success' => true]);
        }

        DB::table('orders')->where('id', $orderId)->update([
            'settlement_status' => 'held',
            'settlement_released_at' => null,
            'settlement_released_by' => null,
            'updated_at' => now(),
        ]);
        $this->createAuditLog(
            'order',
            'settlement_hold',
            'Super Admin',
            "Kept vendor settlement on hold for order {$orderId}."
        );

        return $this->ok(['success' => true]);
    }

    public function cropListings(Request $request): JsonResponse
    {
        $listings = DB::table('crop_listings')
            ->when($request->filled('farmerId'), function ($query) use ($request) {
                $farmerId = trim((string) $request->input('farmerId'));
                $farmer = DB::table('farmers')
                    ->where('id', $farmerId)
                    ->orWhere('user_id', $farmerId)
                    ->first();
                $candidateIds = array_filter(array_unique([
                    $farmerId,
                    $farmer?->id,
                    $farmer?->user_id,
                ]));
                $query->whereIn('farmer_id', $candidateIds);
            })
            ->orderByDesc('created_at')
            ->get()
            ->map(fn ($listing) => $this->cropListing($listing));

        return $this->ok($listings);
    }

    public function createCropListing(Request $request): JsonResponse
    {
        $farmerIdInput = trim((string) $request->input('farmerId'));
        $farmer = DB::table('farmers')
            ->where('id', $farmerIdInput)
            ->orWhere('user_id', $farmerIdInput)
            ->first();
        $id = 'CRP-'.str_pad((string) random_int(1, 999), 3, '0', STR_PAD_LEFT);
        DB::table('crop_listings')->insert([
            'id' => $id,
            'tenant_id' => $farmer?->tenant_id ?? 'tenant_001',
            'farmer_id' => $farmer?->id ?? $farmerIdInput,
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

    public function updateCropListing(Request $request, string $listingId): JsonResponse
    {
        $listing = DB::table('crop_listings')->where('id', $listingId)->first();

        if (! $listing) {
            return $this->fail('Listing not found.', 404);
        }

        $payload = [];
        $allowedColumns = [
            'productCategory' => 'product_category',
            'cropType' => 'crop_type',
            'variety' => 'variety',
            'quantityKg' => 'quantity_kg',
            'qualityGrade' => 'quality_grade',
            'askingPrice' => 'asking_price',
            'harvestDate' => 'harvest_date',
            'district' => 'district',
            'upazila' => 'upazila',
            'photos' => 'photos',
            'status' => 'status',
            'matchedCompanyId' => 'matched_company_id',
        ];

        foreach ($allowedColumns as $requestKey => $column) {
            if (! $request->exists($requestKey)) {
                continue;
            }

            $value = $request->input($requestKey);
            $payload[$column] = $requestKey === 'photos' ? json_encode($value) : $value;
        }

        $payload['updated_at'] = now();

        DB::table('crop_listings')->where('id', $listingId)->update($payload);

        return $this->ok(['success' => true]);
    }

    public function deleteCropListing(string $listingId): JsonResponse
    {
        $deleted = DB::table('crop_listings')->where('id', $listingId)->delete();

        if (! $deleted) {
            return $this->fail('Listing not found.', 404);
        }

        return $this->ok(['success' => true]);
    }

    public function expressInterest(Request $request): JsonResponse
    {
        $listing = DB::table('crop_listings')->where('id', $request->input('listingId'))->first();
        if (! $listing) {
            return $this->ok(['success' => false, 'message' => 'Listing not found.']);
        }

        $companyIdInput = trim((string) $request->input('companyId'));
        if ($companyIdInput === '') {
            return $this->ok(['success' => false, 'message' => 'Company is required.']);
        }

        $company = DB::table('companies')
            ->where('id', $companyIdInput)
            ->orWhere('user_id', $companyIdInput)
            ->first();
        if (! $company) {
            $companyUser = DB::table('users')
                ->where('public_id', $companyIdInput)
                ->where('role', 'company')
                ->first();

            if ($companyUser) {
                DB::table('companies')->updateOrInsert(
                    ['id' => $companyUser->public_id],
                    [
                        'user_id' => $companyUser->public_id,
                        'tenant_id' => $companyUser->tenant_id ?? 'tenant_001',
                        'company_id' => 'CMP-'.strtoupper(substr(md5($companyUser->public_id), 0, 6)),
                        'company_name' => $request->input('companyName', $companyUser->name ?? 'Company'),
                        'registration_no' => 'AUTO-'.$companyUser->public_id,
                        'crop_interests' => json_encode([]),
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]
                );
            } else {
                // Defensive fallback: ensure FK-safe company row exists even for legacy company ids.
                DB::table('companies')->updateOrInsert(
                    ['id' => $companyIdInput],
                    [
                        'user_id' => $companyIdInput,
                        'tenant_id' => $listing->tenant_id ?? 'tenant_001',
                        'company_id' => 'CMP-'.strtoupper(substr(md5($companyIdInput), 0, 6)),
                        'company_name' => trim((string) $request->input('companyName', 'Company')),
                        'registration_no' => 'AUTO-'.$companyIdInput,
                        'crop_interests' => json_encode([]),
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]
                );
            }

            $company = DB::table('companies')
                ->where('id', $companyIdInput)
                ->orWhere('user_id', $companyIdInput)
                ->first();
        }
        $companyEntityId = (string) ($company?->id ?: $companyIdInput);
        $companyUserId = (string) ($company?->user_id ?: $companyIdInput);

        $allowRepeat = $request->boolean('allowRepeat', false);
        $existing = DB::table('crop_deals')
            ->where('listing_id', $listing->id)
            ->whereIn('company_id', array_filter(array_unique([
                $companyEntityId,
                $companyUserId,
                $companyIdInput,
            ])))
            ->whereIn('status', ['pending', 'confirmed', 'negotiating', 'locked', 'order_placed', 'accepted', 'delivered'])
            ->orderByDesc('created_at')
            ->first();
        if ($existing && ! $allowRepeat) {
            return $this->ok(['success' => true, 'matchId' => $existing->id, 'message' => 'Interest already sent.']);
        }

        $companyName = $company?->company_name ?: trim((string) $request->input('companyName', 'A company'));
        $id = 'deal_'.substr((string) time(), -6).random_int(10, 99);
        $requestedQty = min(
            max((int) $request->input('quantityKg', (int) $listing->quantity_kg), 1),
            (int) $listing->quantity_kg
        );
        $requestedPaymentGateway = $request->input('paymentGateway');
        $supportsDealPayment = $this->cropDealPaymentColumnsAvailable();
        DB::transaction(function () use ($id, $listing, $companyEntityId, $requestedQty, $requestedPaymentGateway, $supportsDealPayment): void {
            $payload = [
                'id' => $id,
                'listing_id' => $listing->id,
                'company_id' => $companyEntityId,
                'farmer_id' => $listing->farmer_id,
                'agreed_price' => $listing->asking_price,
                'quantity_kg' => $requestedQty,
                'commission_pct' => 3,
                'commission_amt' => round(((float) $listing->asking_price) * $requestedQty * 0.03),
                'status' => 'confirmed',
                'confirmed_at' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ];
            if ($supportsDealPayment) {
                $payload['payment_gateway'] = $requestedPaymentGateway;
                $payload['payment_status'] = 'pending';
            }

            DB::table('crop_deals')->insert($payload);

            DB::table('crop_listings')->where('id', $listing->id)->update([
                'status' => 'matched',
                'matched_company_id' => $companyEntityId,
                'updated_at' => now(),
            ]);
        });

        return $this->ok([
            'success' => true,
            'matchId' => $id,
            'message' => $allowRepeat ? 'Repeat match request sent.' : null,
        ]);
    }

    public function cropDeals(Request $request): JsonResponse
    {
        $supportsDealPayment = $this->cropDealPaymentColumnsAvailable();
        $deals = DB::table('crop_deals')
            ->when($request->filled('companyId'), function ($query) use ($request) {
                $companyId = trim((string) $request->input('companyId'));
                $company = DB::table('companies')
                    ->where('id', $companyId)
                    ->orWhere('user_id', $companyId)
                    ->first();
                $candidateIds = array_filter(array_unique([
                    $companyId,
                    $company?->id,
                    $company?->user_id,
                ]));
                $query->whereIn('company_id', $candidateIds);
            })
            ->when($request->filled('farmerId'), function ($query) use ($request) {
                $farmerId = trim((string) $request->input('farmerId'));
                $farmer = DB::table('farmers')
                    ->where('id', $farmerId)
                    ->orWhere('user_id', $farmerId)
                    ->first();
                $candidateIds = array_filter(array_unique([
                    $farmerId,
                    $farmer?->id,
                    $farmer?->user_id,
                ]));
                $candidateListingIds = DB::table('crop_listings')
                    ->whereIn('farmer_id', $candidateIds)
                    ->pluck('id')
                    ->all();

                $query->where(function ($inner) use ($candidateIds, $candidateListingIds) {
                    $inner->whereIn('farmer_id', $candidateIds);
                    if (! empty($candidateListingIds)) {
                        $inner->orWhereIn('listing_id', $candidateListingIds);
                    }
                });
            })
            ->orderByDesc('created_at')
            ->get()
            ->map(function ($deal) use ($supportsDealPayment) {
                $company = DB::table('companies')->where('id', $deal->company_id)->first();
                if (! $company) {
                    $company = DB::table('companies')->where('user_id', $deal->company_id)->first();
                }
                $farmer = DB::table('farmers')->where('id', $deal->farmer_id)->first();
                if (! $farmer) {
                    $farmer = DB::table('farmers')->where('user_id', $deal->farmer_id)->first();
                }

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
                    'paymentGateway' => $supportsDealPayment ? ($deal->payment_gateway ?? null) : null,
                    'paymentStatus' => $supportsDealPayment ? ($deal->payment_status ?? null) : null,
                ];
            });

        return $this->ok($deals);
    }

    public function updateDealStatus(Request $request, string $dealId): JsonResponse
    {
        $deal = DB::table('crop_deals')->where('id', $dealId)->first();
        if (! $deal) {
            return $this->fail('Deal not found.', 404);
        }

        $nextStatus = trim((string) $request->input('status'));
        if ($nextStatus === '') {
            return $this->fail('Status is required.');
        }

        $allowedStatuses = [
            'pending', 'confirmed', 'negotiating', 'locked', 'order_placed',
            'accepted', 'delivered', 'completed', 'cancelled',
        ];
        if (! in_array($nextStatus, $allowedStatuses, true)) {
            return $this->fail('Invalid deal status.');
        }

        $actorRole = trim((string) $request->input('actorRole'));
        if ($actorRole === '') {
            $actorRole = in_array($nextStatus, ['confirmed', 'accepted', 'delivered'], true) ? 'farmer' : 'company';
        }

        $allowedTransitions = [
            'pending' => [
                'farmer' => ['confirmed', 'cancelled'],
            ],
            'confirmed' => [
                'company' => ['negotiating', 'locked', 'cancelled', 'completed'],
            ],
            'negotiating' => [
                'company' => ['negotiating', 'locked', 'cancelled'],
                'farmer' => ['negotiating', 'locked', 'cancelled'],
            ],
            'locked' => [
                'company' => ['order_placed', 'cancelled'],
            ],
            'order_placed' => [
                'farmer' => ['accepted', 'cancelled'],
            ],
            'accepted' => [
                'farmer' => ['delivered'],
            ],
            'delivered' => [
                'company' => ['completed'],
            ],
        ];
        $validNext = $allowedTransitions[$deal->status][$actorRole] ?? [];
        if (! in_array($nextStatus, $validNext, true) && $deal->status !== $nextStatus) {
            return $this->fail('This status change is not allowed right now.');
        }

        $supportsDealPayment = $this->cropDealPaymentColumnsAvailable();
        $currentPaymentGateway = $supportsDealPayment ? ($deal->payment_gateway ?? null) : null;
        $currentPaymentStatus = $supportsDealPayment ? ($deal->payment_status ?? null) : null;

        $nextPrice = $request->filled('agreedPrice') ? (float) $request->input('agreedPrice') : (float) $deal->agreed_price;
        $nextQty = $request->filled('quantityKg') ? (int) $request->input('quantityKg') : (int) $deal->quantity_kg;
        $nextPaymentGateway = $request->filled('paymentGateway') ? (string) $request->input('paymentGateway') : $currentPaymentGateway;
        $nextPaymentStatus = $request->filled('paymentStatus')
            ? (string) $request->input('paymentStatus')
            : ($nextStatus === 'completed' ? 'paid' : ($currentPaymentStatus ?: 'pending'));
        if ($nextStatus === 'locked') {
            // Locking starts a fresh payment attempt for this deal.
            $nextPaymentStatus = 'pending';
        }
        if ($nextStatus === 'order_placed' && $supportsDealPayment) {
            $effectiveGateway = trim((string) ($nextPaymentGateway ?: 'bkash'));
            $effectivePaymentStatus = trim((string) ($currentPaymentStatus ?: $nextPaymentStatus ?: 'pending'));
            if ($effectiveGateway !== 'cod' && $effectivePaymentStatus !== 'paid') {
                return $this->fail('Please complete payment before placing order.');
            }
        }
        if ($nextPrice <= 0 || $nextQty <= 0) {
            return $this->fail('Price and quantity must be greater than zero.');
        }
        if ($deal->status === $nextStatus) {
            $payload = [
                'agreed_price' => $nextPrice,
                'quantity_kg' => $nextQty,
                'commission_amt' => round($nextPrice * $nextQty * (((float) $deal->commission_pct) / 100), 2),
                'updated_at' => now(),
            ];
            if ($supportsDealPayment) {
                $payload['payment_gateway'] = $nextPaymentGateway;
                $payload['payment_status'] = $nextPaymentStatus;
            }

            DB::table('crop_deals')->where('id', $deal->id)->update($payload);

            return $this->ok(['success' => true]);
        }

        DB::transaction(function () use ($deal, $nextStatus, $actorRole, $nextPrice, $nextQty, $nextPaymentGateway, $nextPaymentStatus, $supportsDealPayment): void {
            $companyUserId = DB::table('companies')->where('id', $deal->company_id)->value('user_id')
                ?: DB::table('companies')->where('user_id', $deal->company_id)->value('user_id');
            $companyTargets = array_values(array_filter(array_unique([$deal->company_id, $companyUserId])));
            $farmerUserId = DB::table('farmers')->where('id', $deal->farmer_id)->value('user_id')
                ?: DB::table('farmers')->where('user_id', $deal->farmer_id)->value('user_id');
            $farmerTargets = array_values(array_filter(array_unique([$deal->farmer_id, $farmerUserId])));
            $companyName = DB::table('companies')->where('id', $deal->company_id)->value('company_name')
                ?: DB::table('companies')->where('user_id', $deal->company_id)->value('company_name')
                ?: 'Company';
            $farmerName = DB::table('farmers')->where('id', $deal->farmer_id)->value('name_en')
                ?: DB::table('farmers')->where('user_id', $deal->farmer_id)->value('name_en')
                ?: 'Farmer';

            $payload = [
                'status' => $nextStatus,
                'agreed_price' => $nextPrice,
                'quantity_kg' => $nextQty,
                'commission_amt' => round($nextPrice * $nextQty * (((float) $deal->commission_pct) / 100), 2),
                'confirmed_at' => $nextStatus === 'confirmed' ? now() : DB::raw('confirmed_at'),
                'updated_at' => now(),
            ];
            if ($supportsDealPayment) {
                $payload['payment_gateway'] = $nextPaymentGateway;
                $payload['payment_status'] = $nextPaymentStatus;
            }

            DB::table('crop_deals')->where('id', $deal->id)->update($payload);

            if (in_array($nextStatus, ['confirmed', 'negotiating', 'locked', 'order_placed', 'accepted', 'delivered'], true)) {
                DB::table('crop_listings')->where('id', $deal->listing_id)->update([
                    'status' => 'matched',
                    'matched_company_id' => $deal->company_id,
                    'updated_at' => now(),
                ]);
            }

            if ($nextStatus === 'completed') {
                DB::table('crop_listings')->where('id', $deal->listing_id)->update([
                    'status' => 'sold',
                    'matched_company_id' => $deal->company_id,
                    'updated_at' => now(),
                ]);
            }

            if ($nextStatus === 'confirmed') {
                foreach ($companyTargets as $recipientId) {
                    $this->createNotification(
                        $recipientId,
                        'crop_deal',
                        'Deal Accepted by Farmer',
                        "{$farmerName} accepted your offer for listing {$deal->listing_id}.",
                        ['push', 'email'],
                    );
                }
                foreach ($farmerTargets as $recipientId) {
                    $this->createNotification(
                        $recipientId,
                        'crop_deal',
                        'Offer Accepted Successfully',
                        "You accepted {$companyName}'s offer for listing {$deal->listing_id}.",
                        ['push', 'sms'],
                    );
                }
            } elseif ($nextStatus === 'negotiating') {
                if ($actorRole === 'company') {
                    foreach ($farmerTargets as $recipientId) {
                        $this->createNotification(
                            $recipientId,
                            'crop_deal',
                            'New Offer from Company',
                            "{$companyName} sent an updated offer for listing {$deal->listing_id}: ৳{$nextPrice}/kg, {$nextQty} kg.",
                            ['push', 'sms'],
                        );
                    }
                } else {
                    foreach ($companyTargets as $recipientId) {
                        $this->createNotification(
                            $recipientId,
                            'crop_deal',
                            'Final Offer from Farmer',
                            "{$farmerName} sent a final offer for listing {$deal->listing_id}: ৳{$nextPrice}/kg, {$nextQty} kg.",
                            ['push', 'email'],
                        );
                    }
                }
            } elseif ($nextStatus === 'locked') {
                foreach ($farmerTargets as $recipientId) {
                    $this->createNotification(
                        $recipientId,
                        'crop_deal',
                        'Deal Locked',
                        "{$companyName} locked deal {$deal->id}. Next step: company will place order.",
                        ['push', 'sms'],
                    );
                }
            } elseif ($nextStatus === 'order_placed') {
                foreach ($farmerTargets as $recipientId) {
                    $this->createNotification(
                        $recipientId,
                        'crop_deal',
                        'Order Placed by Company',
                        "{$companyName} placed order for deal {$deal->id}. Please accept or reject from My Orders.",
                        ['push', 'sms'],
                    );
                }
            } elseif ($nextStatus === 'accepted') {
                foreach ($companyTargets as $recipientId) {
                    $this->createNotification(
                        $recipientId,
                        'crop_deal',
                        'Order Accepted by Farmer',
                        "{$farmerName} accepted order for deal {$deal->id}.",
                        ['push', 'email'],
                    );
                }
                foreach ($farmerTargets as $recipientId) {
                    $this->createNotification(
                        $recipientId,
                        'crop_deal',
                        'Order Accepted Successfully',
                        "You accepted {$companyName}'s order for deal {$deal->id}.",
                        ['push', 'sms'],
                    );
                }
            } elseif ($nextStatus === 'delivered') {
                foreach ($companyTargets as $recipientId) {
                    $this->createNotification(
                        $recipientId,
                        'crop_deal',
                        'Order Marked Delivered',
                        "{$farmerName} marked deal {$deal->id} as delivered. Please complete payment.",
                        ['push', 'email'],
                    );
                }
            } elseif ($nextStatus === 'completed') {
                foreach ($farmerTargets as $recipientId) {
                    $this->createNotification(
                        $recipientId,
                        'crop_deal',
                        'Payment Completed',
                        "{$companyName} completed payment for deal {$deal->id}.",
                        ['push', 'sms'],
                    );
                }
            }

            if ($nextStatus === 'cancelled') {
                $listing = DB::table('crop_listings')->where('id', $deal->listing_id)->first();
                if ($listing && $listing->matched_company_id === $deal->company_id) {
                    DB::table('crop_listings')->where('id', $deal->listing_id)->update([
                        'status' => 'active',
                        'matched_company_id' => null,
                        'updated_at' => now(),
                    ]);
                }

                if ($actorRole === 'farmer') {
                    foreach ($companyTargets as $recipientId) {
                        $this->createNotification(
                            $recipientId,
                            'crop_deal',
                            'Deal Rejected by Farmer',
                            "{$farmerName} rejected your offer for listing {$deal->listing_id}.",
                            ['push', 'email'],
                        );
                    }
                    foreach ($farmerTargets as $recipientId) {
                        $this->createNotification(
                            $recipientId,
                            'crop_deal',
                            'Deal Rejection Submitted',
                            "You rejected {$companyName}'s offer for listing {$deal->listing_id}.",
                            ['push', 'sms'],
                        );
                    }
                } else {
                    foreach ($farmerTargets as $recipientId) {
                        $this->createNotification(
                            $recipientId,
                            'crop_deal',
                            'Deal Cancelled by Company',
                            "{$companyName} cancelled deal {$deal->id}.",
                            ['push', 'sms'],
                        );
                    }
                }
            }
        });

        return $this->ok(['success' => true]);
    }

    public function initiateSslCommerzPayment(Request $request): JsonResponse
    {
        $dealId = trim((string) $request->input('dealId'));
        $companyId = trim((string) $request->input('companyId'));
        $listingId = trim((string) $request->input('listingId'));

        if ($companyId === '' || ($dealId === '' && $listingId === '')) {
            return $this->fail('Company ID and either deal ID or listing ID are required.');
        }

        $company = DB::table('companies')
            ->where('id', $companyId)
            ->orWhere('user_id', $companyId)
            ->first();
        $candidateCompanyIds = array_values(array_filter(array_unique([
            $companyId,
            (string) ($company?->id ?? ''),
            (string) ($company?->user_id ?? ''),
        ])));
        if (count($candidateCompanyIds) === 0) {
            $candidateCompanyIds = [$companyId];
        }

        $deal = null;
        if ($dealId !== '') {
            $deal = DB::table('crop_deals')
                ->where('id', $dealId)
                ->whereIn('company_id', $candidateCompanyIds)
                ->first();
            if (! $deal) {
                // Fallback for legacy rows where company_id format differs.
                $deal = DB::table('crop_deals')
                    ->where('id', $dealId)
                    ->first();
            }
        }

        // Legacy fallback when only listingId is available from old clients.
        if (! $deal && $dealId === '' && $listingId !== '') {
            $deal = DB::table('crop_deals')
                ->where('listing_id', $listingId)
                ->whereIn('company_id', $candidateCompanyIds)
                ->orderByDesc('created_at')
                ->first();
        }

        if (! $deal) {
            return $this->fail('Deal not found.', 404);
        }

        $dealId = (string) $deal->id;

        if ((string) $deal->status !== 'locked') {
            return $this->fail('Please lock the deal before starting sandbox payment.');
        }

        if (($deal->payment_status ?? 'pending') === 'paid') {
            return $this->ok([
                'success' => true,
                'alreadyPaid' => true,
                'message' => 'Payment already completed for this deal. You can place order now.',
            ]);
        }

        $amount = max(1, round(((float) $deal->agreed_price) * ((int) $deal->quantity_kg), 2));
        $frontendBaseUrl = rtrim((string) env('FRONTEND_URL', env('APP_URL', 'http://localhost:3000')), '/');
        $callbackBase = rtrim((string) env('APP_URL', 'http://localhost:8000'), '/').'/api/v1/payments/sslcommerz';
        $storeId = (string) env('SSLCOMMERZ_STORE_ID', 'agris69eef34ef232f');
        $storePassword = (string) env('SSLCOMMERZ_STORE_PASSWORD', 'agris69eef34ef232f@ssl');
        $tranId = 'DEAL_'.Str::upper(Str::random(20));

        $companyName = trim((string) ($company?->company_name ?: 'Company'));

        $customerEmail = trim((string) $request->input('customerEmail', 'test@test.com'));
        $customerPhone = trim((string) $request->input('customerPhone', '01711111111'));
        $customerAddress = trim((string) $request->input('customerAddress', 'Dhaka'));
        $customerCity = trim((string) $request->input('customerCity', 'Dhaka'));
        $customerState = trim((string) $request->input('customerState', 'Dhaka'));
        $customerPostcode = trim((string) $request->input('customerPostcode', '1000'));

        $requestedGateway = trim((string) $request->input('paymentGateway', $deal->payment_gateway ?: 'bkash'));

        $postData = [
            'store_id' => $storeId,
            'store_passwd' => $storePassword,
            'total_amount' => (string) $amount,
            'currency' => 'BDT',
            'tran_id' => $tranId,
            'success_url' => $callbackBase.'/success',
            'fail_url' => $callbackBase.'/fail',
            'cancel_url' => $callbackBase.'/cancel',
            'emi_option' => '1',
            'emi_max_inst_option' => '9',
            'emi_selected_inst' => '9',
            'cus_name' => $companyName,
            'cus_email' => $customerEmail !== '' ? $customerEmail : 'test@test.com',
            'cus_add1' => $customerAddress !== '' ? $customerAddress : 'Dhaka',
            'cus_add2' => $customerAddress !== '' ? $customerAddress : 'Dhaka',
            'cus_city' => $customerCity !== '' ? $customerCity : 'Dhaka',
            'cus_state' => $customerState !== '' ? $customerState : 'Dhaka',
            'cus_postcode' => $customerPostcode !== '' ? $customerPostcode : '1000',
            'cus_country' => 'Bangladesh',
            'cus_phone' => $customerPhone !== '' ? $customerPhone : '01711111111',
            'cus_fax' => $customerPhone !== '' ? $customerPhone : '01711111111',
            'ship_name' => $companyName,
            'ship_add1' => 'Dhaka',
            'ship_add2' => 'Dhaka',
            'ship_city' => 'Dhaka',
            'ship_state' => 'Dhaka',
            'ship_postcode' => '1000',
            'ship_country' => 'Bangladesh',
            'value_a' => $dealId,
            'value_b' => (string) $deal->company_id,
            'value_c' => (string) $deal->listing_id,
            'value_d' => $frontendBaseUrl.'/dashboard/company/matches',
            'cart' => json_encode([
                ['product' => 'Deal '.$deal->listing_id, 'amount' => (string) $amount],
            ]),
            'product_amount' => (string) $amount,
            'vat' => '0',
            'discount_amount' => '0',
            'convenience_fee' => '0',
        ];

        $gatewayPageUrl = '';
        try {
            $response = Http::asForm()
                ->timeout(30)
                ->connectTimeout(30)
                ->withoutVerifying()
                ->post('https://sandbox.sslcommerz.com/gwprocess/v3/api.php', $postData);
            if ($response->successful()) {
                $sslcz = $response->json();
                $gatewayPageUrl = trim((string) ($sslcz['GatewayPageURL'] ?? ''));
            }
        } catch (Throwable $exception) {
            $gatewayPageUrl = '';
        }

        if ($gatewayPageUrl === '') {
            $gatewayPageUrl = $this->sslCommerzMockGatewayUrl($dealId, $tranId, (string) $amount);
        }

        if ($this->cropDealPaymentColumnsAvailable()) {
            DB::table('crop_deals')
                ->where('id', $dealId)
                ->update([
                    'payment_gateway' => $requestedGateway !== '' ? $requestedGateway : 'bkash',
                    'payment_status' => 'pending',
                    'updated_at' => now(),
                ]);
        }

        return $this->ok([
            'success' => true,
            'gatewayPageUrl' => $gatewayPageUrl,
            'tranId' => $tranId,
            'dealId' => $dealId,
        ]);
    }

    public function initiateStripePayment(Request $request): JsonResponse
    {
        $dealId = trim((string) $request->input('dealId'));
        $companyId = trim((string) $request->input('companyId'));
        $listingId = trim((string) $request->input('listingId'));

        if ($companyId === '' || ($dealId === '' && $listingId === '')) {
            return $this->fail('Company ID and either deal ID or listing ID are required.');
        }

        $company = DB::table('companies')
            ->where('id', $companyId)
            ->orWhere('user_id', $companyId)
            ->first();
        $candidateCompanyIds = array_values(array_filter(array_unique([
            $companyId,
            (string) ($company?->id ?? ''),
            (string) ($company?->user_id ?? ''),
        ])));
        if (count($candidateCompanyIds) === 0) {
            $candidateCompanyIds = [$companyId];
        }

        $deal = null;
        if ($dealId !== '') {
            $deal = DB::table('crop_deals')
                ->where('id', $dealId)
                ->whereIn('company_id', $candidateCompanyIds)
                ->first();
            if (! $deal) {
                $deal = DB::table('crop_deals')
                    ->where('id', $dealId)
                    ->first();
            }
        }

        if (! $deal && $dealId === '' && $listingId !== '') {
            $deal = DB::table('crop_deals')
                ->where('listing_id', $listingId)
                ->whereIn('company_id', $candidateCompanyIds)
                ->orderByDesc('created_at')
                ->first();
        }

        if (! $deal) {
            return $this->fail('Deal not found.', 404);
        }

        $dealId = (string) $deal->id;

        if ((string) $deal->status !== 'locked') {
            return $this->fail('Please lock the deal before starting payment.');
        }

        if (($deal->payment_status ?? 'pending') === 'paid') {
            return $this->ok([
                'success' => true,
                'alreadyPaid' => true,
                'message' => 'Payment already completed for this deal. You can place order now.',
            ]);
        }

        $amount = max(1, round(((float) $deal->agreed_price) * ((int) $deal->quantity_kg), 2));
        $amountMinor = (int) max(100, round($amount * 100));
        $currency = strtolower(trim((string) env('STRIPE_CURRENCY', 'usd')));
        $backendBase = rtrim((string) env('APP_URL', 'http://localhost:8000'), '/');
        $successUrl = $backendBase.'/api/v1/payments/stripe/success?'.http_build_query([
            'deal_id' => $dealId,
            'company_id' => $companyId,
            'listing_id' => (string) $deal->listing_id,
            'session_id' => '{CHECKOUT_SESSION_ID}',
        ]);
        $cancelUrl = $backendBase.'/api/v1/payments/stripe/cancel?'.http_build_query([
            'deal_id' => $dealId,
            'company_id' => $companyId,
            'listing_id' => (string) $deal->listing_id,
        ]);
        $stripeSecretKey = trim((string) env('STRIPE_SECRET_KEY', ''));
        $gatewayPageUrl = '';
        $sessionId = '';

        if ($stripeSecretKey !== '') {
            try {
                $stripeResponse = Http::asForm()
                    ->timeout(30)
                    ->connectTimeout(30)
                    ->withToken($stripeSecretKey)
                    ->post('https://api.stripe.com/v1/checkout/sessions', [
                        'mode' => 'payment',
                        'success_url' => $successUrl,
                        'cancel_url' => $cancelUrl,
                        'client_reference_id' => $dealId,
                        'metadata[deal_id]' => $dealId,
                        'metadata[company_id]' => $companyId,
                        'metadata[listing_id]' => (string) $deal->listing_id,
                        'line_items[0][quantity]' => 1,
                        'line_items[0][price_data][currency]' => $currency,
                        'line_items[0][price_data][unit_amount]' => $amountMinor,
                        'line_items[0][price_data][product_data][name]' => 'Crop Deal '.$deal->listing_id,
                        'line_items[0][price_data][product_data][description]' => 'Payment for deal '.$dealId,
                    ]);

                if ($stripeResponse->successful()) {
                    $payload = $stripeResponse->json();
                    $gatewayPageUrl = trim((string) ($payload['url'] ?? ''));
                    $sessionId = trim((string) ($payload['id'] ?? ''));
                }
            } catch (Throwable $exception) {
                $gatewayPageUrl = '';
                $sessionId = '';
            }
        }

        if ($gatewayPageUrl === '') {
            $gatewayPageUrl = $this->stripeMockGatewayUrl($dealId, $amountMinor, $currency);
        }

        if ($this->cropDealPaymentColumnsAvailable()) {
            DB::table('crop_deals')
                ->where('id', $dealId)
                ->update([
                    'payment_gateway' => 'stripe',
                    'payment_status' => 'pending',
                    'updated_at' => now(),
                ]);
        }

        return $this->ok([
            'success' => true,
            'gatewayPageUrl' => $gatewayPageUrl,
            'sessionId' => $sessionId !== '' ? $sessionId : null,
            'dealId' => $dealId,
        ]);
    }

    public function stripeSuccess(Request $request): HttpResponse
    {
        $dealId = trim((string) ($request->input('deal_id') ?: $request->input('value_a')));
        $sessionId = trim((string) $request->input('session_id'));
        $verified = false;
        $stripeSecretKey = trim((string) env('STRIPE_SECRET_KEY', ''));

        if ($sessionId !== '' && $stripeSecretKey !== '') {
            try {
                $sessionResponse = Http::withToken($stripeSecretKey)
                    ->timeout(30)
                    ->connectTimeout(30)
                    ->get("https://api.stripe.com/v1/checkout/sessions/{$sessionId}");
                if ($sessionResponse->successful()) {
                    $session = $sessionResponse->json();
                    $paymentStatus = strtolower((string) ($session['payment_status'] ?? ''));
                    $status = strtolower((string) ($session['status'] ?? ''));
                    $verified = $paymentStatus === 'paid' || $status === 'complete';
                }
            } catch (Throwable $exception) {
                $verified = false;
            }
        }

        // For local mock flow, allow explicit success without Stripe verification.
        if (! $verified && $sessionId === '') {
            $verified = true;
        }

        if ($dealId !== '' && $verified && $this->cropDealPaymentColumnsAvailable()) {
            $deal = DB::table('crop_deals')->where('id', $dealId)->first();
            DB::table('crop_deals')->where('id', $dealId)->update([
                'payment_status' => 'paid',
                'payment_gateway' => 'stripe',
                'updated_at' => now(),
            ]);

            if ($deal) {
                $companyUserId = DB::table('companies')->where('id', $deal->company_id)->value('user_id')
                    ?: DB::table('companies')->where('user_id', $deal->company_id)->value('user_id');
                $companyTargets = array_values(array_filter(array_unique([$deal->company_id, $companyUserId])));
                foreach ($companyTargets as $recipientId) {
                    $this->createNotification(
                        $recipientId,
                        'payment',
                        'Payment Confirmed',
                        "Stripe payment completed for deal {$dealId}. You can place order now.",
                        ['push', 'email'],
                    );
                }
            }
        }

        return $this->sslPaymentPopupResponse(
            'success',
            $dealId,
            $sessionId,
            'Payment successful. You can return to the Company Dashboard.',
        );
    }

    public function stripeFail(Request $request): HttpResponse
    {
        $dealId = trim((string) ($request->input('deal_id') ?: $request->input('value_a')));
        $sessionId = trim((string) $request->input('session_id'));

        if ($dealId !== '' && $this->cropDealPaymentColumnsAvailable()) {
            DB::table('crop_deals')->where('id', $dealId)->update([
                'payment_status' => 'failed',
                'payment_gateway' => 'stripe',
                'updated_at' => now(),
            ]);
        }

        return $this->sslPaymentPopupResponse(
            'failed',
            $dealId,
            $sessionId,
            'Payment failed. Please try Pay Now again.',
        );
    }

    public function stripeCancel(Request $request): HttpResponse
    {
        $dealId = trim((string) ($request->input('deal_id') ?: $request->input('value_a')));
        $sessionId = trim((string) $request->input('session_id'));

        if ($dealId !== '' && $this->cropDealPaymentColumnsAvailable()) {
            DB::table('crop_deals')->where('id', $dealId)->update([
                'payment_status' => 'pending',
                'payment_gateway' => 'stripe',
                'updated_at' => now(),
            ]);
        }

        return $this->sslPaymentPopupResponse(
            'cancelled',
            $dealId,
            $sessionId,
            'Payment was cancelled.',
        );
    }

    public function stripeMockGateway(Request $request): HttpResponse
    {
        $dealId = trim((string) $request->query('deal_id'));
        $amount = trim((string) $request->query('amount', '0'));
        $currency = trim((string) $request->query('currency', 'usd'));
        $base = rtrim((string) env('APP_URL', 'http://localhost:8000'), '/').'/api/v1/payments/stripe';
        $successUrl = $base.'/success?'.http_build_query([
            'deal_id' => $dealId,
            'status' => 'SUCCESS',
        ]);
        $failUrl = $base.'/fail?'.http_build_query([
            'deal_id' => $dealId,
            'status' => 'FAILED',
        ]);
        $cancelUrl = $base.'/cancel?'.http_build_query([
            'deal_id' => $dealId,
            'status' => 'CANCELLED',
        ]);

        $dealSafe = htmlspecialchars($dealId, ENT_QUOTES, 'UTF-8');
        $amountSafe = htmlspecialchars($amount, ENT_QUOTES, 'UTF-8');
        $currencySafe = htmlspecialchars(strtoupper($currency), ENT_QUOTES, 'UTF-8');
        $successSafe = htmlspecialchars($successUrl, ENT_QUOTES, 'UTF-8');
        $failSafe = htmlspecialchars($failUrl, ENT_QUOTES, 'UTF-8');
        $cancelSafe = htmlspecialchars($cancelUrl, ENT_QUOTES, 'UTF-8');

        $html = <<<HTML
<!doctype html>
<html>
<head><meta charset="utf-8"><title>Stripe Checkout Mock</title></head>
<body style="font-family: sans-serif; max-width: 640px; margin: 48px auto; padding: 24px;">
  <h2>Stripe Checkout (Local Mock)</h2>
  <p>Deal ID: <strong>{$dealSafe}</strong></p>
  <p>Amount: <strong>{$currencySafe} {$amountSafe}</strong></p>
  <p>Stripe sandbox could not be reached from local/dev. Use a test action below.</p>
  <div style="display:flex;gap:12px;flex-wrap:wrap;">
    <a href="{$successSafe}" style="padding:10px 16px;background:#16a34a;color:#fff;border-radius:8px;text-decoration:none;">Simulate Success</a>
    <a href="{$failSafe}" style="padding:10px 16px;background:#dc2626;color:#fff;border-radius:8px;text-decoration:none;">Simulate Fail</a>
    <a href="{$cancelSafe}" style="padding:10px 16px;background:#6b7280;color:#fff;border-radius:8px;text-decoration:none;">Simulate Cancel</a>
  </div>
</body>
</html>
HTML;

        return response($html, 200)->header('Content-Type', 'text/html; charset=UTF-8');
    }

    public function initiateOrderStripePayment(Request $request): JsonResponse
    {
        $orderId = trim((string) $request->input('orderId'));
        $farmerId = trim((string) $request->input('farmerId'));

        if ($orderId === '') {
            return $this->fail('Order ID is required.');
        }

        $order = DB::table('orders')->where('id', $orderId)->first();
        if (! $order) {
            return $this->fail('Order not found.', 404);
        }
        if ($farmerId !== '' && (string) $order->farmer_id !== $farmerId) {
            return $this->fail('Order does not belong to this farmer.', 403);
        }

        if (($order->payment_status ?? 'pending') === 'paid') {
            return $this->ok([
                'success' => true,
                'alreadyPaid' => true,
                'message' => 'Payment already completed for this order.',
            ]);
        }

        $amount = max(1, round((float) $order->total_amount, 2));
        $amountMinor = (int) max(100, round($amount * 100));
        $currency = strtolower(trim((string) env('STRIPE_CURRENCY', 'usd')));
        $backendBase = rtrim((string) env('APP_URL', 'http://localhost:8000'), '/');
        $successUrl = $backendBase.'/api/v1/payments/orders/stripe/success?'.http_build_query([
            'order_id' => $orderId,
            'farmer_id' => (string) $order->farmer_id,
            'session_id' => '{CHECKOUT_SESSION_ID}',
        ]);
        $cancelUrl = $backendBase.'/api/v1/payments/orders/stripe/cancel?'.http_build_query([
            'order_id' => $orderId,
            'farmer_id' => (string) $order->farmer_id,
        ]);

        $stripeSecretKey = trim((string) env('STRIPE_SECRET_KEY', ''));
        $gatewayPageUrl = '';
        $sessionId = '';

        if ($stripeSecretKey !== '') {
            try {
                $stripeResponse = Http::asForm()
                    ->timeout(30)
                    ->connectTimeout(30)
                    ->withToken($stripeSecretKey)
                    ->post('https://api.stripe.com/v1/checkout/sessions', [
                        'mode' => 'payment',
                        'success_url' => $successUrl,
                        'cancel_url' => $cancelUrl,
                        'client_reference_id' => $orderId,
                        'metadata[order_id]' => $orderId,
                        'metadata[farmer_id]' => (string) $order->farmer_id,
                        'line_items[0][quantity]' => 1,
                        'line_items[0][price_data][currency]' => $currency,
                        'line_items[0][price_data][unit_amount]' => $amountMinor,
                        'line_items[0][price_data][product_data][name]' => 'Order '.$orderId,
                        'line_items[0][price_data][product_data][description]' => 'Marketplace payment for order '.$orderId,
                    ]);

                if ($stripeResponse->successful()) {
                    $payload = $stripeResponse->json();
                    $gatewayPageUrl = trim((string) ($payload['url'] ?? ''));
                    $sessionId = trim((string) ($payload['id'] ?? ''));
                }
            } catch (Throwable) {
                $gatewayPageUrl = '';
                $sessionId = '';
            }
        }

        if ($gatewayPageUrl === '') {
            $gatewayPageUrl = $this->orderStripeMockGatewayUrl($orderId, $amountMinor, $currency, (string) $order->farmer_id);
        }

        DB::table('orders')
            ->where('id', $orderId)
            ->update([
                'payment_gateway' => 'stripe',
                'payment_status' => 'pending',
                'txn_ref' => $sessionId !== '' ? $sessionId : $order->txn_ref,
                'updated_at' => now(),
            ]);

        return $this->ok([
            'success' => true,
            'gatewayPageUrl' => $gatewayPageUrl,
            'sessionId' => $sessionId !== '' ? $sessionId : null,
            'orderId' => $orderId,
        ]);
    }

    public function orderStripeSuccess(Request $request): HttpResponse
    {
        $orderId = trim((string) $request->input('order_id'));
        $sessionId = trim((string) $request->input('session_id'));
        $verified = false;
        $stripeSecretKey = trim((string) env('STRIPE_SECRET_KEY', ''));

        if ($sessionId !== '' && $stripeSecretKey !== '') {
            try {
                $sessionResponse = Http::withToken($stripeSecretKey)
                    ->timeout(30)
                    ->connectTimeout(30)
                    ->get("https://api.stripe.com/v1/checkout/sessions/{$sessionId}");
                if ($sessionResponse->successful()) {
                    $session = $sessionResponse->json();
                    $paymentStatus = strtolower((string) ($session['payment_status'] ?? ''));
                    $status = strtolower((string) ($session['status'] ?? ''));
                    $verified = $paymentStatus === 'paid' || $status === 'complete';
                    if ($orderId === '') {
                        $orderId = trim((string) ($session['metadata']['order_id'] ?? $session['client_reference_id'] ?? ''));
                    }
                }
            } catch (Throwable) {
                $verified = false;
            }
        }

        if (! $verified && $sessionId === '') {
            $verified = true;
        }

        if ($orderId !== '' && $verified) {
            $order = DB::table('orders')->where('id', $orderId)->first();
            if (! $order) {
                return $this->sslPaymentPopupResponse(
                    'failed',
                    $orderId,
                    $sessionId,
                    'Payment could not be matched with an order. Please contact support.',
                );
            }

            $supportsSettlement = $this->orderSettlementColumnsAvailable();
            $shouldBeReadyForRelease = in_array((string) $order->status, ['delivered', 'completed'], true);
            $orderUpdatePayload = [
                'payment_status' => 'paid',
                'payment_gateway' => 'stripe',
                'txn_ref' => $sessionId !== '' ? $sessionId : DB::raw('txn_ref'),
                'updated_at' => now(),
            ];
            if ($supportsSettlement && (($order->settlement_status ?? 'held') !== 'released')) {
                $orderUpdatePayload['settlement_status'] = $shouldBeReadyForRelease ? 'ready_for_release' : 'held';
            }

            DB::table('orders')->where('id', $orderId)->update($orderUpdatePayload);

            $this->createNotification(
                (string) $order->farmer_id,
                'payment',
                'Order Payment Confirmed',
                "Stripe sandbox payment completed for order {$orderId}.",
                ['push', 'sms'],
            );
            $vendorUserId = DB::table('vendors')->where('id', $order->vendor_id)->value('user_id');
            if ($vendorUserId) {
                $this->createNotification(
                    (string) $vendorUserId,
                    'payment',
                    'Customer Payment Received',
                    "Order {$orderId} payment is confirmed via Stripe sandbox.",
                    ['push', 'sms'],
                );
            }
        }

        return $this->sslPaymentPopupResponse(
            'success',
            $orderId,
            $sessionId,
            'Payment successful. You can return to the Farmer Dashboard.',
        );
    }

    public function orderStripeFail(Request $request): HttpResponse
    {
        $orderId = trim((string) $request->input('order_id'));
        $sessionId = trim((string) $request->input('session_id'));

        if ($orderId !== '') {
            DB::table('orders')->where('id', $orderId)->update([
                'payment_status' => 'failed',
                'payment_gateway' => 'stripe',
                'updated_at' => now(),
            ]);
        }

        return $this->sslPaymentPopupResponse(
            'failed',
            $orderId,
            $sessionId,
            'Payment failed. Please try Stripe payment again.',
        );
    }

    public function orderStripeCancel(Request $request): HttpResponse
    {
        $orderId = trim((string) $request->input('order_id'));
        $sessionId = trim((string) $request->input('session_id'));

        if ($orderId !== '') {
            DB::table('orders')->where('id', $orderId)->update([
                'payment_status' => 'pending',
                'payment_gateway' => 'stripe',
                'updated_at' => now(),
            ]);
        }

        return $this->sslPaymentPopupResponse(
            'cancelled',
            $orderId,
            $sessionId,
            'Payment was cancelled.',
        );
    }

    public function orderStripeMockGateway(Request $request): HttpResponse
    {
        $orderId = trim((string) $request->query('order_id'));
        $farmerId = trim((string) $request->query('farmer_id'));
        $amount = trim((string) $request->query('amount', '0'));
        $currency = trim((string) $request->query('currency', 'usd'));
        $base = rtrim((string) env('APP_URL', 'http://localhost:8000'), '/').'/api/v1/payments/orders/stripe';
        $successUrl = $base.'/success?'.http_build_query([
            'order_id' => $orderId,
            'farmer_id' => $farmerId,
            'status' => 'SUCCESS',
        ]);
        $failUrl = $base.'/fail?'.http_build_query([
            'order_id' => $orderId,
            'farmer_id' => $farmerId,
            'status' => 'FAILED',
        ]);
        $cancelUrl = $base.'/cancel?'.http_build_query([
            'order_id' => $orderId,
            'farmer_id' => $farmerId,
            'status' => 'CANCELLED',
        ]);

        $orderSafe = htmlspecialchars($orderId, ENT_QUOTES, 'UTF-8');
        $amountSafe = htmlspecialchars($amount, ENT_QUOTES, 'UTF-8');
        $currencySafe = htmlspecialchars(strtoupper($currency), ENT_QUOTES, 'UTF-8');
        $successSafe = htmlspecialchars($successUrl, ENT_QUOTES, 'UTF-8');
        $failSafe = htmlspecialchars($failUrl, ENT_QUOTES, 'UTF-8');
        $cancelSafe = htmlspecialchars($cancelUrl, ENT_QUOTES, 'UTF-8');

        $html = <<<HTML
<!doctype html>
<html>
<head><meta charset="utf-8"><title>Stripe Checkout Mock (Order)</title></head>
<body style="font-family: sans-serif; max-width: 640px; margin: 48px auto; padding: 24px;">
  <h2>Stripe Checkout (Order Mock)</h2>
  <p>Order ID: <strong>{$orderSafe}</strong></p>
  <p>Amount: <strong>{$currencySafe} {$amountSafe}</strong></p>
  <p>Stripe sandbox could not be reached from local/dev. Use a test action below.</p>
  <div style="display:flex;gap:12px;flex-wrap:wrap;">
    <a href="{$successSafe}" style="padding:10px 16px;background:#16a34a;color:#fff;border-radius:8px;text-decoration:none;">Simulate Success</a>
    <a href="{$failSafe}" style="padding:10px 16px;background:#dc2626;color:#fff;border-radius:8px;text-decoration:none;">Simulate Fail</a>
    <a href="{$cancelSafe}" style="padding:10px 16px;background:#6b7280;color:#fff;border-radius:8px;text-decoration:none;">Simulate Cancel</a>
  </div>
</body>
</html>
HTML;

        return response($html, 200)->header('Content-Type', 'text/html; charset=UTF-8');
    }

    public function sslCommerzSuccess(Request $request): HttpResponse
    {
        $dealId = trim((string) ($request->input('value_a') ?: $request->input('deal_id')));
        $tranId = trim((string) $request->input('tran_id'));
        $status = strtoupper(trim((string) $request->input('status')));
        $isSuccess = $status === '' || in_array($status, ['VALID', 'VALIDATED', 'SUCCESS'], true);

        if ($dealId !== '' && $isSuccess) {
            $deal = DB::table('crop_deals')->where('id', $dealId)->first();
            if ($deal && $this->cropDealPaymentColumnsAvailable()) {
                DB::table('crop_deals')->where('id', $dealId)->update([
                    'payment_status' => 'paid',
                    'updated_at' => now(),
                ]);

                $companyUserId = DB::table('companies')->where('id', $deal->company_id)->value('user_id')
                    ?: DB::table('companies')->where('user_id', $deal->company_id)->value('user_id');
                $companyTargets = array_values(array_filter(array_unique([$deal->company_id, $companyUserId])));
                foreach ($companyTargets as $recipientId) {
                    $this->createNotification(
                        $recipientId,
                        'payment',
                        'Payment Confirmed',
                        "Sandbox payment completed for deal {$dealId}. You can place order now.",
                        ['push', 'email'],
                    );
                }
            }
        }

        return $this->sslPaymentPopupResponse(
            'success',
            $dealId,
            $tranId,
            'Payment successful. You can return to the Company Dashboard.',
        );
    }

    public function sslCommerzFail(Request $request): HttpResponse
    {
        $dealId = trim((string) ($request->input('value_a') ?: $request->input('deal_id')));
        $tranId = trim((string) $request->input('tran_id'));

        if ($dealId !== '' && $this->cropDealPaymentColumnsAvailable()) {
            DB::table('crop_deals')->where('id', $dealId)->update([
                'payment_status' => 'failed',
                'updated_at' => now(),
            ]);
        }

        return $this->sslPaymentPopupResponse(
            'failed',
            $dealId,
            $tranId,
            'Payment failed. Please try Pay Now again.',
        );
    }

    public function sslCommerzCancel(Request $request): HttpResponse
    {
        $dealId = trim((string) ($request->input('value_a') ?: $request->input('deal_id')));
        $tranId = trim((string) $request->input('tran_id'));

        if ($dealId !== '' && $this->cropDealPaymentColumnsAvailable()) {
            DB::table('crop_deals')->where('id', $dealId)->update([
                'payment_status' => 'pending',
                'updated_at' => now(),
            ]);
        }

        return $this->sslPaymentPopupResponse(
            'cancelled',
            $dealId,
            $tranId,
            'Payment was cancelled.',
        );
    }

    public function sslCommerzMockGateway(Request $request): HttpResponse
    {
        $dealId = trim((string) $request->query('deal_id'));
        $tranId = trim((string) $request->query('tran_id'));
        $amount = trim((string) $request->query('amount', '0'));
        $base = rtrim((string) env('APP_URL', 'http://localhost:8000'), '/').'/api/v1/payments/sslcommerz';
        $successUrl = $base.'/success?'.http_build_query([
            'value_a' => $dealId,
            'tran_id' => $tranId,
            'status' => 'VALID',
        ]);
        $failUrl = $base.'/fail?'.http_build_query([
            'value_a' => $dealId,
            'tran_id' => $tranId,
            'status' => 'FAILED',
        ]);
        $cancelUrl = $base.'/cancel?'.http_build_query([
            'value_a' => $dealId,
            'tran_id' => $tranId,
            'status' => 'CANCELLED',
        ]);

        $dealSafe = htmlspecialchars($dealId, ENT_QUOTES, 'UTF-8');
        $tranSafe = htmlspecialchars($tranId, ENT_QUOTES, 'UTF-8');
        $amountSafe = htmlspecialchars($amount, ENT_QUOTES, 'UTF-8');
        $successSafe = htmlspecialchars($successUrl, ENT_QUOTES, 'UTF-8');
        $failSafe = htmlspecialchars($failUrl, ENT_QUOTES, 'UTF-8');
        $cancelSafe = htmlspecialchars($cancelUrl, ENT_QUOTES, 'UTF-8');

        $html = <<<HTML
<!doctype html>
<html>
<head><meta charset="utf-8"><title>SSLCommerz Sandbox Mock</title></head>
<body style="font-family: sans-serif; max-width: 640px; margin: 48px auto; padding: 24px;">
  <h2>SSLCommerz Sandbox (Local Mock)</h2>
  <p>Deal ID: <strong>{$dealSafe}</strong></p>
  <p>Transaction ID: <strong>{$tranSafe}</strong></p>
  <p>Amount: <strong>BDT {$amountSafe}</strong></p>
  <p>External sandbox could not be reached from local/dev. Use a test action below.</p>
  <div style="display:flex;gap:12px;flex-wrap:wrap;">
    <a href="{$successSafe}" style="padding:10px 16px;background:#16a34a;color:#fff;border-radius:8px;text-decoration:none;">Simulate Success</a>
    <a href="{$failSafe}" style="padding:10px 16px;background:#dc2626;color:#fff;border-radius:8px;text-decoration:none;">Simulate Fail</a>
    <a href="{$cancelSafe}" style="padding:10px 16px;background:#6b7280;color:#fff;border-radius:8px;text-decoration:none;">Simulate Cancel</a>
  </div>
</body>
</html>
HTML;

        return response($html, 200)->header('Content-Type', 'text/html; charset=UTF-8');
    }

    private function sslPaymentPopupResponse(string $status, string $dealId, string $tranId, string $message): HttpResponse
    {
        $payload = json_encode([
            'type' => 'sslcommerz-payment-status',
            'status' => $status,
            'dealId' => $dealId,
            'tranId' => $tranId,
            'message' => $message,
        ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

        $safeMessage = htmlspecialchars($message, ENT_QUOTES, 'UTF-8');
        $script = <<<HTML
<!doctype html>
<html>
<head><meta charset="utf-8"><title>Payment Status</title></head>
<body style="font-family: sans-serif; padding: 24px;">
<h3>{$safeMessage}</h3>
<p>You can close this tab now.</p>
<script>
(function () {
  var payload = {$payload};
  try {
    if (window.opener && !window.opener.closed) {
      window.opener.postMessage(payload, '*');
    }
  } catch (e) {}
  setTimeout(function () { window.close(); }, 1200);
})();
</script>
</body>
</html>
HTML;

        return response($script, 200)->header('Content-Type', 'text/html; charset=UTF-8');
    }

    private function sslCommerzMockGatewayUrl(string $dealId, string $tranId, string $amount): string
    {
        $base = rtrim((string) env('APP_URL', 'http://localhost:8000'), '/').'/api/v1/payments/sslcommerz/mock-gateway';

        return $base.'?'.http_build_query([
            'deal_id' => $dealId,
            'tran_id' => $tranId,
            'amount' => $amount,
        ]);
    }

    private function stripeMockGatewayUrl(string $dealId, int $amountMinor, string $currency): string
    {
        $base = rtrim((string) env('APP_URL', 'http://localhost:8000'), '/').'/api/v1/payments/stripe/mock-gateway';

        return $base.'?'.http_build_query([
            'deal_id' => $dealId,
            'amount' => $amountMinor,
            'currency' => $currency,
        ]);
    }

    private function orderStripeMockGatewayUrl(string $orderId, int $amountMinor, string $currency, string $farmerId): string
    {
        $base = rtrim((string) env('APP_URL', 'http://localhost:8000'), '/').'/api/v1/payments/orders/stripe/mock-gateway';

        return $base.'?'.http_build_query([
            'order_id' => $orderId,
            'farmer_id' => $farmerId,
            'amount' => $amountMinor,
            'currency' => $currency,
        ]);
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
        $payload = [
            'email_notifications' => $request->boolean('emailNotifications'),
            'push_notifications' => $request->boolean('pushNotifications'),
            'outbreak_warnings' => $request->boolean('outbreakWarnings'),
            'urgent_advisory' => $request->boolean('urgentAdvisory'),
            'new_case_alert' => $request->boolean('newCaseAlert'),
            'updated_at' => now(),
        ];

        if (DB::table('user_settings')->where('user_id', $userId)->exists()) {
            DB::table('user_settings')->where('user_id', $userId)->update($payload);
        } else {
            DB::table('user_settings')->insert([
                'user_id' => $userId,
                ...$payload,
                'created_at' => now(),
            ]);
        }

        return $this->ok(['success' => true]);
    }

    public function changePassword(Request $request, string $userId): JsonResponse
    {
        $user = DB::table('users')->where('public_id', $userId)->first();

        if (! $user) {
            return $this->fail('User not found.', 404);
        }

        $currentPassword = (string) $request->input('currentPassword');
        $nextPassword = (string) $request->input('nextPassword');

        if ($nextPassword === '') {
            return $this->fail('New password is required.');
        }

        if (mb_strlen($nextPassword) < 6) {
            return $this->fail('New password must be at least 6 characters long.');
        }

        if (! Hash::check($currentPassword, $user->password)) {
            return $this->fail('Current password is incorrect.', 401);
        }

        DB::table('users')
            ->where('public_id', $userId)
            ->update([
                'password' => Hash::make($nextPassword),
                'updated_at' => now(),
            ]);

        return $this->ok(['success' => true]);
    }

    public function deleteUserAccount(string $userId): JsonResponse
    {
        $user = DB::table('users')->where('public_id', $userId)->first();

        if (! $user) {
            return $this->fail('User not found.', 404);
        }

        DB::transaction(function () use ($user): void {
            $roleRecordId = match ($user->role) {
                'farmer' => DB::table('farmers')->where('user_id', $user->public_id)->value('id'),
                'officer' => DB::table('officers')->where('user_id', $user->public_id)->value('id'),
                'vendor' => DB::table('vendors')->where('user_id', $user->public_id)->value('id'),
                'company' => DB::table('companies')->where('user_id', $user->public_id)->value('id'),
                default => null,
            };

            DB::table('notifications')->where('user_id', $user->public_id)->delete();
            DB::table('user_settings')->where('user_id', $user->public_id)->delete();
            DB::table('auth_otps')
                ->where('user_id', $user->public_id)
                ->orWhere('email', $this->normalizedEmail($user->email))
                ->delete();

            DB::table('cooperatives')
                ->where('leader_id', $user->public_id)
                ->update(['leader_id' => null, 'updated_at' => now()]);

            DB::table('tenants')
                ->where('admin_user_id', $user->public_id)
                ->update(['admin_user_id' => null, 'updated_at' => now()]);

            match ($user->role) {
                'farmer' => DB::table('farmers')->where('id', $roleRecordId)->delete(),
                'officer' => DB::table('officers')->where('id', $roleRecordId)->delete(),
                'vendor' => DB::table('vendors')->where('id', $roleRecordId)->delete(),
                'company' => DB::table('companies')->where('id', $roleRecordId)->delete(),
                default => null,
            };

            DB::table('sessions')->where('user_id', $user->id)->delete();
            DB::table('users')->where('public_id', $user->public_id)->delete();
        });

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
        $supportsSettlement = $this->orderSettlementColumnsAvailable();
        $ordersQuery = DB::table('orders');
        $releasedAmount = $supportsSettlement
            ? (float) DB::table('orders')->where('settlement_status', 'released')->sum('total_amount')
            : 0.0;
        $heldAmount = $supportsSettlement
            ? (float) DB::table('orders')->whereIn('settlement_status', ['held', 'ready_for_release'])->sum('total_amount')
            : 0.0;

        return $this->ok([
            'totalFarmers' => DB::table('farmers')->count(),
            'totalOfficers' => DB::table('officers')->count(),
            'totalVendors' => DB::table('vendors')->count(),
            'totalAdvisories' => DB::table('advisory_cases')->count(),
            'activeAdvisories' => DB::table('advisory_cases')->whereNotIn('status', ['closed', 'responded'])->count(),
            'totalOrders' => $ordersQuery->count(),
            'pendingSettlements' => $supportsSettlement ? DB::table('orders')->where('settlement_status', 'ready_for_release')->count() : 0,
            'heldSettlementAmount' => $heldAmount,
            'releasedSettlementAmount' => $releasedAmount,
            'mrr' => (float) DB::table('tenants')->sum('mrr'),
            'uptime' => 99.98,
            'advisoryDeliveryRate' => 96.4,
        ]);
    }

    public function updateFarmerAdminState(Request $request, string $farmerId): JsonResponse
    {
        $farmer = DB::table('farmers')->where('id', $farmerId)->first();
        if (! $farmer) {
            return $this->fail('Farmer not found.', 404);
        }

        $payload = ['updated_at' => now()];
        $hasChange = false;

        if ($request->exists('verified')) {
            $payload['verified'] = $request->boolean('verified');
            $hasChange = true;
        }

        if ($request->exists('blocked')) {
            $payload['blocked'] = $request->boolean('blocked');
            $hasChange = true;
        }

        if (! $hasChange) {
            return $this->fail('No farmer moderation field provided.');
        }

        DB::table('farmers')->where('id', $farmerId)->update($payload);

        $verifiedLabel = array_key_exists('verified', $payload) ? ((bool) $payload['verified'] ? 'verified' : 'unverified') : null;
        $blockedLabel = array_key_exists('blocked', $payload) ? ((bool) $payload['blocked'] ? 'blocked' : 'unblocked') : null;
        $details = collect([$verifiedLabel, $blockedLabel])->filter()->implode(', ');
        $this->createAuditLog('farmer', 'moderate', 'Super Admin', trim("Updated farmer {$farmerId} state: {$details}."));

        return $this->ok(['success' => true]);
    }

    public function updateOfficerAdminState(Request $request, string $officerId): JsonResponse
    {
        $officer = DB::table('officers')
            ->where('id', $officerId)
            ->orWhere('user_id', $officerId)
            ->orWhere('officer_id', $officerId)
            ->first();
        if (! $officer) {
            return $this->fail('Officer not found.', 404);
        }

        $payload = ['updated_at' => now()];
        $hasChange = false;

        if ($request->exists('active')) {
            $isActive = $request->boolean('active');
            $payload['active'] = $isActive;
            $payload['availability_status'] = $isActive ? 'available' : 'offline';
            $hasChange = true;
        }

        if ($request->exists('assignedRegion') || $request->exists('regionDistricts')) {
            $regionDistricts = $request->exists('regionDistricts')
                ? collect($request->input('regionDistricts', []))
                : collect(explode(',', (string) $request->input('assignedRegion', '')));
            $regionDistricts = $regionDistricts
                ->map(fn ($item) => trim((string) $item))
                ->filter(fn ($item) => $item !== '')
                ->values();

            $payload['region_districts'] = json_encode($regionDistricts->all());
            $hasChange = true;

            $primaryDistrict = $regionDistricts->first();
            if ($primaryDistrict) {
                DB::table('users')
                    ->where('public_id', $officer->user_id)
                    ->update(['district' => $primaryDistrict, 'updated_at' => now()]);
            }
        }

        if (! $hasChange) {
            return $this->fail('No officer moderation field provided.');
        }

        DB::table('officers')->where('id', $officer->id)->update($payload);

        $activeLabel = array_key_exists('active', $payload) ? ((bool) $payload['active'] ? 'activated' : 'disabled') : null;
        $regionLabel = array_key_exists('region_districts', $payload) ? 'region updated' : null;
        $details = collect([$activeLabel, $regionLabel])->filter()->implode(', ');
        $this->createAuditLog('officer', 'update', 'Super Admin', trim("Updated officer {$officer->id} state: {$details}."));

        return $this->ok(['success' => true]);
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

    private function createAuditLog(string $entity, string $action, string $actor, string $details): void
    {
        DB::table('audit_logs')->insert([
            'id' => 'audit_'.Str::random(12),
            'entity' => $entity,
            'action' => $action,
            'actor' => $actor,
            'details' => $details,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function notificationSettingsForUser(string $userId): object
    {
        return DB::table('user_settings')->where('user_id', $userId)->first() ?: (object) [
            'email_notifications' => true,
            'push_notifications' => true,
            'outbreak_warnings' => true,
            'urgent_advisory' => true,
            'new_case_alert' => true,
        ];
    }

    private function notifyOfficersForAdvisory(object $farmer, string $caseId, string $cropType, string $priority): void
    {
        $officers = DB::table('officers')
            ->join('users', 'users.public_id', '=', 'officers.user_id')
            ->select('users.public_id as user_id', 'users.name', 'users.district as user_district', 'officers.region_districts')
            ->where('users.role', 'officer')
            ->get();

        foreach ($officers as $officer) {
            $settings = $this->notificationSettingsForUser($officer->user_id);
            $shouldNotify = $priority === 'urgent'
                ? (bool) $settings->urgent_advisory
                : (bool) $settings->new_case_alert;

            if (! $shouldNotify) {
                continue;
            }

            $priorityLabel = $priority === 'urgent' ? 'Urgent' : 'Normal';
            $location = implode(', ', array_values(array_filter([$farmer->upazila ?? null, $farmer->district ?? null, $farmer->division ?? null])));

            $this->createNotification(
                $officer->user_id,
                'advisory',
                $priority === 'urgent' ? 'Urgent New Case Alert' : 'New Case Alert',
                trim("{$priorityLabel} {$cropType} advisory {$caseId} submitted from {$location}."),
                ['push', 'email'],
            );
        }
    }
}
