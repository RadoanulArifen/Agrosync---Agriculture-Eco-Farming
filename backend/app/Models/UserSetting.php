<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserSetting extends Model
{
    protected $primaryKey = 'user_id';

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = ['user_id', 'email_notifications', 'push_notifications', 'outbreak_warnings', 'urgent_advisory', 'new_case_alert'];

    protected $casts = [
        'email_notifications' => 'boolean',
        'push_notifications' => 'boolean',
        'outbreak_warnings' => 'boolean',
        'urgent_advisory' => 'boolean',
        'new_case_alert' => 'boolean',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id', 'public_id');
    }
}
