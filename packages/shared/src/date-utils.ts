const dateOnlyPattern = /^(\d{4})-(\d{2})-(\d{2})$/;

export const koreaDateEndOfDayTime = (value: string | undefined): number | undefined => {
  if (!value) return undefined;
  const dateOnlyMatch = value.match(dateOnlyPattern);
  const normalized = dateOnlyMatch ? `${value}T23:59:59+09:00` : value;
  const time = new Date(normalized).getTime();
  return Number.isNaN(time) ? undefined : time;
};

export const koreaDateStartOfDayTime = (value: string | undefined): number | undefined => {
  if (!value) return undefined;
  const dateOnlyMatch = value.match(dateOnlyPattern);
  const normalized = dateOnlyMatch ? `${value}T00:00:00+09:00` : value;
  const time = new Date(normalized).getTime();
  return Number.isNaN(time) ? undefined : time;
};

export const isPastKoreaDate = (value: string | undefined, now = Date.now()): boolean => {
  const time = koreaDateEndOfDayTime(value);
  return time !== undefined && time < now;
};

export const deriveSpaceProgramStatus = (
  deadline: string | undefined,
  fallback: "active" | "closed" | "cancelled" | "stale" = "stale",
  now = Date.now()
): "active" | "closed" | "cancelled" | "stale" => {
  if (fallback === "cancelled") return "cancelled";
  const time = koreaDateEndOfDayTime(deadline);
  if (time === undefined) return "stale";
  return time < now ? "closed" : "active";
};
