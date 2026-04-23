<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CropDeal extends Model
{
    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = ['id', 'listing_id', 'company_id', 'farmer_id', 'agreed_price', 'quantity_kg', 'commission_pct', 'commission_amt', 'status', 'confirmed_at'];

    protected $casts = [
        'agreed_price' => 'decimal:2',
        'quantity_kg' => 'integer',
        'commission_pct' => 'decimal:2',
        'commission_amt' => 'decimal:2',
        'confirmed_at' => 'datetime',
    ];

    public function listing(): BelongsTo
    {
        return $this->belongsTo(CropListing::class, 'listing_id');
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function farmer(): BelongsTo
    {
        return $this->belongsTo(Farmer::class);
    }
}
