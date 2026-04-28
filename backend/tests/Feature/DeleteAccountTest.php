<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Tests\TestCase;

class DeleteAccountTest extends TestCase
{
    use RefreshDatabase;

    public function test_farmer_can_delete_own_account_and_profile_related_records_are_removed(): void
    {
        $this->artisan('migrate');

        \DB::table('tenants')->insert([
            'id' => 'tenant_901',
            'name' => 'Tenant 901',
            'subdomain' => 'tenant901',
            'plan_tier' => 'basic',
            'status' => 'trial',
            'farmer_count' => 0,
            'mrr' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        \DB::table('users')->insert([
            'public_id' => 'usr_far_901',
            'tenant_id' => 'tenant_901',
            'role' => 'farmer',
            'name' => 'Farmer Delete',
            'email' => 'farmer-delete@example.com',
            'phone' => '01700000901',
            'password' => Hash::make('password123'),
            'district' => 'Dhaka',
            'division' => 'Dhaka',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        \DB::table('farmers')->insert([
            'id' => 'usr_far_901',
            'user_id' => 'usr_far_901',
            'tenant_id' => 'tenant_901',
            'fid' => 'AGS-2026-9000901',
            'nid_hash' => 'nid_hash_901',
            'name_en' => 'Farmer Delete',
            'district' => 'Dhaka',
            'phone' => '01700000901',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        \DB::table('notifications')->insert([
            'id' => (string) Str::uuid(),
            'user_id' => 'usr_far_901',
            'type' => 'system',
            'title' => 'Test Notification',
            'message' => 'Before deletion',
            'channel' => json_encode(['push']),
            'is_read' => false,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        \DB::table('user_settings')->insert([
            'user_id' => 'usr_far_901',
            'email_notifications' => true,
            'push_notifications' => true,
            'outbreak_warnings' => true,
            'urgent_advisory' => true,
            'new_case_alert' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        \DB::table('auth_otps')->insert([
            'id' => (string) Str::uuid(),
            'user_id' => 'usr_far_901',
            'email' => 'farmer-delete@example.com',
            'role' => 'farmer',
            'purpose' => 'login',
            'token' => 'otp_token_farmer_delete',
            'otp_hash' => Hash::make('123456'),
            'expires_at' => now()->addMinutes(10),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $response = $this->deleteJson('/api/v1/users/usr_far_901');

        $response->assertOk()
            ->assertJsonPath('data.success', true);

        $this->assertDatabaseMissing('users', ['public_id' => 'usr_far_901']);
        $this->assertDatabaseMissing('farmers', ['user_id' => 'usr_far_901']);
        $this->assertDatabaseMissing('notifications', ['user_id' => 'usr_far_901']);
        $this->assertDatabaseMissing('user_settings', ['user_id' => 'usr_far_901']);
        $this->assertDatabaseMissing('auth_otps', ['user_id' => 'usr_far_901']);
    }

    public function test_all_other_roles_can_delete_accounts_from_profile_flow(): void
    {
        $this->artisan('migrate');

        \DB::table('tenants')->insert([
            'id' => 'tenant_902',
            'name' => 'Tenant 902',
            'subdomain' => 'tenant902',
            'plan_tier' => 'basic',
            'admin_user_id' => 'usr_adm_902',
            'status' => 'trial',
            'farmer_count' => 0,
            'mrr' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        \DB::table('users')->insert([
            [
                'public_id' => 'usr_off_902',
                'tenant_id' => 'tenant_902',
                'role' => 'officer',
                'name' => 'Officer Delete',
                'email' => 'officer-delete@example.com',
                'phone' => '01800000902',
                'password' => Hash::make('password123'),
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'public_id' => 'usr_vnd_902',
                'tenant_id' => 'tenant_902',
                'role' => 'vendor',
                'name' => 'Vendor Delete',
                'email' => 'vendor-delete@example.com',
                'phone' => '01900000902',
                'password' => Hash::make('password123'),
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'public_id' => 'usr_cmp_902',
                'tenant_id' => 'tenant_902',
                'role' => 'company',
                'name' => 'Company Delete',
                'email' => 'company-delete@example.com',
                'phone' => '01600000902',
                'password' => Hash::make('password123'),
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'public_id' => 'usr_adm_902',
                'tenant_id' => 'tenant_902',
                'role' => 'admin',
                'name' => 'Admin Delete',
                'email' => 'admin-delete@example.com',
                'phone' => '01500000902',
                'password' => Hash::make('password123'),
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);

        \DB::table('officers')->insert([
            'id' => 'usr_off_902',
            'user_id' => 'usr_off_902',
            'tenant_id' => 'tenant_902',
            'officer_id' => 'OFF-902',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        \DB::table('vendors')->insert([
            'id' => 'usr_vnd_902',
            'user_id' => 'usr_vnd_902',
            'tenant_id' => 'tenant_902',
            'vendor_id' => 'VND-902',
            'company_name' => 'Vendor Delete',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        \DB::table('products')->insert([
            'id' => 'prod_902',
            'tenant_id' => 'tenant_902',
            'vendor_id' => 'usr_vnd_902',
            'name_en' => 'Delete Product',
            'category' => 'Seed',
            'price' => 100,
            'unit' => 'kg',
            'stock_qty' => 100,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        \DB::table('companies')->insert([
            'id' => 'usr_cmp_902',
            'user_id' => 'usr_cmp_902',
            'tenant_id' => 'tenant_902',
            'company_id' => 'CMP-902',
            'company_name' => 'Company Delete',
            'registration_no' => 'REG-902',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        foreach (['usr_off_902', 'usr_vnd_902', 'usr_cmp_902', 'usr_adm_902'] as $publicId) {
            $this->deleteJson("/api/v1/users/{$publicId}")
                ->assertOk()
                ->assertJsonPath('data.success', true);
        }

        $this->assertDatabaseMissing('users', ['public_id' => 'usr_off_902']);
        $this->assertDatabaseMissing('users', ['public_id' => 'usr_vnd_902']);
        $this->assertDatabaseMissing('users', ['public_id' => 'usr_cmp_902']);
        $this->assertDatabaseMissing('users', ['public_id' => 'usr_adm_902']);
        $this->assertDatabaseMissing('officers', ['user_id' => 'usr_off_902']);
        $this->assertDatabaseMissing('vendors', ['user_id' => 'usr_vnd_902']);
        $this->assertDatabaseMissing('companies', ['user_id' => 'usr_cmp_902']);
        $this->assertDatabaseMissing('products', ['id' => 'prod_902']);
        $this->assertDatabaseHas('tenants', ['id' => 'tenant_902', 'admin_user_id' => null]);
    }
}
