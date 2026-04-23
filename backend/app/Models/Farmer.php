<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Farmer extends Model
{
    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = ['id', 'user_id', 'tenant_id', 'fid', 'nid_hash', 'name_bn', 'name_en', 'gender', 'dob', 'division', 'district', 'upazila', 'village', 'land_size', 'crop_types', 'phone', 'emergency_contact', 'bkash_account', 'cooperative_id', 'verified', 'blocked'];

    protected $casts = ['crop_types' => 'json', 'verified' => 'boolean', 'blocked' => 'boolean', 'dob' => 'date'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id', 'public_id');
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function cooperative(): BelongsTo
    {
        return $this->belongsTo(Cooperative::class);
    }

    public function advisoryCases(): HasMany
    {
        return $this->hasMany(AdvisoryCase::class);
    }

    public function cropListings(): HasMany
    {
        return $this->hasMany(CropListing::class);
    }

    public function cart(): HasOne
    {
        return $this->hasOne(Cart::class);
    }
    

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }
}
