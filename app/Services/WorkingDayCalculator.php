<?php

namespace App\Services;

use App\Models\Holiday;
use Illuminate\Support\Carbon;

/**
 * PRD 5.10: "Perhitungan jumlah hari kerja pada pengajuan cuti otomatis
 * mengecualikan akhir pekan dan hari libur." Dipakai juga untuk WFH agar
 * kuota "X hari/bulan" dihitung dalam satuan yang sama (hari kerja efektif,
 * bukan hari kalender) — perluasan yang konsisten, bukan aturan baru,
 * karena PRD 5.5 tidak menyebutkan satuan sendiri utk kuota WFH.
 */
class WorkingDayCalculator
{
    public function countBetween(Carbon|string $start, Carbon|string $end): int
    {
        $start = Carbon::parse($start)->startOfDay();
        $end = Carbon::parse($end)->startOfDay();

        if ($end->lt($start)) {
            return 0;
        }

        $holidayDates = Holiday::whereBetween('date', [$start->toDateString(), $end->toDateString()])
            ->pluck('date')
            ->map(fn ($d) => $d->toDateString())
            ->flip();

        $count = 0;
        $cursor = $start->copy();

        while ($cursor->lte($end)) {
            if (! $cursor->isWeekend() && ! $holidayDates->has($cursor->toDateString())) {
                $count++;
            }

            $cursor->addDay();
        }

        return $count;
    }
}