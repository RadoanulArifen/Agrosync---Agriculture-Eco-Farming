<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class CropInterestNotificationTest extends TestCase
{
    use RefreshDatabase;

    private function seedDealFlowData(): void
    {
        $this->artisan('migrate');

        DB::table('tenants')->insert([
            'id' => 'tenant_910',
            'name' => 'Tenant 910',
            'subdomain' => 'tenant-910',
            'plan_tier' => 'basic',
            'status' => 'active',
            'farmer_count' => 1,
            'mrr' => 999,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('users')->insert([
            [
                'public_id' => 'usr_far_910',
                'tenant_id' => 'tenant_910',
                'role' => 'farmer',
                'name' => 'Farmer 910',
                'email' => 'farmer910@example.com',
                'phone' => '01710000010',
                'password' => Hash::make('password123'),
                'district' => 'Mymensingh',
                'division' => 'Mymensingh',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'public_id' => 'usr_cmp_910',
                'tenant_id' => 'tenant_910',
                'role' => 'company',
                'name' => 'Company 910',
                'email' => 'company910@example.com',
                'phone' => '01710000011',
                'password' => Hash::make('password123'),
                'district' => 'Dhaka',
                'division' => 'Dhaka',
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);

        DB::table('farmers')->insert([
            'id' => 'farmer_910',
            'user_id' => 'usr_far_910',
            'tenant_id' => 'tenant_910',
            'fid' => 'AGS-2026-9100001',
            'nid_hash' => 'nid_hash_910',
            'name_en' => 'Farmer 910',
            'name_bn' => 'Farmer 910',
            'district' => 'Mymensingh',
            'division' => 'Mymensingh',
            'upazila' => 'Trishal',
            'phone' => '01710000010',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('companies')->insert([
            'id' => 'cmp_910',
            'user_id' => 'usr_cmp_910',
            'tenant_id' => 'tenant_910',
            'company_id' => 'CMP-910',
            'company_name' => 'Buyer 910 Ltd',
            'registration_no' => 'REG-910',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('crop_listings')->insert([
            'id' => 'CRP-910',
            'tenant_id' => 'tenant_910',
            'farmer_id' => 'farmer_910',
            'product_category' => 'Fresh Vegetables',
            'crop_type' => 'Potato',
            'variety' => 'Cardinal',
            'quantity_kg' => 800,
            'quality_grade' => 'A',
            'asking_price' => 32,
            'district' => 'Mymensingh',
            'upazila' => 'Trishal',
            'photos' => json_encode([]),
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function test_express_interest_creates_match_request_and_notifies_farmer(): void
    {
        $this->seedDealFlowData();

        $response = $this->postJson('/api/v1/crop-deals/interest', [
            'listingId' => 'CRP-910',
            'companyId' => 'cmp_910',
            'companyName' => 'Buyer 910 Ltd',
        ]);

        $response->assertOk()
            ->assertJsonPath('data.success', true);

        $this->assertDatabaseHas('crop_deals', [
            'listing_id' => 'CRP-910',
            'company_id' => 'cmp_910',
            'farmer_id' => 'farmer_910',
            'status' => 'pending',
        ]);

        $this->assertDatabaseHas('crop_listings', [
            'id' => 'CRP-910',
            'status' => 'matched',
            'matched_company_id' => 'cmp_910',
        ]);

        $this->assertDatabaseHas('notifications', [
            'user_id' => 'usr_far_910',
            'type' => 'crop_deal',
            'title' => 'New Match Request',
        ]);
    }

    public function test_farmer_accepts_deal_and_company_gets_notification(): void
    {
        $this->seedDealFlowData();

        $interest = $this->postJson('/api/v1/crop-deals/interest', [
            'listingId' => 'CRP-910',
            'companyId' => 'cmp_910',
            'companyName' => 'Buyer 910 Ltd',
        ]);
        $dealId = $interest->json('data.matchId');

        $response = $this->patchJson("/api/v1/crop-deals/{$dealId}/status", [
            'status' => 'confirmed',
            'actorRole' => 'farmer',
            'actorId' => 'farmer_910',
        ]);

        $response->assertOk()
            ->assertJsonPath('data.success', true);

        $this->assertDatabaseHas('crop_deals', [
            'id' => $dealId,
            'status' => 'confirmed',
        ]);

        $this->assertDatabaseHas('crop_listings', [
            'id' => 'CRP-910',
            'status' => 'matched',
            'matched_company_id' => 'cmp_910',
        ]);

        $this->assertDatabaseHas('notifications', [
            'user_id' => 'cmp_910',
            'type' => 'crop_deal',
            'title' => 'Deal Accepted by Farmer',
        ]);
    }

    public function test_farmer_rejects_deal_and_company_gets_notification(): void
    {
        $this->seedDealFlowData();

        $interest = $this->postJson('/api/v1/crop-deals/interest', [
            'listingId' => 'CRP-910',
            'companyId' => 'cmp_910',
            'companyName' => 'Buyer 910 Ltd',
        ]);
        $dealId = $interest->json('data.matchId');

        $response = $this->patchJson("/api/v1/crop-deals/{$dealId}/status", [
            'status' => 'cancelled',
            'actorRole' => 'farmer',
            'actorId' => 'farmer_910',
        ]);

        $response->assertOk()
            ->assertJsonPath('data.success', true);

        $this->assertDatabaseHas('crop_deals', [
            'id' => $dealId,
            'status' => 'cancelled',
        ]);

        $this->assertDatabaseHas('crop_listings', [
            'id' => 'CRP-910',
            'status' => 'active',
            'matched_company_id' => null,
        ]);

        $this->assertDatabaseHas('notifications', [
            'user_id' => 'cmp_910',
            'type' => 'crop_deal',
            'title' => 'Deal Rejected by Farmer',
        ]);
    }
}
