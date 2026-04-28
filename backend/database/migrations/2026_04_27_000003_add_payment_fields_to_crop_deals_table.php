<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('crop_deals', function (Blueprint $table) {
            $table->string('payment_gateway')->nullable()->after('status');
            $table->string('payment_status')->default('pending')->after('payment_gateway');
        });
    }

    public function down(): void
    {
        Schema::table('crop_deals', function (Blueprint $table) {
            $table->dropColumn(['payment_gateway', 'payment_status']);
        });
    }
};
