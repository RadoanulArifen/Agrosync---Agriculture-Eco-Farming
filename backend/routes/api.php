<?php

use App\Http\Controllers\Api\AgroSyncController;
use App\Http\Middleware\ApiCors;
use Illuminate\Support\Facades\Route;

Route::middleware(ApiCors::class)->prefix('v1')->group(function () {
    Route::options('/{any}', fn () => response('', 204))->where('any', '.*');

    Route::post('/auth/login', [AgroSyncController::class, 'login']);
    Route::post('/auth/send-otp', [AgroSyncController::class, 'sendOtp']);
    Route::post('/auth/verify-otp', [AgroSyncController::class, 'verifyOtp']);
    Route::post('/auth/register-role', [AgroSyncController::class, 'registerRoleUser']);

    Route::get('/users', [AgroSyncController::class, 'users']);
    Route::get('/farmers', [AgroSyncController::class, 'farmers']);
    Route::get('/advisory-cases', [AgroSyncController::class, 'advisoryCases']);
    Route::post('/advisory-cases', [AgroSyncController::class, 'submitAdvisory']);
    Route::post('/advisory-cases/{caseId}/respond', [AgroSyncController::class, 'respondToCase']);

    Route::get('/products', [AgroSyncController::class, 'products']);
    Route::post('/products', [AgroSyncController::class, 'createProduct']);
    Route::patch('/products/{productId}', [AgroSyncController::class, 'updateProduct']);
    Route::delete('/products/{productId}', [AgroSyncController::class, 'deleteProduct']);

    Route::get('/farmers/{farmerId}/cart', [AgroSyncController::class, 'cart']);
    Route::post('/farmers/{farmerId}/cart', [AgroSyncController::class, 'addToCart']);
    Route::patch('/farmers/{farmerId}/cart/{productId}', [AgroSyncController::class, 'updateCartItem']);
    Route::delete('/farmers/{farmerId}/cart', [AgroSyncController::class, 'clearCart']);

    Route::get('/orders', [AgroSyncController::class, 'orders']);
    Route::post('/orders', [AgroSyncController::class, 'placeOrder']);
    Route::patch('/orders/{orderId}/status', [AgroSyncController::class, 'updateOrderStatus']);

    Route::get('/crop-listings', [AgroSyncController::class, 'cropListings']);
    Route::post('/crop-listings', [AgroSyncController::class, 'createCropListing']);
    Route::post('/crop-deals/interest', [AgroSyncController::class, 'expressInterest']);
    Route::get('/crop-deals', [AgroSyncController::class, 'cropDeals']);
    Route::patch('/crop-deals/{dealId}/status', [AgroSyncController::class, 'updateDealStatus']);

    Route::get('/crop-prices', [AgroSyncController::class, 'cropPrices']);
    Route::get('/weather', [AgroSyncController::class, 'weatherForecast']);
    Route::post('/price-alerts', [AgroSyncController::class, 'subscribePriceAlert']);

    Route::get('/notifications/{userId}', [AgroSyncController::class, 'notifications']);
    Route::patch('/notifications/{notificationId}/read', [AgroSyncController::class, 'markNotificationRead']);
    Route::patch('/notifications/user/{userId}/read-all', [AgroSyncController::class, 'markAllNotificationsRead']);

    Route::get('/settings/{userId}', [AgroSyncController::class, 'settings']);
    Route::put('/settings/{userId}', [AgroSyncController::class, 'updateSettings']);

    Route::get('/admin/stats', [AgroSyncController::class, 'adminStats']);
    Route::get('/admin/tenants', [AgroSyncController::class, 'tenants']);
    Route::post('/admin/tenants', [AgroSyncController::class, 'createTenant']);
    Route::patch('/admin/tenants/{tenantId}', [AgroSyncController::class, 'updateTenant']);
    Route::get('/admin/audit-logs', [AgroSyncController::class, 'auditLogs']);
});
