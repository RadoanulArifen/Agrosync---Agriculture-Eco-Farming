<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AdvisoryMessage extends Model
{
    protected $fillable = ['case_id', 'sender_id', 'sender_role', 'message', 'attachments'];

    protected $casts = [
        'attachments' => 'array',
    ];

    public function advisoryCase(): BelongsTo
    {
        return $this->belongsTo(AdvisoryCase::class, 'case_id');
    }
}
