<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class BulkDemoDataSeeder extends Seeder
{
    private const COUNT = 100;
    private const AUTO_ID_OFFSET = 900000;

    private array $divisions = [
        ['division' => 'Dhaka', 'district' => 'Dhaka', 'upazila' => 'Savar'],
        ['division' => 'Chattogram', 'district' => 'Cumilla', 'upazila' => 'Daudkandi'],
        ['division' => 'Rajshahi', 'district' => 'Rajshahi', 'upazila' => 'Godagari'],
        ['division' => 'Khulna', 'district' => 'Jashore', 'upazila' => 'Monirampur'],
        ['division' => 'Barishal', 'district' => 'Barishal', 'upazila' => 'Babuganj'],
        ['division' => 'Sylhet', 'district' => 'Sylhet', 'upazila' => 'Beanibazar'],
        ['division' => 'Rangpur', 'district' => 'Rangpur', 'upazila' => 'Mithapukur'],
        ['division' => 'Mymensingh', 'district' => 'Mymensingh', 'upazila' => 'Trishal'],
    ];

    private array $crops = ['Rice', 'Wheat', 'Potato', 'Jute', 'Maize', 'Mustard', 'Onion', 'Mango', 'Tomato', 'Lentil'];

    public function run(): void
    {
        $now = now();

        $this->seedTenants($now);
        $this->seedUsers($now);
        $this->seedCooperatives($now);
        $this->seedRoleProfiles($now);
        $this->seedAdvisory($now);
        $this->seedMarketplace($now);
        $this->seedOrders($now);
        $this->seedCrops($now);
        $this->seedBilling($now);
        $this->seedSystemTables($now);
    }

    private function seedTenants($now): void
    {
        $rows = [];

        for ($i = 1; $i <= self::COUNT; $i++) {
            $rows[] = [
                'id' => $this->tenantId($i),
                'name' => "Demo Agro Tenant {$i}",
                'subdomain' => "demo-agro-{$i}",
                'plan_tier' => $this->pick(['basic', 'standard', 'professional'], $i),
                'admin_user_id' => $this->userId($i),
                'status' => $this->pick(['active', 'trial', 'active', 'suspended'], $i),
                'farmer_count' => 1,
                'mrr' => $this->money(1500 + ($i * 45)),
                'configuration' => json_encode(['language' => 'en', 'seed_batch' => 'bulk-demo']),
                'created_at' => $now->copy()->subDays($i),
                'updated_at' => $now,
            ];
        }

        DB::table('tenants')->upsert($rows, ['id']);
    }

    private function seedUsers($now): void
    {
        $rows = [];

        for ($i = 1; $i <= self::COUNT; $i++) {
            $location = $this->location($i);
            $role = $this->pick(['farmer', 'officer', 'vendor', 'company', 'admin'], $i);
            $publicId = $this->userId($i);

            $rows[] = [
                'id' => self::AUTO_ID_OFFSET + $i,
                'public_id' => $publicId,
                'tenant_id' => $this->tenantId($i),
                'role' => $role,
                'name' => "Demo {$role} {$i}",
                'name_bn' => null,
                'email' => "demo.user{$i}@agrosync.test",
                'email_verified_at' => $now,
                'password' => Hash::make('password123'),
                'remember_token' => Str::random(10),
                'phone' => $this->phone($i),
                'avatar' => "https://i.pravatar.cc/150?u=agrosync-demo-{$i}",
                'division' => $location['division'],
                'district' => $location['district'],
                'upazila' => $location['upazila'],
                'designation' => ucfirst($role),
                'access_label' => "Demo {$role} account",
                'created_at' => $now->copy()->subDays($i),
                'updated_at' => $now,
            ];
        }

        DB::table('users')->upsert($rows, ['id']);
    }

    private function seedCooperatives($now): void
    {
        $rows = [];

        for ($i = 1; $i <= self::COUNT; $i++) {
            $rows[] = [
                'id' => $this->coopId($i),
                'tenant_id' => $this->tenantId($i),
                'name' => "Demo Farmers Cooperative {$i}",
                'leader_id' => $this->userId($i),
                'created_at' => $now->copy()->subDays($i),
                'updated_at' => $now,
            ];
        }

        DB::table('cooperatives')->upsert($rows, ['id']);
    }

    private function seedRoleProfiles($now): void
    {
        $farmers = [];
        $officers = [];
        $vendors = [];
        $companies = [];
        $settings = [];

        for ($i = 1; $i <= self::COUNT; $i++) {
            $location = $this->location($i);
            $userId = $this->userId($i);

            $farmers[] = [
                'id' => $this->farmerId($i),
                'user_id' => $userId,
                'tenant_id' => $this->tenantId($i),
                'fid' => sprintf('AGS-DEMO-%06d', $i),
                'nid_hash' => "demo_nid_hash_{$i}",
                'name_bn' => null,
                'name_en' => "Demo Farmer {$i}",
                'gender' => $this->pick(['male', 'female', 'other'], $i),
                'dob' => $now->copy()->subYears(25 + ($i % 30))->toDateString(),
                'division' => $location['division'],
                'district' => $location['district'],
                'upazila' => $location['upazila'],
                'village' => "Demo Village {$i}",
                'land_size' => $this->money(1 + ($i % 12) + 0.5),
                'crop_types' => json_encode([$this->crop($i), $this->crop($i + 1)]),
                'phone' => $this->phone($i),
                'emergency_contact' => $this->phone($i + 200),
                'bkash_account' => $this->phone($i),
                'cooperative_id' => $this->coopId($i),
                'verified' => $i % 4 !== 0,
                'blocked' => false,
                'created_at' => $now->copy()->subDays($i),
                'updated_at' => $now,
            ];

            $officers[] = [
                'id' => $this->officerId($i),
                'user_id' => $userId,
                'tenant_id' => $this->tenantId($i),
                'officer_id' => sprintf('OFF-DEMO-%03d', $i),
                'specialty_tags' => json_encode([$this->crop($i), 'Pest Control', 'Soil Health']),
                'region_districts' => json_encode([$location['district'], $this->location($i + 1)['district']]),
                'max_active_cases' => 10 + ($i % 20),
                'availability_status' => $this->pick(['available', 'busy', 'offline'], $i),
                'active' => $i % 10 !== 0,
                'created_at' => $now->copy()->subDays($i),
                'updated_at' => $now,
            ];

            $vendors[] = [
                'id' => $this->vendorId($i),
                'user_id' => $userId,
                'tenant_id' => $this->tenantId($i),
                'vendor_id' => sprintf('VND-DEMO-%03d', $i),
                'company_name' => "Demo Agro Supplies {$i}",
                'delivery_districts' => json_encode([$location['district'], 'Dhaka']),
                'status' => $this->pick(['approved', 'approved', 'pending'], $i),
                'created_at' => $now->copy()->subDays($i),
                'updated_at' => $now,
            ];

            $companies[] = [
                'id' => $this->companyId($i),
                'user_id' => $userId,
                'tenant_id' => $this->tenantId($i),
                'company_id' => sprintf('CMP-DEMO-%03d', $i),
                'company_name' => "Demo Crop Buyer {$i}",
                'registration_no' => sprintf('REG-DEMO-%06d', $i),
                'crop_interests' => json_encode([$this->crop($i), $this->crop($i + 2)]),
                'created_at' => $now->copy()->subDays($i),
                'updated_at' => $now,
            ];

            $settings[] = [
                'user_id' => $userId,
                'email_notifications' => true,
                'push_notifications' => $i % 3 !== 0,
                'outbreak_warnings' => true,
                'urgent_advisory' => true,
                'new_case_alert' => $i % 2 === 0,
                'created_at' => $now->copy()->subDays($i),
                'updated_at' => $now,
            ];
        }

        DB::table('farmers')->upsert($farmers, ['id']);
        DB::table('officers')->upsert($officers, ['id']);
        DB::table('vendors')->upsert($vendors, ['id']);
        DB::table('companies')->upsert($companies, ['id']);
        DB::table('user_settings')->upsert($settings, ['user_id']);
    }

    private function seedAdvisory($now): void
    {
        $cases = [];
        $messages = [];
        $escalations = [];

        for ($i = 1; $i <= self::COUNT; $i++) {
            $location = $this->location($i);
            $caseId = $this->caseId($i);
            $status = $this->pick(['pending', 'assigned', 'ai_analyzed', 'responded', 'resolved', 'closed'], $i);

            $cases[] = [
                'id' => $caseId,
                'tenant_id' => $this->tenantId($i),
                'farmer_id' => $this->farmerId($i),
                'farmer_division' => $location['division'],
                'farmer_district' => $location['district'],
                'farmer_upazila' => $location['upazila'],
                'officer_id' => $this->officerId($i),
                'crop_type' => $this->crop($i),
                'description' => "Demo advisory case {$i}: {$this->crop($i)} field needs diagnosis.",
                'photos' => json_encode(["https://picsum.photos/seed/advisory-{$i}/640/420"]),
                'status' => $status,
                'priority' => $this->pick(['low', 'normal', 'high', 'urgent'], $i),
                'ai_diagnosis' => "Likely {$this->pick(['leaf blight', 'pest stress', 'nutrient deficiency', 'fungal infection'], $i)}",
                'ai_confidence' => 60 + ($i % 35),
                'officer_response' => in_array($status, ['responded', 'resolved', 'closed'], true) ? "Apply recommended treatment for demo case {$i}." : null,
                'internal_note' => "Seeded advisory note {$i}",
                'overridden_diagnosis' => $i % 9 === 0 ? 'Manual review recommended' : null,
                'responded_at' => in_array($status, ['responded', 'resolved', 'closed'], true) ? $now->copy()->subDays($i % 20) : null,
                'resolved_at' => in_array($status, ['resolved', 'closed'], true) ? $now->copy()->subDays($i % 10) : null,
                'created_at' => $now->copy()->subDays($i),
                'updated_at' => $now,
            ];

            $messages[] = [
                'id' => self::AUTO_ID_OFFSET + $i,
                'case_id' => $caseId,
                'sender_id' => $i % 2 === 0 ? $this->officerId($i) : $this->farmerId($i),
                'sender_role' => $i % 2 === 0 ? 'officer' : 'farmer',
                'message' => "Demo advisory conversation message {$i}.",
                'attachments' => json_encode([]),
                'created_at' => $now->copy()->subDays($i),
                'updated_at' => $now,
            ];

            $escalations[] = [
                'id' => self::AUTO_ID_OFFSET + $i,
                'case_id' => $caseId,
                'from_officer' => $this->officerId($i),
                'to_officer' => $this->officerId(($i % self::COUNT) + 1),
                'reason' => "Demo escalation reason {$i}",
                'escalated_at' => $now->copy()->subDays($i % 15),
                'created_at' => $now->copy()->subDays($i),
                'updated_at' => $now,
            ];
        }

        DB::table('advisory_cases')->upsert($cases, ['id']);
        DB::table('advisory_messages')->upsert($messages, ['id']);
        DB::table('advisory_escalations')->upsert($escalations, ['id']);
    }

    private function seedMarketplace($now): void
    {
        $products = [];
        $carts = [];
        $cartItems = [];

        for ($i = 1; $i <= self::COUNT; $i++) {
            $products[] = [
                'id' => $this->productId($i),
                'tenant_id' => $this->tenantId($i),
                'vendor_id' => $this->vendorId($i),
                'name_en' => "Demo {$this->pick(['Seed', 'Fertilizer', 'Pesticide', 'Tool'], $i)} Product {$i}",
                'name_bn' => null,
                'category' => $this->pick(['Seed', 'Fertilizer', 'Pesticide', 'Equipment'], $i),
                'price' => $this->money(250 + ($i * 17)),
                'unit' => $this->pick(['kg', 'bag', 'bottle', 'piece'], $i),
                'stock_qty' => 20 + ($i * 3),
                'description' => "Seeded marketplace product {$i}.",
                'manufacturer' => "Demo Manufacturer {$i}",
                'photos' => json_encode(["https://picsum.photos/seed/product-{$i}/640/420"]),
                'delivery_districts' => json_encode([$this->location($i)['district'], 'Dhaka']),
                'estimated_delivery_days' => 1 + ($i % 7),
                'rating' => $this->money(3 + (($i % 20) / 10)),
                'review_count' => 5 + ($i * 2),
                'is_recommended' => $i % 4 === 0,
                'created_at' => $now->copy()->subDays($i),
                'updated_at' => $now,
            ];

            $carts[] = [
                'id' => $this->cartId($i),
                'farmer_id' => $this->farmerId($i),
                'created_at' => $now->copy()->subDays($i),
                'updated_at' => $now,
            ];

            $cartItems[] = [
                'id' => self::AUTO_ID_OFFSET + $i,
                'cart_id' => $this->cartId($i),
                'product_id' => $this->productId($i),
                'quantity' => 1 + ($i % 5),
                'created_at' => $now->copy()->subDays($i),
                'updated_at' => $now,
            ];
        }

        DB::table('products')->upsert($products, ['id']);
        DB::table('carts')->upsert($carts, ['id']);
        DB::table('cart_items')->upsert($cartItems, ['id']);
    }

    private function seedOrders($now): void
    {
        $orders = [];
        $items = [];
        $history = [];

        for ($i = 1; $i <= self::COUNT; $i++) {
            $quantity = 1 + ($i % 4);
            $price = 250 + ($i * 17);
            $status = $this->pick(['pending', 'confirmed', 'dispatched', 'delivered', 'cancelled'], $i);

            $orders[] = [
                'id' => $this->orderId($i),
                'tenant_id' => $this->tenantId($i),
                'farmer_id' => $this->farmerId($i),
                'vendor_id' => $this->vendorId($i),
                'status' => $status,
                'total_amount' => $this->money($quantity * $price),
                'payment_gateway' => $this->pick(['cod', 'bkash', 'sslcommerz', 'stripe'], $i),
                'payment_status' => $this->pick(['pending', 'paid', 'failed', 'refunded'], $i),
                'settlement_status' => $this->pick(['held', 'released', 'pending'], $i),
                'txn_ref' => "TXN-DEMO-{$i}",
                'estimated_delivery' => $now->copy()->addDays($i % 7)->toDateString(),
                'placed_at' => $now->copy()->subDays($i),
                'delivered_at' => $status === 'delivered' ? $now->copy()->subDays($i % 5) : null,
                'settlement_released_at' => $i % 5 === 0 ? $now->copy()->subDays($i % 4) : null,
                'settlement_released_by' => $i % 5 === 0 ? $this->userId($i) : null,
                'created_at' => $now->copy()->subDays($i),
                'updated_at' => $now,
            ];

            $items[] = [
                'id' => self::AUTO_ID_OFFSET + $i,
                'order_id' => $this->orderId($i),
                'product_id' => $this->productId($i),
                'product_name' => "Demo Product {$i}",
                'quantity' => $quantity,
                'price' => $this->money($price),
                'unit' => 'piece',
                'created_at' => $now->copy()->subDays($i),
                'updated_at' => $now,
            ];

            $history[] = [
                'id' => self::AUTO_ID_OFFSET + $i,
                'order_id' => $this->orderId($i),
                'status' => $status,
                'changed_by' => $this->userId($i),
                'created_at' => $now->copy()->subDays($i),
                'updated_at' => $now,
            ];
        }

        DB::table('orders')->upsert($orders, ['id']);
        DB::table('order_items')->upsert($items, ['id']);
        DB::table('order_status_history')->upsert($history, ['id']);
    }

    private function seedCrops($now): void
    {
        $listings = [];
        $deals = [];
        $prices = [];
        $alerts = [];
        $weather = [];

        for ($i = 1; $i <= self::COUNT; $i++) {
            $crop = $this->crop($i);
            $location = $this->location($i);

            $listings[] = [
                'id' => $this->listingId($i),
                'tenant_id' => $this->tenantId($i),
                'farmer_id' => $this->farmerId($i),
                'product_category' => 'Fresh Produce',
                'crop_type' => $crop,
                'variety' => "Demo Variety {$i}",
                'quantity_kg' => 100 + ($i * 25),
                'quality_grade' => $this->pick(['A', 'B', 'Premium'], $i),
                'asking_price' => $this->money(20 + ($i % 90)),
                'harvest_date' => $now->copy()->addDays($i % 30)->toDateString(),
                'district' => $location['district'],
                'upazila' => $location['upazila'],
                'photos' => json_encode(["https://picsum.photos/seed/crop-{$i}/640/420"]),
                'status' => $this->pick(['active', 'matched', 'sold', 'expired'], $i),
                'matched_company_id' => $i % 3 === 0 ? $this->companyId($i) : null,
                'created_at' => $now->copy()->subDays($i),
                'updated_at' => $now,
            ];

            $deals[] = [
                'id' => $this->dealId($i),
                'listing_id' => $this->listingId($i),
                'company_id' => $this->companyId($i),
                'farmer_id' => $this->farmerId($i),
                'agreed_price' => $this->money(18 + ($i % 80)),
                'quantity_kg' => 100 + ($i * 20),
                'commission_pct' => 3,
                'commission_amt' => $this->money((100 + ($i * 20)) * (18 + ($i % 80)) * 0.03),
                'status' => $this->pick(['pending', 'confirmed', 'completed', 'cancelled'], $i),
                'payment_gateway' => $this->pick(['bkash', 'sslcommerz', 'bank'], $i),
                'payment_status' => $this->pick(['pending', 'paid', 'failed'], $i),
                'confirmed_at' => $i % 2 === 0 ? $now->copy()->subDays($i % 20) : null,
                'created_at' => $now->copy()->subDays($i),
                'updated_at' => $now,
            ];

            $prices[] = [
                'id' => self::AUTO_ID_OFFSET + $i,
                'crop_type' => "{$crop} Demo {$i}",
                'current_price' => $this->money(20 + ($i % 120)),
                'unit' => 'kg',
                'change_7d' => $this->money(($i % 9) - 4),
                'change_percent' => $this->money((($i % 9) - 4) * 1.2),
                'trend' => $this->pick(['up', 'down', 'stable'], $i),
                'history' => json_encode([
                    ['date' => $now->copy()->subDays(7)->toDateString(), 'price' => 18 + ($i % 100)],
                    ['date' => $now->toDateString(), 'price' => 20 + ($i % 120)],
                ]),
                'created_at' => $now->copy()->subDays($i),
                'updated_at' => $now,
            ];

            $alerts[] = [
                'id' => self::AUTO_ID_OFFSET + $i,
                'farmer_id' => $this->farmerId($i),
                'crop_type' => $crop,
                'target_price' => $this->money(30 + ($i % 100)),
                'active' => $i % 4 !== 0,
                'created_at' => $now->copy()->subDays($i),
                'updated_at' => $now,
            ];

            $weather[] = [
                'id' => self::AUTO_ID_OFFSET + $i,
                'district' => "Demo {$location['district']} {$i}",
                'forecast_date' => $now->copy()->addDays($i)->toDateString(),
                'temp_min' => 18 + ($i % 8),
                'temp_max' => 26 + ($i % 10),
                'rainfall' => $i % 80,
                'humidity' => 55 + ($i % 35),
                'wind_speed' => 5 + ($i % 20),
                'condition' => $this->pick(['Clear Sky', 'Light Rain', 'Cloudy', 'Thunderstorm'], $i),
                'icon' => $this->pick(['sun', 'cloud', 'cloud-rain', 'zap'], $i),
                'advisory' => "Demo weather advisory {$i}.",
                'created_at' => $now->copy()->subDays($i),
                'updated_at' => $now,
            ];
        }

        DB::table('crop_listings')->upsert($listings, ['id']);
        DB::table('crop_deals')->upsert($deals, ['id']);
        DB::table('crop_prices')->upsert($prices, ['id']);
        DB::table('price_alerts')->upsert($alerts, ['id']);
        DB::table('weather_forecasts')->upsert($weather, ['id']);
    }

    private function seedBilling($now): void
    {
        $invoices = [];
        $payments = [];

        for ($i = 1; $i <= self::COUNT; $i++) {
            $invoices[] = [
                'id' => $this->invoiceId($i),
                'tenant_id' => $this->tenantId($i),
                'farmer_id' => $this->farmerId($i),
                'type' => $this->pick(['subscription', 'order', 'commission'], $i),
                'amount' => $this->money(500 + ($i * 13)),
                'due_date' => $now->copy()->addDays($i % 30)->toDateString(),
                'status' => $this->pick(['pending', 'paid', 'overdue'], $i),
                'generated_at' => $now->copy()->subDays($i),
                'created_at' => $now->copy()->subDays($i),
                'updated_at' => $now,
            ];

            $payments[] = [
                'id' => $this->paymentId($i),
                'invoice_id' => $this->invoiceId($i),
                'amount' => $this->money(500 + ($i * 13)),
                'status' => $this->pick(['pending', 'completed', 'failed'], $i),
                'idempotency_key' => "payment-demo-key-{$i}",
                'paid_at' => $i % 3 !== 0 ? $now->copy()->subDays($i % 20) : null,
                'created_at' => $now->copy()->subDays($i),
                'updated_at' => $now,
            ];
        }

        DB::table('invoices')->upsert($invoices, ['id']);
        DB::table('payments')->upsert($payments, ['id']);
    }

    private function seedSystemTables($now): void
    {
        $passwordResets = [];
        $sessions = [];
        $cache = [];
        $cacheLocks = [];
        $jobs = [];
        $jobBatches = [];
        $failedJobs = [];
        $notifications = [];
        $otps = [];
        $auditLogs = [];

        for ($i = 1; $i <= self::COUNT; $i++) {
            $timestamp = $now->copy()->subMinutes($i)->timestamp;

            $passwordResets[] = [
                'email' => "demo.user{$i}@agrosync.test",
                'token' => Hash::make("reset-token-{$i}"),
                'created_at' => $now->copy()->subMinutes($i),
            ];

            $sessions[] = [
                'id' => "demo_session_{$i}",
                'user_id' => self::AUTO_ID_OFFSET + $i,
                'ip_address' => "127.0.0.{$i}",
                'user_agent' => "AgroSync Demo Seeder {$i}",
                'payload' => base64_encode("demo session {$i}"),
                'last_activity' => $timestamp,
            ];

            $cache[] = [
                'key' => "demo_cache_{$i}",
                'value' => serialize(['value' => "Seeded cache value {$i}"]),
                'expiration' => $now->copy()->addDay()->timestamp,
            ];

            $cacheLocks[] = [
                'key' => "demo_lock_{$i}",
                'owner' => "demo-owner-{$i}",
                'expiration' => $now->copy()->addMinutes(30)->timestamp,
            ];

            $jobs[] = [
                'id' => self::AUTO_ID_OFFSET + $i,
                'queue' => 'demo',
                'payload' => json_encode(['displayName' => "DemoJob{$i}", 'job' => 'Illuminate\Queue\CallQueuedHandler@call']),
                'attempts' => $i % 3,
                'reserved_at' => null,
                'available_at' => $timestamp,
                'created_at' => $timestamp,
            ];

            $jobBatches[] = [
                'id' => "demo_batch_{$i}",
                'name' => "Demo Batch {$i}",
                'total_jobs' => 10,
                'pending_jobs' => $i % 10,
                'failed_jobs' => $i % 2,
                'failed_job_ids' => json_encode([]),
                'options' => json_encode(['seeded' => true]),
                'cancelled_at' => null,
                'created_at' => $timestamp,
                'finished_at' => $i % 3 === 0 ? $timestamp + 120 : null,
            ];

            $failedJobs[] = [
                'id' => self::AUTO_ID_OFFSET + $i,
                'uuid' => "demo-failed-job-{$i}",
                'connection' => 'database',
                'queue' => 'demo',
                'payload' => json_encode(['displayName' => "DemoFailedJob{$i}"]),
                'exception' => "Demo seeded exception {$i}",
                'failed_at' => $now->copy()->subMinutes($i),
            ];

            $notifications[] = [
                'id' => "notif_demo_{$i}",
                'user_id' => $this->userId($i),
                'type' => $this->pick(['advisory', 'order', 'billing', 'system'], $i),
                'title' => "Demo Notification {$i}",
                'message' => "Seeded notification message {$i}.",
                'channel' => json_encode(['push', 'email']),
                'is_read' => $i % 2 === 0,
                'created_at' => $now->copy()->subDays($i),
                'updated_at' => $now,
            ];

            $otps[] = [
                'id' => "otp_demo_{$i}",
                'user_id' => $this->userId($i),
                'email' => "demo.user{$i}@agrosync.test",
                'role' => $this->pick(['farmer', 'officer', 'vendor', 'company', 'admin'], $i),
                'purpose' => $this->pick(['login', 'password_reset', 'verification'], $i),
                'token' => "otp-demo-token-{$i}",
                'otp_hash' => Hash::make((string) (100000 + $i)),
                'expires_at' => $now->copy()->addMinutes(10 + $i),
                'consumed_at' => $i % 4 === 0 ? $now->copy()->subMinutes($i) : null,
                'created_at' => $now->copy()->subMinutes($i),
                'updated_at' => $now,
            ];

            $auditLogs[] = [
                'id' => "audit_demo_{$i}",
                'entity' => $this->pick(['tenant', 'user', 'order', 'case'], $i),
                'action' => $this->pick(['create', 'update', 'approve', 'review'], $i),
                'actor' => "Demo Actor {$i}",
                'details' => "Seeded audit log details {$i}.",
                'created_at' => $now->copy()->subDays($i),
                'updated_at' => $now,
            ];
        }

        DB::table('password_reset_tokens')->upsert($passwordResets, ['email']);
        DB::table('sessions')->upsert($sessions, ['id']);
        DB::table('cache')->upsert($cache, ['key']);
        DB::table('cache_locks')->upsert($cacheLocks, ['key']);
        DB::table('jobs')->upsert($jobs, ['id']);
        DB::table('job_batches')->upsert($jobBatches, ['id']);
        DB::table('failed_jobs')->upsert($failedJobs, ['id']);
        DB::table('notifications')->upsert($notifications, ['id']);
        DB::table('auth_otps')->upsert($otps, ['id']);
        DB::table('audit_logs')->upsert($auditLogs, ['id']);
    }

    private function pick(array $values, int $index): mixed
    {
        return $values[($index - 1) % count($values)];
    }

    private function location(int $index): array
    {
        return $this->pick($this->divisions, $index);
    }

    private function crop(int $index): string
    {
        return $this->pick($this->crops, $index);
    }

    private function money(float $value): string
    {
        return number_format($value, 2, '.', '');
    }

    private function phone(int $index): string
    {
        return '017' . str_pad((string) (10000000 + $index), 8, '0', STR_PAD_LEFT);
    }

    private function tenantId(int $i): string
    {
        return sprintf('tenant_demo_%03d', $i);
    }

    private function userId(int $i): string
    {
        return sprintf('usr_demo_%03d', $i);
    }

    private function coopId(int $i): string
    {
        return sprintf('coop_demo_%03d', $i);
    }

    private function farmerId(int $i): string
    {
        return sprintf('farmer_demo_%03d', $i);
    }

    private function officerId(int $i): string
    {
        return sprintf('officer_demo_%03d', $i);
    }

    private function vendorId(int $i): string
    {
        return sprintf('vnd_demo_%03d', $i);
    }

    private function companyId(int $i): string
    {
        return sprintf('cmp_demo_%03d', $i);
    }

    private function caseId(int $i): string
    {
        return sprintf('ADV-DEMO-%07d', $i);
    }

    private function productId(int $i): string
    {
        return sprintf('prod_demo_%03d', $i);
    }

    private function cartId(int $i): string
    {
        return sprintf('cart_demo_%03d', $i);
    }

    private function orderId(int $i): string
    {
        return sprintf('ORD-DEMO-%08d', $i);
    }

    private function listingId(int $i): string
    {
        return sprintf('CRP-DEMO-%06d', $i);
    }

    private function dealId(int $i): string
    {
        return sprintf('deal_demo_%03d', $i);
    }

    private function invoiceId(int $i): string
    {
        return sprintf('INV-DEMO-%06d', $i);
    }

    private function paymentId(int $i): string
    {
        return sprintf('PAY-DEMO-%06d', $i);
    }
}
