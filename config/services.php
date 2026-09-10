<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'face' => [
        'url' => env('FACE_SERVICE_URL', 'http://127.0.0.1:9000'),
        'threshold' => env('FACE_SIMILARITY_THRESHOLD', 0.75),
        'timeout' => env('FACE_SERVICE_TIMEOUT', 15),
        'connect_timeout' => env('FACE_SERVICE_CONNECT_TIMEOUT', 5),
        'embedding_dim' => env('FACE_EMBEDDING_DIM', 512),
        'enroll_photos_field' => env('FACE_ENROLL_PHOTOS_FIELD', 'photos'),
        'verify_photo_field' => env('FACE_VERIFY_PHOTO_FIELD', 'photo'),
        'verify_embeddings_field' => env('FACE_VERIFY_EMBEDDINGS_FIELD', 'embeddings_json'),
        'verify_threshold_field' => env('FACE_VERIFY_THRESHOLD_FIELD', 'threshold'),
        'liveness_required' => env('FACE_LIVENESS_REQUIRED', true),
        'enroll_require_quality' => env('FACE_ENROLL_REQUIRE_QUALITY', true),
        'enroll_min_quality' => env('FACE_ENROLL_MIN_QUALITY', 0.65),
        'enroll_require_single_face' => env('FACE_ENROLL_REQUIRE_SINGLE_FACE', true),
        'enroll_min_samples' => env('FACE_ENROLL_MIN_SAMPLES', 5),
        'enroll_required_poses' => env('FACE_ENROLL_REQUIRED_POSES', ''),
    ],

    'google_calendar' => [
        'enabled' => env('GOOGLE_CALENDAR_ENABLED', true),
        'credentials_path' => env('GOOGLE_CALENDAR_CREDENTIALS_PATH'),
        'default_calendar_id' => env('GOOGLE_CALENDAR_DEFAULT_ID'),
        'default_timezone' => env('GOOGLE_CALENDAR_TIMEZONE', 'Asia/Makassar'),
        'token_cache_seconds' => env('GOOGLE_CALENDAR_TOKEN_CACHE_SECONDS', 3300),
        'timeout' => env('GOOGLE_CALENDAR_TIMEOUT', 15),
        'connect_timeout' => env('GOOGLE_CALENDAR_CONNECT_TIMEOUT', 5),
    ],

];
