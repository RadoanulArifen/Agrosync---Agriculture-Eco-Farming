<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('auth_otps', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('user_id')->nullable()->index();
            $table->string('email')->index();
            $table->string('role')->nullable()->index();
            $table->string('purpose')->default('login')->index();
            $table->string('token')->unique();
            $table->string('otp_hash');
            $table->timestamp('expires_at')->index();
            $table->timestamp('consumed_at')->nullable()->index();
            $table->timestamps();
            
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('auth_otps');
    }
};
