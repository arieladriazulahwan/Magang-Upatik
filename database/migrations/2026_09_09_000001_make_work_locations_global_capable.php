<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement('ALTER TABLE work_location ALTER COLUMN work_unit_id DROP NOT NULL');
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE work_location ALTER COLUMN work_unit_id SET NOT NULL');
    }
};
