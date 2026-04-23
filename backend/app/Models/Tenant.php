<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Tenant extends Model
{
    protected $keyType = 'string';
    public $incrementing = false;
    protected $fillable = ['id', 'name', 'subdomain', 'plan_tier', 'admin_user_id', 'status', 'farmer_count', 'mrr', 'configuration'];
    protected $casts = ['farmer_count' => 'integer', 'mrr' => 'decimal:2', 'configuration' => 'array'];

    public function adminUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'admin_user_id', 'public_id');
    }

    public function cooperatives(): HasMany
    {
        return $this->hasMany(Cooperative::class);
    }

    public function farmers(): HasMany
    {
        return $this->hasMany(Farmer::class);
    }

    public function officers(): HasMany
    {
        return $this->hasMany(Officer::class);
    }

    public function vendors(): HasMany
    {
        return $this->hasMany(Vendor::class);
    }

    public function companies(): HasMany
    {
        return $this->hasMany(Company::class);
    }
}
