export const WITA_TIME_ZONE = "Asia/Makassar";

export function formatWitaTime(
  value: string | Date | null | undefined,
  fallback = "--"
) {
  if (!value) {
    return fallback;
  }

  if (typeof value === "string" && /^\d{2}:\d{2}/.test(value)) {
    return value.slice(0, 5);
  }

  const date =
    value instanceof Date
      ? value
      : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return typeof value === "string"
      ? value.slice(0, 5)
      : fallback;
  }

  return date.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: WITA_TIME_ZONE,
  });
}

export function formatWitaLongDate(value: Date) {
  return value.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: WITA_TIME_ZONE,
  });
}

export function formatWitaShortWeekday(value: Date) {
  return value.toLocaleDateString("id-ID", {
    weekday: "short",
    timeZone: WITA_TIME_ZONE,
  });
}

export function formatWitaDay(value: Date) {
  return value.toLocaleDateString("id-ID", {
    day: "2-digit",
    timeZone: WITA_TIME_ZONE,
  });
}

export function formatWitaShortDate(value: Date) {
  return value.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: WITA_TIME_ZONE,
  });
}

function getWitaParts(value: Date) {
  const parts =
    new Intl.DateTimeFormat("en-CA", {
      timeZone: WITA_TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      weekday: "short",
    }).formatToParts(value);

  const getPart =
    (type: string) =>
      parts.find((item) => item.type === type)?.value || "";

  return {
    year: Number(getPart("year")),
    month: Number(getPart("month")),
    day: Number(getPart("day")),
    weekday: getPart("weekday"),
  };
}

function toDateKey(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function getWitaDateKey(value = new Date()) {
  const parts =
    getWitaParts(value);

  return toDateKey(
    parts.year,
    parts.month,
    parts.day
  );
}

export function getWitaMonthStartKey(value = new Date()) {
  const parts =
    getWitaParts(value);

  return toDateKey(
    parts.year,
    parts.month,
    1
  );
}

export function getWitaYearStartKey(value = new Date()) {
  const parts =
    getWitaParts(value);

  return toDateKey(
    parts.year,
    1,
    1
  );
}

export function getWitaWeekRangeKeys(value = new Date()) {
  const parts =
    getWitaParts(value);
  const current =
    new Date(
      Date.UTC(parts.year, parts.month - 1, parts.day)
    );
  const day =
    current.getUTCDay();
  const diff =
    day === 0 ? -6 : 1 - day;
  const start =
    new Date(current);

  start.setUTCDate(current.getUTCDate() + diff);

  const end =
    new Date(start);

  end.setUTCDate(start.getUTCDate() + 6);

  return {
    start: toDateKey(
      start.getUTCFullYear(),
      start.getUTCMonth() + 1,
      start.getUTCDate()
    ),
    end: toDateKey(
      end.getUTCFullYear(),
      end.getUTCMonth() + 1,
      end.getUTCDate()
    ),
  };
}

export function isWitaDateKeyInCurrentMonth(
  value: string | null | undefined,
  today = new Date()
) {
  if (!value) {
    return false;
  }

  const start =
    getWitaMonthStartKey(today);
  const end =
    getWitaDateKey(today);

  return value >= start && value <= end;
}

export function isWitaDateKeyToday(
  value: string | null | undefined,
  today = new Date()
) {
  if (!value) {
    return false;
  }

  return value === getWitaDateKey(today);
}

export function isWitaDateKeyInCurrentYear(
  value: string | null | undefined,
  today = new Date()
) {
  if (!value) {
    return false;
  }

  const start =
    getWitaYearStartKey(today);
  const end =
    getWitaDateKey(today);

  return value >= start && value <= end;
}

export function isWitaDateKeyInCurrentWeek(
  value: string | null | undefined,
  today = new Date()
) {
  if (!value) {
    return false;
  }

  const range =
    getWitaWeekRangeKeys(today);

  return value >= range.start && value <= range.end;
}
