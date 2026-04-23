<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CropListing extends Model
{
    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = ['id', 'tenant_id', 'farmer_id', 'product_category', 'crop_type', 'variety', 'quantity_kg', 'quality_grade', 'asking_price', 'harvest_date', 'district', 'upazila', 'photos', 'status', 'matched_company_id'];

    protected $casts = [
        'quantity_kg' => 'integer',
        'asking_price' => 'decimal:2',
        'harvest_date' => 'date',
        'photos' => 'array',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function farmer(): BelongsTo
    {
        return $this->belongsTo(Farmer::class);
    }

    public function matchedCompany(): BelongsTo
    {
        return $this->belongsTo(Company::class, 'matched_company_id');
    }

    public function deals(): HasMany
    {
        return $this->hasMany(CropDeal::class, 'listing_id');
    }
}
