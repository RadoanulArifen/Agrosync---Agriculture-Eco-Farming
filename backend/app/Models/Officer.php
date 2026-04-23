<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Officer extends Model
{
    protected $keyType = 'string';
    public $incrementing = false;
    protected $fillable = ['id', 'user_id', 'tenant_id', 'officer_id', 'specialty_tags', 'region_districts', 'max_active_cases', 'availability_status', 'active'];
    protected $casts = ['specialty_tags' => 'json', 'region_districts' => 'json', 'active' => 'boolean'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id', 'public_id');
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function advisoryCases(): HasMany
    {
        return $this->hasMany(AdvisoryCase::class);
    }
}
