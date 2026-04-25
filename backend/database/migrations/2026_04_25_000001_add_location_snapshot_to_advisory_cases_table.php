<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('advisory_cases', function (Blueprint $table) {
            $table->string('farmer_division')->nullable()->after('farmer_id');
            $table->string('farmer_district')->nullable()->after('farmer_division')->index();
            $table->string('farmer_upazila')->nullable()->after('farmer_district');
        });
    }

    public function down(): void
    {
        Schema::table('advisory_cases', function (Blueprint $table) {
            $table->dropColumn(['farmer_division', 'farmer_district', 'farmer_upazila']);
        });
    }
};
