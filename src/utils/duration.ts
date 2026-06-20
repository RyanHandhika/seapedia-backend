const UNIT_MS = {
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
} as const;

export function parseDurationMs(input: string): number {
  const match = /^(\d+)(s|m|h|d)$/.exec(input.trim());

  if (!match) {
    throw new Error(`Invalid duration string: ${input}`);
  }

  const amount = Number(match[1]);
  const unit = match[2] as keyof typeof UNIT_MS;

  return amount * UNIT_MS[unit];
}
