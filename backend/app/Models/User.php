<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    protected $fillable = [
        'public_id',
        'tenant_id',
        'role',
        'name',
        'name_bn',
        'email',
        'phone',
        'avatar',
        'division',
        'district',
        'upazila',
        'designation',
        'access_label',
        'password',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class, 'tenant_id');
    }

    public function farmerProfile(): HasOne
    {
        return $this->hasOne(Farmer::class, 'user_id', 'public_id');
    }

    public function officerProfile(): HasOne
    {
        return $this->hasOne(Officer::class, 'user_id', 'public_id');
    }

    public function vendorProfile(): HasOne
    {
        return $this->hasOne(Vendor::class, 'user_id', 'public_id');
    }

    public function companyProfile(): HasOne
    {
        return $this->hasOne(Company::class, 'user_id', 'public_id');
    }

    public function notifications(): HasMany
    {
        return $this->hasMany(Notification::class, 'user_id', 'public_id');
    }

    public function settings(): HasOne
    {
        return $this->hasOne(UserSetting::class, 'user_id', 'public_id');
    }
}
