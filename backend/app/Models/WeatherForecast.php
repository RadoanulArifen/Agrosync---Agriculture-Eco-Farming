<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WeatherForecast extends Model
{
    protected $fillable = ['district', 'forecast_date', 'temp_min', 'temp_max', 'rainfall', 'humidity', 'wind_speed', 'condition', 'icon', 'advisory'];

    protected $casts = [
        'forecast_date' => 'date',
        'temp_min' => 'integer',
        'temp_max' => 'integer',
        'rainfall' => 'integer',
        'humidity' => 'integer',
        'wind_speed' => 'integer',
    ];
}
