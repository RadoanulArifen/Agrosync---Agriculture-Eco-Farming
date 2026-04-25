<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AdvisoryCase extends Model
{
    protected $keyType = 'string';

    public $incrementing = false;

    protected $table = 'advisory_cases';

    protected $fillable = ['id', 'tenant_id', 'farmer_id', 'farmer_division', 'farmer_district', 'farmer_upazila', 'officer_id', 'crop_type', 'description', 'photos', 'status', 'priority', 'ai_diagnosis', 'ai_confidence', 'officer_response', 'internal_note', 'overridden_diagnosis', 'responded_at', 'resolved_at'];

    protected $casts = ['photos' => 'json', 'responded_at' => 'datetime', 'resolved_at' => 'datetime'];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function farmer(): BelongsTo
    {
        return $this->belongsTo(Farmer::class);
    }

    public function officer(): BelongsTo
    {
        return $this->belongsTo(Officer::class);
    }

    public function messages(): HasMany
    {
        return $this->hasMany(AdvisoryMessage::class, 'case_id');
    }

    public function escalations(): HasMany
    {
        return $this->hasMany(AdvisoryEscalation::class, 'case_id');
    }
}
