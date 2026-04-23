<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CropPrice extends Model
{
    protected $fillable = ['crop_type', 'current_price', 'unit', 'change_7d', 'change_percent', 'trend', 'history'];

    protected $casts = [
        'current_price' => 'decimal:2',
        'change_7d' => 'decimal:2',
        'change_percent' => 'decimal:2',
        'history' => 'array',
    ];
}
