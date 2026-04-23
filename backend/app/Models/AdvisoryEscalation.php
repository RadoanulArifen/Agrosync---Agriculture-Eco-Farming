<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AdvisoryEscalation extends Model
{
    protected $fillable = ['case_id', 'from_officer', 'to_officer', 'reason', 'escalated_at'];

    protected $casts = [
        'escalated_at' => 'datetime',
    ];

    public function advisoryCase(): BelongsTo
    {
        return $this->belongsTo(AdvisoryCase::class, 'case_id');
    }
}
