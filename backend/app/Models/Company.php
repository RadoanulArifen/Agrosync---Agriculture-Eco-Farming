<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Company extends Model
{
    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = ['id', 'user_id', 'tenant_id', 'company_id', 'company_name', 'registration_no', 'crop_interests'];

    protected $casts = ['crop_interests' => 'json'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id', 'public_id');
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function cropDeals(): HasMany
    {
        return $this->hasMany(CropDeal::class);
    }
}
