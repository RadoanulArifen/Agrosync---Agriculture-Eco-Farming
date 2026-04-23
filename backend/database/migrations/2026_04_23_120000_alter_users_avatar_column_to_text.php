<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('users', 'avatar')) {
            return;
        }

        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE users ALTER COLUMN avatar TYPE TEXT');

            return;
        }

        DB::statement('ALTER TABLE users MODIFY avatar TEXT NULL');
    }

    public function down(): void
    {
        if (! Schema::hasColumn('users', 'avatar')) {
            return;
        }

        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE users ALTER COLUMN avatar TYPE VARCHAR(255)');

            return;
        }

        DB::statement('ALTER TABLE users MODIFY avatar VARCHAR(255) NULL');
    }
};
