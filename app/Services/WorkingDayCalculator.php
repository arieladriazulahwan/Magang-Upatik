<?php

namespace App\Services;

use App\Models\Holiday;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

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
        return $this->datesBetween($start, $end)->count();
    }

    /**
     * @return Collection<int, string>
     */
    public function datesBetween(Carbon|string $start, Carbon|string $end): Collection
    {
        $start = Carbon::parse($start)->startOfDay();
        $end = Carbon::parse($end)->startOfDay();

        if ($end->lt($start)) {
            return collect();
        }

        $holidayDates = Holiday::whereBetween('date', [$start->toDateString(), $end->toDateString()])
            ->pluck('date')
            ->map(fn ($d) => $d->toDateString())
            ->flip();

        $dates = collect();
        $cursor = $start->copy();

        while ($cursor->lte($end)) {
            if (! $cursor->isWeekend() && ! $holidayDates->has($cursor->toDateString())) {
                $dates->push($cursor->toDateString());
            }

            $cursor->addDay();
        }

        return $dates;
    }
}
