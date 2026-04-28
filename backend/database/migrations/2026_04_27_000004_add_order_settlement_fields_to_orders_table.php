<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table): void {
            if (! Schema::hasColumn('orders', 'settlement_status')) {
                $table->string('settlement_status')->default('held')->after('payment_status')->index();
            }

            if (! Schema::hasColumn('orders', 'settlement_released_at')) {
                $table->timestamp('settlement_released_at')->nullable()->after('delivered_at');
            }

            if (! Schema::hasColumn('orders', 'settlement_released_by')) {
                $table->string('settlement_released_by')->nullable()->after('settlement_released_at');
            }
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table): void {
            $drop = [];

            if (Schema::hasColumn('orders', 'settlement_status')) {
                $drop[] = 'settlement_status';
            }
            if (Schema::hasColumn('orders', 'settlement_released_at')) {
                $drop[] = 'settlement_released_at';
            }
            if (Schema::hasColumn('orders', 'settlement_released_by')) {
                $drop[] = 'settlement_released_by';
            }

            if ($drop !== []) {
                $table->dropColumn($drop);
            }
        });
    }
};

