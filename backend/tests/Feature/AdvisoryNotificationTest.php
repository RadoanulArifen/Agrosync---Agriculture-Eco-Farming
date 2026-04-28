<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AdvisoryNotificationTest extends TestCase
{
    use RefreshDatabase;

    public function test_urgent_advisory_notifies_tenant_officers_when_no_district_match_exists(): void
    {
        $this->artisan('migrate');

        DB::table('users')->insert([
            [
                'public_id' => 'usr_far_900',
                'tenant_id' => 'tenant_900',
                'role' => 'farmer',
                'name' => 'Farmer One',
                'email' => 'farmer900@example.com',
                'phone' => '01700000000',
                'password' => Hash::make('password123'),
                'district' => 'Panchagarh',
                'division' => 'Rangpur',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'public_id' => 'usr_off_900',
                'tenant_id' => 'tenant_900',
                'role' => 'officer',
                'name' => 'Officer One',
                'email' => 'officer900@example.com',
                'phone' => '01800000000',
                'password' => Hash::make('password123'),
                'district' => 'Dhaka',
                'division' => 'Dhaka',
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);

        DB::table('farmers')->insert([
            'id' => 'usr_far_900',
            'user_id' => 'usr_far_900',
            'tenant_id' => 'tenant_900',
            'fid' => 'AGS-2026-9000001',
            'nid_hash' => 'nid_hash_900',
            'name_en' => 'Farmer One',
            'name_bn' => 'Farmer One',
            'district' => 'Panchagarh',
            'division' => 'Rangpur',
            'upazila' => 'Sadar',
            'phone' => '01700000000',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('officers')->insert([
            'id' => 'usr_off_900',
            'user_id' => 'usr_off_900',
            'tenant_id' => 'tenant_900',
            'officer_id' => 'OFF-900',
            'region_districts' => json_encode(['Dhaka']),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $response = $this->postJson('/api/v1/advisory-cases', [
            'farmerId' => 'usr_far_900',
            'cropType' => 'Rice',
            'description' => 'Urgent crop issue',
            'priority' => 'URGENT',
            'photos' => [],
        ]);

        $response->assertOk()
            ->assertJsonPath('data.success', true);

        $this->assertDatabaseHas('notifications', [
            'user_id' => 'usr_off_900',
            'title' => 'Urgent New Case Alert',
        ]);
    }
}
