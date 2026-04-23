<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Product extends Model
{
    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = ['id', 'tenant_id', 'vendor_id', 'name_en', 'name_bn', 'category', 'price', 'unit', 'stock_qty', 'description', 'manufacturer', 'photos', 'delivery_districts', 'estimated_delivery_days', 'rating', 'review_count', 'is_recommended'];

    protected $casts = [
        'price' => 'decimal:2',
        'stock_qty' => 'integer',
        'photos' => 'array',
        'delivery_districts' => 'array',
        'estimated_delivery_days' => 'integer',
        'rating' => 'decimal:2',
        'review_count' => 'integer',
        'is_recommended' => 'boolean',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function vendor(): BelongsTo
    {
        return $this->belongsTo(Vendor::class);
    }

    public function cartItems(): HasMany
    {
        return $this->hasMany(CartItem::class);
    }

    public function orderItems(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }
}
