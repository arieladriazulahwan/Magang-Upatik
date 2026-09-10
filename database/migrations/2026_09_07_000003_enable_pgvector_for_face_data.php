<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement('CREATE EXTENSION IF NOT EXISTS vector');

        DB::statement(<<<'SQL'
            ALTER TABLE face_data
            ALTER COLUMN embedding DROP NOT NULL,
            ALTER COLUMN embedding TYPE vector(512) USING NULL
        SQL);
    }

    public function down(): void
    {
        DB::statement(<<<'SQL'
            ALTER TABLE face_data
            ALTER COLUMN embedding TYPE json USING NULL,
            ALTER COLUMN embedding DROP NOT NULL
        SQL);
    }
};
