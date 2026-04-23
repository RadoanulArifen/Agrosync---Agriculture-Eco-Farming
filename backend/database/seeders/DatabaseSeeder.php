<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    private function normalizeRows(array $rows): array
    {
        $keys = [];

        foreach ($rows as $row) {
            $keys = array_unique([...$keys, ...array_keys($row)]);
        }

        return array_map(
            fn (array $row) => array_replace(array_fill_keys($keys, null), $row),
            $rows
        );
    }

    public function run(): void
    {
        $now = now();

        DB::table('tenants')->upsert($this->normalizeRows([
            ['id' => 'tenant_001', 'name' => 'Mymensingh Farmers Cooperative', 'subdomain' => 'mymensingh', 'plan_tier' => 'professional', 'admin_user_id' => 'usr_adm_001', 'status' => 'active', 'farmer_count' => 2, 'mrr' => 5999, 'created_at' => '2026-01-01 00:00:00', 'updated_at' => $now],
            ['id' => 'tenant_002', 'name' => 'North Bengal Agro Network', 'subdomain' => 'north-bengal', 'plan_tier' => 'standard', 'admin_user_id' => 'usr_adm_001', 'status' => 'trial', 'farmer_count' => 1, 'mrr' => 2999, 'created_at' => '2026-02-01 00:00:00', 'updated_at' => $now],
        ]), ['id']);

        $users = [
            ['public_id' => 'usr_001', 'tenant_id' => 'tenant_001', 'role' => 'farmer', 'name' => 'Abdul Karim', 'name_bn' => 'আব্দুল করিম', 'email' => 'abdul.karim@farmer.com', 'phone' => '01711234567', 'avatar' => 'https://i.pravatar.cc/150?img=3', 'division' => 'Mymensingh', 'district' => 'Mymensingh', 'upazila' => 'Trishal', 'designation' => null, 'access_label' => 'Registered Farmer'],
            ['public_id' => 'usr_002', 'tenant_id' => 'tenant_001', 'role' => 'farmer', 'name' => 'Fatema Begum', 'name_bn' => 'ফাতেমা বেগম', 'email' => 'fatema.begum@farmer.com', 'phone' => '01812345678', 'avatar' => 'https://i.pravatar.cc/150?img=5', 'division' => 'Rajshahi', 'district' => 'Rajshahi', 'upazila' => 'Godagari', 'designation' => null, 'access_label' => 'Registered Farmer'],
            ['public_id' => 'usr_003', 'tenant_id' => 'tenant_002', 'role' => 'farmer', 'name' => 'Mohammad Hasan', 'name_bn' => 'মোহাম্মদ হাসান', 'email' => 'mohammad.hasan@farmer.com', 'phone' => '01916789012', 'avatar' => 'https://i.pravatar.cc/150?img=7', 'division' => 'Rajshahi', 'district' => 'Bogura', 'upazila' => 'Sherpur', 'designation' => null, 'access_label' => 'Registered Farmer'],
            ['public_id' => 'usr_off_001', 'tenant_id' => 'tenant_001', 'role' => 'officer', 'name' => 'Dr. Rahim Uddin', 'name_bn' => 'ডঃ রহিম উদ্দিন', 'email' => 'rahim@dae.gov.bd', 'phone' => '01711000001', 'avatar' => 'https://i.pravatar.cc/150?img=11', 'division' => 'Mymensingh', 'district' => 'Mymensingh', 'upazila' => '', 'designation' => 'Agricultural Officer', 'access_label' => 'Regional Advisory Officer'],
            ['public_id' => 'usr_off_002', 'tenant_id' => 'tenant_001', 'role' => 'officer', 'name' => 'Nasrin Akter', 'name_bn' => 'নাসরিন আক্তার', 'email' => 'nasrin@dae.gov.bd', 'phone' => '01811000002', 'avatar' => 'https://i.pravatar.cc/150?img=15', 'division' => 'Rajshahi', 'district' => 'Rajshahi', 'upazila' => '', 'designation' => 'Agricultural Officer', 'access_label' => 'Regional Advisory Officer'],
            ['public_id' => 'usr_vnd_001', 'tenant_id' => 'tenant_001', 'role' => 'vendor', 'name' => 'AgroSupply BD', 'name_bn' => 'এগ্রো সাপ্লাই বিডি', 'email' => 'vendor@ams.com.bd', 'phone' => '01711000011', 'avatar' => 'https://i.pravatar.cc/150?img=21', 'division' => 'Dhaka', 'district' => 'Dhaka', 'upazila' => '', 'designation' => 'Verified Vendor', 'access_label' => 'Marketplace Vendor'],
            ['public_id' => 'usr_vnd_002', 'tenant_id' => 'tenant_001', 'role' => 'vendor', 'name' => 'BanglaSeed Co.', 'name_bn' => 'বাংলা সিড কো.', 'email' => 'seed@ams.com.bd', 'phone' => '01711000013', 'avatar' => 'https://i.pravatar.cc/150?img=22', 'division' => 'Dhaka', 'district' => 'Dhaka', 'upazila' => '', 'designation' => 'Verified Vendor', 'access_label' => 'Marketplace Vendor'],
            ['public_id' => 'usr_cmp_001', 'tenant_id' => 'tenant_001', 'role' => 'company', 'name' => 'AgroTrade BD', 'name_bn' => 'এগ্রোট্রেড বিডি', 'email' => 'company@ams.com.bd', 'phone' => '01711000012', 'avatar' => 'https://i.pravatar.cc/150?img=25', 'division' => 'Dhaka', 'district' => 'Dhaka', 'upazila' => '', 'designation' => 'Procurement Company', 'access_label' => 'Crop Buyer'],
            ['public_id' => 'usr_adm_001', 'tenant_id' => 'tenant_001', 'role' => 'admin', 'name' => 'Super Admin', 'name_bn' => 'সুপার অ্যাডমিন', 'email' => 'admin@ams.com.bd', 'phone' => '01711000010', 'avatar' => 'https://i.pravatar.cc/150?img=30', 'division' => 'Dhaka', 'district' => 'Dhaka', 'upazila' => '', 'designation' => 'Platform Administrator', 'access_label' => 'Full Platform Access'],
        ];

        foreach ($users as $user) {
            DB::table('users')->updateOrInsert(
                ['public_id' => $user['public_id']],
                $user + ['name' => $user['name'], 'password' => Hash::make('password123'), 'created_at' => $now, 'updated_at' => $now]
            );
        }

        DB::table('cooperatives')->upsert($this->normalizeRows([
            ['id' => 'coop_001', 'tenant_id' => 'tenant_001', 'name' => 'Trishal Rice Growers', 'leader_id' => 'usr_001', 'created_at' => $now, 'updated_at' => $now],
        ]), ['id']);

        DB::table('farmers')->upsert($this->normalizeRows([
            ['id' => 'usr_001', 'user_id' => 'usr_001', 'tenant_id' => 'tenant_001', 'fid' => 'AGS-2026-0000001', 'nid_hash' => 'hash_abc', 'name_bn' => 'আব্দুল করিম', 'name_en' => 'Abdul Karim', 'division' => 'Mymensingh', 'district' => 'Mymensingh', 'upazila' => 'Trishal', 'village' => 'Dhanikhola', 'land_size' => 4.5, 'crop_types' => json_encode(['Rice (Aman)', 'Mustard', 'Potato']), 'phone' => '01711234567', 'bkash_account' => '01711234567', 'cooperative_id' => 'coop_001', 'verified' => true, 'blocked' => false, 'created_at' => '2026-01-10 08:00:00', 'updated_at' => $now],
            ['id' => 'usr_002', 'user_id' => 'usr_002', 'tenant_id' => 'tenant_001', 'fid' => 'AGS-2026-0000002', 'nid_hash' => 'hash_def', 'name_bn' => 'ফাতেমা বেগম', 'name_en' => 'Fatema Begum', 'division' => 'Rajshahi', 'district' => 'Rajshahi', 'upazila' => 'Godagari', 'village' => 'Premtali', 'land_size' => 2.0, 'crop_types' => json_encode(['Rice (Boro)', 'Wheat', 'Mango']), 'phone' => '01812345678', 'bkash_account' => '01812345678', 'cooperative_id' => null, 'verified' => true, 'blocked' => false, 'created_at' => '2026-01-15 09:30:00', 'updated_at' => $now],
            ['id' => 'usr_003', 'user_id' => 'usr_003', 'tenant_id' => 'tenant_002', 'fid' => 'AGS-2026-0000003', 'nid_hash' => 'hash_ghi', 'name_bn' => 'মোহাম্মদ হাসান', 'name_en' => 'Mohammad Hasan', 'division' => 'Rajshahi', 'district' => 'Bogura', 'upazila' => 'Sherpur', 'village' => 'Kusumbi', 'land_size' => 7.0, 'crop_types' => json_encode(['Potato', 'Onion', 'Garlic']), 'phone' => '01916789012', 'bkash_account' => '01916789012', 'cooperative_id' => null, 'verified' => false, 'blocked' => false, 'created_at' => '2026-02-01 10:00:00', 'updated_at' => $now],
        ]), ['id']);

        DB::table('officers')->upsert($this->normalizeRows([
            ['id' => 'usr_off_001', 'user_id' => 'usr_off_001', 'tenant_id' => 'tenant_001', 'officer_id' => 'OFF-001', 'specialty_tags' => json_encode(['Rice Disease', 'Pest Control']), 'region_districts' => json_encode(['Mymensingh', 'Tangail', 'Jamalpur']), 'max_active_cases' => 20, 'availability_status' => 'available', 'active' => true, 'created_at' => $now, 'updated_at' => $now],
            ['id' => 'usr_off_002', 'user_id' => 'usr_off_002', 'tenant_id' => 'tenant_001', 'officer_id' => 'OFF-002', 'specialty_tags' => json_encode(['Vegetable', 'Soil Health']), 'region_districts' => json_encode(['Rajshahi', 'Chapainawabganj', 'Naogaon']), 'max_active_cases' => 20, 'availability_status' => 'busy', 'active' => true, 'created_at' => $now, 'updated_at' => $now],
        ]), ['id']);

        DB::table('vendors')->upsert($this->normalizeRows([
            ['id' => 'vnd_001', 'user_id' => 'usr_vnd_001', 'tenant_id' => 'tenant_001', 'vendor_id' => 'VND-001', 'company_name' => 'AgroSupply BD', 'delivery_districts' => json_encode(['Dhaka', 'Mymensingh', 'Rajshahi']), 'status' => 'approved', 'created_at' => $now, 'updated_at' => $now],
            ['id' => 'vnd_002', 'user_id' => 'usr_vnd_002', 'tenant_id' => 'tenant_001', 'vendor_id' => 'VND-002', 'company_name' => 'BanglaSeed Co.', 'delivery_districts' => json_encode(['All Bangladesh']), 'status' => 'approved', 'created_at' => $now, 'updated_at' => $now],
        ]), ['id']);

        DB::table('companies')->upsert($this->normalizeRows([
            ['id' => 'usr_cmp_001', 'user_id' => 'usr_cmp_001', 'tenant_id' => 'tenant_001', 'company_id' => 'CMP-001', 'company_name' => 'AgroTrade BD', 'registration_no' => 'TRADE-2026-001', 'crop_interests' => json_encode(['Rice (Aman)', 'Potato', 'Mango']), 'created_at' => $now, 'updated_at' => $now],
        ]), ['id']);

        DB::table('advisory_cases')->upsert($this->normalizeRows([
            ['id' => 'ADV-2026-0000001', 'tenant_id' => 'tenant_001', 'farmer_id' => 'usr_001', 'officer_id' => 'usr_off_001', 'crop_type' => 'Rice (Aman)', 'description' => 'My rice plants are showing yellow leaves and brown spots. Several plants have dried up.', 'photos' => json_encode(['https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=400&q=80']), 'status' => 'responded', 'ai_diagnosis' => 'Bacterial Leaf Blight', 'ai_confidence' => 87, 'officer_response' => 'Apply copper-based bactericide. Remove infected plants and ensure proper drainage.', 'responded_at' => '2026-04-18 10:30:00', 'created_at' => '2026-04-18 09:00:00', 'updated_at' => $now],
            ['id' => 'ADV-2026-0000002', 'tenant_id' => 'tenant_001', 'farmer_id' => 'usr_002', 'officer_id' => null, 'crop_type' => 'Wheat', 'description' => 'Fungal infection visible on wheat stems. Orange-red pustules appearing.', 'photos' => json_encode(['https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=400&q=80']), 'status' => 'ai_analyzed', 'ai_diagnosis' => 'Wheat Stem Rust', 'ai_confidence' => 92, 'officer_response' => null, 'responded_at' => null, 'created_at' => '2026-04-20 07:30:00', 'updated_at' => $now],
            ['id' => 'ADV-2026-0000003', 'tenant_id' => 'tenant_002', 'farmer_id' => 'usr_003', 'officer_id' => 'usr_off_002', 'crop_type' => 'Potato', 'description' => 'Potato leaves turning black with white mold appearing underneath.', 'photos' => json_encode(['https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=400&q=80']), 'status' => 'assigned', 'ai_diagnosis' => 'Late Blight', 'ai_confidence' => 94, 'officer_response' => null, 'responded_at' => null, 'created_at' => '2026-04-21 06:00:00', 'updated_at' => $now],
        ]), ['id']);

        DB::table('products')->upsert($this->normalizeRows([
            ['id' => 'prod_001', 'tenant_id' => 'tenant_001', 'vendor_id' => 'vnd_001', 'name_en' => 'Urea Fertilizer (Premium)', 'name_bn' => 'ইউরিয়া সার (প্রিমিয়াম)', 'category' => 'Fertilizer', 'price' => 1200, 'unit' => '50kg bag', 'stock_qty' => 500, 'description' => 'High-quality granular urea for all crops. 46% nitrogen content.', 'manufacturer' => 'KAFCO Bangladesh', 'photos' => json_encode(['https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&q=80']), 'delivery_districts' => json_encode(['Dhaka', 'Mymensingh', 'Tangail', 'Gazipur']), 'estimated_delivery_days' => 3, 'rating' => 4.7, 'review_count' => 284, 'is_recommended' => true, 'created_at' => $now, 'updated_at' => $now],
            ['id' => 'prod_002', 'tenant_id' => 'tenant_001', 'vendor_id' => 'vnd_001', 'name_en' => 'Copper Bactericide Spray', 'name_bn' => 'কপার ব্যাকটেরিসাইড স্প্রে', 'category' => 'Pesticide', 'price' => 450, 'unit' => '500ml bottle', 'stock_qty' => 120, 'description' => 'Effective against bacterial leaf blight, leaf spot, and blast diseases.', 'manufacturer' => 'BAYER CropScience', 'photos' => json_encode(['https://images.unsplash.com/photo-1530836369250-ef72a3f5cda8?w=400&q=80']), 'delivery_districts' => json_encode(['Mymensingh', 'Rajshahi', 'Dhaka']), 'estimated_delivery_days' => 2, 'rating' => 4.8, 'review_count' => 156, 'is_recommended' => true, 'created_at' => $now, 'updated_at' => $now],
            ['id' => 'prod_003', 'tenant_id' => 'tenant_001', 'vendor_id' => 'vnd_002', 'name_en' => 'BRRI Dhan-28 Rice Seed', 'name_bn' => 'ব্রি ধান-২৮ বীজ', 'category' => 'Seed', 'price' => 800, 'unit' => '5kg pack', 'stock_qty' => 350, 'description' => 'High-yield Boro rice variety.', 'manufacturer' => 'BRRI Bangladesh', 'photos' => json_encode(['https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=400&q=80']), 'delivery_districts' => json_encode(['All Bangladesh']), 'estimated_delivery_days' => 4, 'rating' => 4.9, 'review_count' => 521, 'is_recommended' => false, 'created_at' => $now, 'updated_at' => $now],
        ]), ['id']);

        DB::table('orders')->upsert($this->normalizeRows([
            ['id' => 'ORD-2026-00000001', 'tenant_id' => 'tenant_001', 'farmer_id' => 'usr_001', 'vendor_id' => 'vnd_001', 'status' => 'dispatched', 'total_amount' => 3750, 'payment_gateway' => 'bkash', 'payment_status' => 'paid', 'estimated_delivery' => '2026-04-21', 'placed_at' => '2026-04-18 11:00:00', 'created_at' => '2026-04-18 11:00:00', 'updated_at' => $now],
        ]), ['id']);

        DB::table('order_items')->upsert($this->normalizeRows([
            ['order_id' => 'ORD-2026-00000001', 'product_id' => 'prod_001', 'product_name' => 'Urea Fertilizer (Premium)', 'quantity' => 2, 'price' => 1200, 'unit' => '50kg bag', 'created_at' => $now, 'updated_at' => $now],
            ['order_id' => 'ORD-2026-00000001', 'product_id' => 'prod_002', 'product_name' => 'Copper Bactericide Spray', 'quantity' => 3, 'price' => 450, 'unit' => '500ml bottle', 'created_at' => $now, 'updated_at' => $now],
        ]), ['order_id', 'product_id']);

        DB::table('crop_listings')->upsert($this->normalizeRows([
            ['id' => 'CRP-001', 'tenant_id' => 'tenant_001', 'farmer_id' => 'usr_001', 'product_category' => 'Fresh Vegetables', 'crop_type' => 'Rice (Aman)', 'variety' => 'BRRI Dhan-39', 'quantity_kg' => 5000, 'quality_grade' => 'A', 'asking_price' => 28, 'harvest_date' => '2026-05-15', 'district' => 'Mymensingh', 'upazila' => 'Trishal', 'photos' => json_encode(['https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=400&q=80']), 'status' => 'active', 'matched_company_id' => null, 'created_at' => '2026-04-15 07:00:00', 'updated_at' => $now],
            ['id' => 'CRP-002', 'tenant_id' => 'tenant_001', 'farmer_id' => 'usr_002', 'product_category' => 'Fresh Vegetables', 'crop_type' => 'Mango', 'variety' => 'Himsagar', 'quantity_kg' => 2000, 'quality_grade' => 'A', 'asking_price' => 120, 'harvest_date' => '2026-06-01', 'district' => 'Rajshahi', 'upazila' => 'Paba', 'photos' => json_encode(['https://images.unsplash.com/photo-1519096845289-95806ee03a1a?w=400&q=80']), 'status' => 'matched', 'matched_company_id' => 'usr_cmp_001', 'created_at' => '2026-04-16 07:00:00', 'updated_at' => $now],
        ]), ['id']);

        DB::table('crop_deals')->upsert($this->normalizeRows([
            ['id' => 'deal_001', 'listing_id' => 'CRP-002', 'company_id' => 'usr_cmp_001', 'farmer_id' => 'usr_002', 'agreed_price' => 118, 'quantity_kg' => 2000, 'commission_pct' => 3, 'commission_amt' => 7080, 'status' => 'confirmed', 'confirmed_at' => '2026-04-16 10:00:00', 'created_at' => $now, 'updated_at' => $now],
        ]), ['id']);

        DB::table('crop_prices')->upsert($this->normalizeRows([
            ['crop_type' => 'Rice (Aman)', 'current_price' => 28, 'unit' => 'kg', 'change_7d' => 2, 'change_percent' => 7.7, 'trend' => 'up', 'history' => json_encode([['date' => '2026-04-17', 'price' => 26], ['date' => '2026-04-23', 'price' => 28]]), 'created_at' => $now, 'updated_at' => $now],
            ['crop_type' => 'Potato', 'current_price' => 34, 'unit' => 'kg', 'change_7d' => -1, 'change_percent' => -2.9, 'trend' => 'down', 'history' => json_encode([['date' => '2026-04-17', 'price' => 35], ['date' => '2026-04-23', 'price' => 34]]), 'created_at' => $now, 'updated_at' => $now],
            ['crop_type' => 'Mango', 'current_price' => 120, 'unit' => 'kg', 'change_7d' => 0, 'change_percent' => 0, 'trend' => 'stable', 'history' => json_encode([['date' => '2026-04-17', 'price' => 120], ['date' => '2026-04-23', 'price' => 120]]), 'created_at' => $now, 'updated_at' => $now],
        ]), ['crop_type']);

        DB::table('notifications')->upsert($this->normalizeRows([
            ['id' => 'notif_001', 'user_id' => 'usr_001', 'type' => 'advisory', 'title' => 'Officer Response Received', 'message' => 'Dr. Rahim Uddin responded to your rice advisory case.', 'channel' => json_encode(['push', 'sms']), 'is_read' => false, 'created_at' => '2026-04-18 10:35:00', 'updated_at' => $now],
            ['id' => 'notif_002', 'user_id' => 'usr_001', 'type' => 'order', 'title' => 'Order Dispatched', 'message' => 'Order ORD-2026-00000001 is on the way.', 'channel' => json_encode(['push', 'sms']), 'is_read' => false, 'created_at' => '2026-04-19 09:00:00', 'updated_at' => $now],
            ['id' => 'notif_003', 'user_id' => 'usr_cmp_001', 'type' => 'system', 'title' => 'Crop Deal Confirmed', 'message' => 'Mango listing CRP-002 moved to confirmed deal stage.', 'channel' => json_encode(['push', 'email']), 'is_read' => true, 'created_at' => '2026-04-16 10:05:00', 'updated_at' => $now],
        ]), ['id']);

        DB::table('audit_logs')->upsert($this->normalizeRows([
            ['id' => 'audit_001', 'entity' => 'tenant', 'action' => 'create', 'actor' => 'Super Admin', 'details' => 'Created Mymensingh Farmers Cooperative tenant.', 'created_at' => '2026-04-20 09:00:00', 'updated_at' => $now],
            ['id' => 'audit_002', 'entity' => 'case', 'action' => 'reassign', 'actor' => 'Super Admin', 'details' => 'Reassigned advisory case ADV-2026-0000003 to Nasrin Akter.', 'created_at' => '2026-04-21 11:20:00', 'updated_at' => $now],
        ]), ['id']);
    }
}
