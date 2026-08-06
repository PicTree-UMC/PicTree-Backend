export const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

export interface KstDateParts {
  year: number;
  monthIndex: number;
  day: number;
}

export const toKstDateParts = (date: Date): KstDateParts => {
  const kstDate = new Date(date.getTime() + KST_OFFSET_MS);

  return {
    year: kstDate.getUTCFullYear(),
    monthIndex: kstDate.getUTCMonth(),
    day: kstDate.getUTCDate(),
  };
};

export const formatKstDate = (date: Date): string => {
  const kstDate = new Date(date.getTime() + KST_OFFSET_MS);

  return kstDate.toISOString().slice(0, 10);
};

export const formatKstDateTime = (date: Date): string => {
  const kstDate = new Date(date.getTime() + KST_OFFSET_MS);

  return kstDate.toISOString().slice(0, 19);
};

export const parseKstDateStart = (dateText: string): Date | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateText);

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day) - KST_OFFSET_MS);
  const kstParts = toKstDateParts(date);

  if (
    kstParts.year !== year ||
    kstParts.monthIndex !== month - 1 ||
    kstParts.day !== day
  ) {
    return null;
  }

  return date;
};

export const createKstMonthStart = (year: number, month: number): Date => {
  return createKstMonthlyAnchor(year, month - 1, 1);
};

export const createKstMonthlyAnchor = (
  year: number,
  monthIndex: number,
  day: number,
): Date => {
  const lastDay = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();

  return new Date(
    Date.UTC(year, monthIndex, Math.min(day, lastDay)) - KST_OFFSET_MS,
  );
};
