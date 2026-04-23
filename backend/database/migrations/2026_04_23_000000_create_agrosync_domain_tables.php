<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (! Schema::hasColumn('users', 'public_id')) {
                $table->string('public_id')->nullable()->unique()->after('id');
            }

            if (! Schema::hasColumn('users', 'tenant_id')) {
                $table->string('tenant_id')->nullable()->index()->after('public_id');
            }

            if (! Schema::hasColumn('users', 'role')) {
                $table->string('role')->default('farmer')->index()->after('tenant_id');
            }

            if (! Schema::hasColumn('users', 'name_bn')) {
                $table->string('name_bn')->nullable()->after('name');
            }

            if (! Schema::hasColumn('users', 'phone')) {
                $table->string('phone')->nullable()->index()->after('email');
            }

            if (! Schema::hasColumn('users', 'avatar')) {
                $table->text('avatar')->nullable()->after('phone');
            }

            if (! Schema::hasColumn('users', 'division')) {
                $table->string('division')->nullable();
            }

            if (! Schema::hasColumn('users', 'district')) {
                $table->string('district')->nullable()->index();
            }

            if (! Schema::hasColumn('users', 'upazila')) {
                $table->string('upazila')->nullable();
            }

            if (! Schema::hasColumn('users', 'designation')) {
                $table->string('designation')->nullable();
            }

            if (! Schema::hasColumn('users', 'access_label')) {
                $table->string('access_label')->nullable();
            }
        });

        Schema::create('tenants', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('name');
            $table->string('subdomain')->unique();
            $table->string('plan_tier')->default('basic');
            $table->string('admin_user_id')->nullable();
            $table->string('status')->default('trial')->index();
            $table->unsignedInteger('farmer_count')->default(0);
            $table->decimal('mrr', 12, 2)->default(0);
            $table->json('configuration')->nullable();
            $table->timestamps();
        });

        Schema::create('cooperatives', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('tenant_id')->index();
            $table->string('name');
            $table->string('leader_id')->nullable()->index();
            $table->timestamps();
            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
        });

        Schema::create('farmers', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('user_id')->unique();
            $table->string('tenant_id')->index();
            $table->string('fid')->unique();
            $table->string('nid_hash')->index();
            $table->string('name_bn')->nullable();
            $table->string('name_en');
            $table->string('gender')->nullable();
            $table->date('dob')->nullable();
            $table->string('division')->nullable();
            $table->string('district')->index();
            $table->string('upazila')->nullable();
            $table->string('village')->nullable();
            $table->decimal('land_size', 10, 2)->default(0);
            $table->json('crop_types')->nullable();
            $table->string('phone')->index();
            $table->string('emergency_contact')->nullable();
            $table->string('bkash_account')->nullable();
            $table->string('cooperative_id')->nullable()->index();
            $table->boolean('verified')->default(false);
            $table->boolean('blocked')->default(false);
            $table->timestamps();
            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
            $table->foreign('cooperative_id')->references('id')->on('cooperatives')->nullOnDelete();
        });

        Schema::create('officers', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('user_id')->unique();
            $table->string('tenant_id')->index();
            $table->string('officer_id')->unique();
            $table->json('specialty_tags')->nullable();
            $table->json('region_districts')->nullable();
            $table->unsignedInteger('max_active_cases')->default(20);
            $table->string('availability_status')->default('available');
            $table->boolean('active')->default(true);
            $table->timestamps();
            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
        });

        Schema::create('vendors', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('user_id')->unique();
            $table->string('tenant_id')->index();
            $table->string('vendor_id')->unique();
            $table->string('company_name');
            $table->json('delivery_districts')->nullable();
            $table->string('status')->default('pending')->index();
            $table->timestamps();
            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
        });

        Schema::create('companies', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('user_id')->unique();
            $table->string('tenant_id')->index();
            $table->string('company_id')->unique();
            $table->string('company_name');
            $table->string('registration_no')->unique();
            $table->json('crop_interests')->nullable();
            $table->timestamps();
            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
        });

        Schema::create('advisory_cases', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('tenant_id')->index();
            $table->string('farmer_id')->index();
            $table->string('officer_id')->nullable()->index();
            $table->string('crop_type')->index();
            $table->text('description');
            $table->json('photos')->nullable();
            $table->string('status')->default('pending')->index();
            $table->text('ai_diagnosis')->nullable();
            $table->unsignedTinyInteger('ai_confidence')->nullable();
            $table->text('officer_response')->nullable();
            $table->text('internal_note')->nullable();
            $table->text('overridden_diagnosis')->nullable();
            $table->timestamp('responded_at')->nullable();
            $table->timestamp('resolved_at')->nullable();
            $table->timestamps();
            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
            $table->foreign('farmer_id')->references('id')->on('farmers')->cascadeOnDelete();
            $table->foreign('officer_id')->references('id')->on('officers')->nullOnDelete();
        });

        Schema::create('advisory_messages', function (Blueprint $table) {
            $table->id();
            $table->string('case_id')->index();
            $table->string('sender_id')->nullable()->index();
            $table->string('sender_role')->nullable();
            $table->text('message');
            $table->json('attachments')->nullable();
            $table->timestamps();
            $table->foreign('case_id')->references('id')->on('advisory_cases')->cascadeOnDelete();
        });

        Schema::create('advisory_escalations', function (Blueprint $table) {
            $table->id();
            $table->string('case_id')->index();
            $table->string('from_officer')->nullable()->index();
            $table->string('to_officer')->nullable()->index();
            $table->text('reason')->nullable();
            $table->timestamp('escalated_at')->nullable();
            $table->timestamps();
            $table->foreign('case_id')->references('id')->on('advisory_cases')->cascadeOnDelete();
        });

        Schema::create('products', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('tenant_id')->index();
            $table->string('vendor_id')->index();
            $table->string('name_en');
            $table->string('name_bn')->nullable();
            $table->string('category')->index();
            $table->decimal('price', 12, 2);
            $table->string('unit');
            $table->unsignedInteger('stock_qty')->default(0);
            $table->text('description')->nullable();
            $table->string('manufacturer')->nullable();
            $table->json('photos')->nullable();
            $table->json('delivery_districts')->nullable();
            $table->unsignedInteger('estimated_delivery_days')->default(3);
            $table->decimal('rating', 3, 2)->default(0);
            $table->unsignedInteger('review_count')->default(0);
            $table->boolean('is_recommended')->default(false);
            $table->timestamps();
            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
            $table->foreign('vendor_id')->references('id')->on('vendors')->cascadeOnDelete();
        });

        Schema::create('carts', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('farmer_id')->unique();
            $table->timestamps();
            $table->foreign('farmer_id')->references('id')->on('farmers')->cascadeOnDelete();
        });

        Schema::create('cart_items', function (Blueprint $table) {
            $table->id();
            $table->string('cart_id')->index();
            $table->string('product_id')->index();
            $table->unsignedInteger('quantity')->default(1);
            $table->timestamps();
            $table->unique(['cart_id', 'product_id']);
            $table->foreign('cart_id')->references('id')->on('carts')->cascadeOnDelete();
            $table->foreign('product_id')->references('id')->on('products')->cascadeOnDelete();
        });

        Schema::create('orders', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('tenant_id')->index();
            $table->string('farmer_id')->index();
            $table->string('vendor_id')->index();
            $table->string('status')->default('pending')->index();
            $table->decimal('total_amount', 12, 2)->default(0);
            $table->string('payment_gateway')->default('cod');
            $table->string('payment_status')->default('pending');
            $table->string('txn_ref')->nullable()->index();
            $table->date('estimated_delivery')->nullable();
            $table->timestamp('placed_at')->nullable();
            $table->timestamp('delivered_at')->nullable();
            $table->timestamps();
            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
            $table->foreign('farmer_id')->references('id')->on('farmers')->cascadeOnDelete();
            $table->foreign('vendor_id')->references('id')->on('vendors')->cascadeOnDelete();
        });

        Schema::create('order_items', function (Blueprint $table) {
            $table->id();
            $table->string('order_id')->index();
            $table->string('product_id')->index();
            $table->string('product_name');
            $table->unsignedInteger('quantity');
            $table->decimal('price', 12, 2);
            $table->string('unit');
            $table->timestamps();
            $table->unique(['order_id', 'product_id']);
            $table->foreign('order_id')->references('id')->on('orders')->cascadeOnDelete();
            $table->foreign('product_id')->references('id')->on('products')->cascadeOnDelete();
        });

        Schema::create('order_status_history', function (Blueprint $table) {
            $table->id();
            $table->string('order_id')->index();
            $table->string('status');
            $table->string('changed_by')->nullable();
            $table->timestamps();
            $table->foreign('order_id')->references('id')->on('orders')->cascadeOnDelete();
        });

        Schema::create('crop_listings', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('tenant_id')->index();
            $table->string('farmer_id')->index();
            $table->string('product_category')->nullable();
            $table->string('crop_type')->index();
            $table->string('variety')->nullable();
            $table->unsignedInteger('quantity_kg');
            $table->string('quality_grade')->default('A');
            $table->decimal('asking_price', 12, 2);
            $table->date('harvest_date')->nullable();
            $table->string('district')->index();
            $table->string('upazila')->nullable();
            $table->json('photos')->nullable();
            $table->string('status')->default('active')->index();
            $table->string('matched_company_id')->nullable()->index();
            $table->timestamps();
            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
            $table->foreign('farmer_id')->references('id')->on('farmers')->cascadeOnDelete();
        });

        Schema::create('crop_deals', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('listing_id')->index();
            $table->string('company_id')->index();
            $table->string('farmer_id')->index();
            $table->decimal('agreed_price', 12, 2);
            $table->unsignedInteger('quantity_kg');
            $table->decimal('commission_pct', 5, 2)->default(3);
            $table->decimal('commission_amt', 12, 2)->default(0);
            $table->string('status')->default('pending')->index();
            $table->timestamp('confirmed_at')->nullable();
            $table->timestamps();
            $table->foreign('listing_id')->references('id')->on('crop_listings')->cascadeOnDelete();
            $table->foreign('company_id')->references('id')->on('companies')->cascadeOnDelete();
            $table->foreign('farmer_id')->references('id')->on('farmers')->cascadeOnDelete();
        });

        Schema::create('crop_prices', function (Blueprint $table) {
            $table->id();
            $table->string('crop_type')->index();
            $table->decimal('current_price', 12, 2);
            $table->string('unit')->default('kg');
            $table->decimal('change_7d', 12, 2)->default(0);
            $table->decimal('change_percent', 8, 2)->default(0);
            $table->string('trend')->default('stable');
            $table->json('history')->nullable();
            $table->timestamps();
            $table->unique('crop_type');
        });

        Schema::create('price_alerts', function (Blueprint $table) {
            $table->id();
            $table->string('farmer_id')->index();
            $table->string('crop_type')->index();
            $table->decimal('target_price', 12, 2)->nullable();
            $table->boolean('active')->default(true);
            $table->timestamps();
            $table->foreign('farmer_id')->references('id')->on('farmers')->cascadeOnDelete();
        });

        Schema::create('weather_forecasts', function (Blueprint $table) {
            $table->id();
            $table->string('district')->index();
            $table->date('forecast_date')->index();
            $table->integer('temp_min')->default(0);
            $table->integer('temp_max')->default(0);
            $table->integer('rainfall')->default(0);
            $table->integer('humidity')->default(0);
            $table->integer('wind_speed')->default(0);
            $table->string('condition')->default('Clear Sky');
            $table->string('icon')->default('sun');
            $table->text('advisory')->nullable();
            $table->timestamps();
            $table->unique(['district', 'forecast_date']);
        });

        Schema::create('notifications', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('user_id')->index();
            $table->string('type')->index();
            $table->string('title');
            $table->text('message');
            $table->json('channel')->nullable();
            $table->boolean('is_read')->default(false);
            $table->timestamps();
        });

        Schema::create('user_settings', function (Blueprint $table) {
            $table->string('user_id')->primary();
            $table->boolean('email_notifications')->default(true);
            $table->boolean('push_notifications')->default(true);
            $table->boolean('outbreak_warnings')->default(true);
            $table->boolean('urgent_advisory')->default(true);
            $table->boolean('new_case_alert')->default(true);
            $table->timestamps();
        });

        Schema::create('invoices', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('tenant_id')->nullable()->index();
            $table->string('farmer_id')->nullable()->index();
            $table->string('type')->index();
            $table->decimal('amount', 12, 2);
            $table->date('due_date')->nullable();
            $table->string('status')->default('pending')->index();
            $table->timestamp('generated_at')->nullable();
            $table->timestamps();
        });

        Schema::create('payments', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('invoice_id')->index();
            $table->decimal('amount', 12, 2);
            $table->string('status')->default('pending')->index();
            $table->string('idempotency_key')->unique();
            $table->timestamp('paid_at')->nullable();
            $table->timestamps();
            $table->foreign('invoice_id')->references('id')->on('invoices')->cascadeOnDelete();
        });

        Schema::create('audit_logs', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('entity')->index();
            $table->string('action')->index();
            $table->string('actor');
            $table->text('details');
            $table->timestamps();
        });

        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE tenants ENABLE ROW LEVEL SECURITY');
            DB::statement('ALTER TABLE farmers ENABLE ROW LEVEL SECURITY');
            DB::statement('ALTER TABLE advisory_cases ENABLE ROW LEVEL SECURITY');
            DB::statement('ALTER TABLE products ENABLE ROW LEVEL SECURITY');
            DB::statement('ALTER TABLE orders ENABLE ROW LEVEL SECURITY');
            DB::statement('ALTER TABLE crop_listings ENABLE ROW LEVEL SECURITY');
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
        Schema::dropIfExists('payments');
        Schema::dropIfExists('invoices');
        Schema::dropIfExists('user_settings');
        Schema::dropIfExists('notifications');
        Schema::dropIfExists('weather_forecasts');
        Schema::dropIfExists('price_alerts');
        Schema::dropIfExists('crop_prices');
        Schema::dropIfExists('crop_deals');
        Schema::dropIfExists('crop_listings');
        Schema::dropIfExists('order_status_history');
        Schema::dropIfExists('order_items');
        Schema::dropIfExists('orders');
        Schema::dropIfExists('cart_items');
        Schema::dropIfExists('carts');
        Schema::dropIfExists('products');
        Schema::dropIfExists('advisory_escalations');
        Schema::dropIfExists('advisory_messages');
        Schema::dropIfExists('advisory_cases');
        Schema::dropIfExists('companies');
        Schema::dropIfExists('vendors');
        Schema::dropIfExists('officers');
        Schema::dropIfExists('farmers');
        Schema::dropIfExists('cooperatives');
        Schema::dropIfExists('tenants');

        Schema::table('users', function (Blueprint $table) {
            foreach (['access_label', 'designation', 'upazila', 'district', 'division', 'avatar', 'phone', 'name_bn', 'role', 'tenant_id', 'public_id'] as $column) {
                if (Schema::hasColumn('users', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
