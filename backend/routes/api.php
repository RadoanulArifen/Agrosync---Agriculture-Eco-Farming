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
    Route::patch('/users/{userId}', [AgroSyncController::class, 'updateUserProfile']);
    Route::patch('/users/{userId}/password', [AgroSyncController::class, 'changePassword']);
    Route::delete('/users/{userId}', [AgroSyncController::class, 'deleteUserAccount']);
    Route::get('/farmers', [AgroSyncController::class, 'farmers']);
    Route::get('/advisory-cases', [AgroSyncController::class, 'advisoryCases']);
    Route::post('/advisory-cases', [AgroSyncController::class, 'submitAdvisory']);
    Route::post('/advisory-cases/{caseId}/respond', [AgroSyncController::class, 'respondToCase']);
    Route::get('/advisory-cases/regional/stats', [AgroSyncController::class, 'regionalAdvisoryStats']);

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
    Route::patch('/crop-listings/{listingId}', [AgroSyncController::class, 'updateCropListing']);
    Route::delete('/crop-listings/{listingId}', [AgroSyncController::class, 'deleteCropListing']);
    Route::post('/crop-deals/interest', [AgroSyncController::class, 'expressInterest']);
    Route::get('/crop-deals', [AgroSyncController::class, 'cropDeals']);
    Route::patch('/crop-deals/{dealId}/status', [AgroSyncController::class, 'updateDealStatus']);
    Route::post('/payments/sslcommerz/initiate', [AgroSyncController::class, 'initiateSslCommerzPayment']);
    Route::get('/payments/sslcommerz/mock-gateway', [AgroSyncController::class, 'sslCommerzMockGateway']);
    Route::match(['get', 'post'], '/payments/sslcommerz/success', [AgroSyncController::class, 'sslCommerzSuccess']);
    Route::match(['get', 'post'], '/payments/sslcommerz/fail', [AgroSyncController::class, 'sslCommerzFail']);
    Route::match(['get', 'post'], '/payments/sslcommerz/cancel', [AgroSyncController::class, 'sslCommerzCancel']);
    Route::post('/payments/stripe/initiate', [AgroSyncController::class, 'initiateStripePayment']);
    Route::get('/payments/stripe/mock-gateway', [AgroSyncController::class, 'stripeMockGateway']);
    Route::match(['get', 'post'], '/payments/stripe/success', [AgroSyncController::class, 'stripeSuccess']);
    Route::match(['get', 'post'], '/payments/stripe/fail', [AgroSyncController::class, 'stripeFail']);
    Route::match(['get', 'post'], '/payments/stripe/cancel', [AgroSyncController::class, 'stripeCancel']);
    Route::post('/payments/orders/stripe/initiate', [AgroSyncController::class, 'initiateOrderStripePayment']);
    Route::get('/payments/orders/stripe/mock-gateway', [AgroSyncController::class, 'orderStripeMockGateway']);
    Route::match(['get', 'post'], '/payments/orders/stripe/success', [AgroSyncController::class, 'orderStripeSuccess']);
    Route::match(['get', 'post'], '/payments/orders/stripe/fail', [AgroSyncController::class, 'orderStripeFail']);
    Route::match(['get', 'post'], '/payments/orders/stripe/cancel', [AgroSyncController::class, 'orderStripeCancel']);

    Route::get('/crop-prices', [AgroSyncController::class, 'cropPrices']);
    Route::get('/weather', [AgroSyncController::class, 'weatherForecast']);
    Route::post('/price-alerts', [AgroSyncController::class, 'subscribePriceAlert']);

    Route::get('/notifications/{userId}', [AgroSyncController::class, 'notifications']);
    Route::patch('/notifications/{notificationId}/read', [AgroSyncController::class, 'markNotificationRead']);
    Route::patch('/notifications/user/{userId}/read-all', [AgroSyncController::class, 'markAllNotificationsRead']);

    Route::get('/settings/{userId}', [AgroSyncController::class, 'settings']);
    Route::put('/settings/{userId}', [AgroSyncController::class, 'updateSettings']);

    Route::get('/admin/stats', [AgroSyncController::class, 'adminStats']);
    Route::patch('/admin/farmers/{farmerId}/state', [AgroSyncController::class, 'updateFarmerAdminState']);
    Route::patch('/admin/officers/{officerId}/state', [AgroSyncController::class, 'updateOfficerAdminState']);
    Route::get('/admin/orders', [AgroSyncController::class, 'adminOrders']);
    Route::patch('/admin/orders/{orderId}/settlement', [AgroSyncController::class, 'updateOrderSettlement']);
    Route::get('/admin/tenants', [AgroSyncController::class, 'tenants']);
    Route::post('/admin/tenants', [AgroSyncController::class, 'createTenant']);
    Route::patch('/admin/tenants/{tenantId}', [AgroSyncController::class, 'updateTenant']);
    Route::get('/admin/audit-logs', [AgroSyncController::class, 'auditLogs']);
});
