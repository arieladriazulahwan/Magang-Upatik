<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('face_data')) {
            return;
        }

        Schema::create('face_data', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained('employee')->cascadeOnDelete();
            $table->json('embedding')->nullable();
            $table->string('reference_photo')->nullable();
            $table->float('quality')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestampTz('created_at')->useCurrent();

            $table->index('employee_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('face_data');
    }
};
