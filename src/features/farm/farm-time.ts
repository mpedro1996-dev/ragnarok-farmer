const SAO_PAULO_OFFSET_MINUTES = -3 * 60;

type SaoPauloDateParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

export function getOperationalDate(date: Date) {
  const parts = getSaoPauloDateParts(date);

  if (parts.hour >= 4) {
    return formatOperationalDate(parts.year, parts.month, parts.day);
  }

  const previousDate = makeSaoPauloDate(parts.year, parts.month, parts.day, 0, 0, 0);
  previousDate.setUTCDate(previousDate.getUTCDate() - 1);
  const previousParts = getSaoPauloDateParts(previousDate);

  return formatOperationalDate(previousParts.year, previousParts.month, previousParts.day);
}

export function getNextAvailableAt(executedAt: Date, cooldownDays: number) {
  if (cooldownDays <= 0) {
    return null;
  }

  const operationalDate = parseOperationalDate(getOperationalDate(executedAt));

  return makeSaoPauloDate(
    operationalDate.year,
    operationalDate.month,
    operationalDate.day + cooldownDays,
    4,
    0,
    0,
  );
}

export function isCooldownActive(nextAvailableAt: Date | null, now: Date) {
  return nextAvailableAt ? nextAvailableAt.getTime() > now.getTime() : false;
}

function getSaoPauloDateParts(date: Date): SaoPauloDateParts {
  const shiftedDate = new Date(date.getTime() + SAO_PAULO_OFFSET_MINUTES * 60_000);

  return {
    year: shiftedDate.getUTCFullYear(),
    month: shiftedDate.getUTCMonth() + 1,
    day: shiftedDate.getUTCDate(),
    hour: shiftedDate.getUTCHours(),
    minute: shiftedDate.getUTCMinutes(),
    second: shiftedDate.getUTCSeconds(),
  };
}

function makeSaoPauloDate(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
) {
  return new Date(
    Date.UTC(year, month - 1, day, hour, minute, second) -
      SAO_PAULO_OFFSET_MINUTES * 60_000,
  );
}

function formatOperationalDate(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseOperationalDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);

  return { year, month, day };
}
