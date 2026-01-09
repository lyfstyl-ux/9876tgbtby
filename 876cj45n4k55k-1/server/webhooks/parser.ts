export const BANTABRO_REGEX = /@bantabro\s+challenge\s+"([^"]+)"(?:\s+@([A-Za-z0-9_]+))?(?:\s+(YES|NO))?\s+₦?\s*([\d,]+(?:\.\d+)?)(?:\s*(USDC|USDT))?/i;

export type ParsedChallenge = {
  name: string;
  opponent: string | null;
  position: string | null; // 'YES'|'NO'|null
  isYes: boolean | null;
  amount: number; // amount in minor units (e.g., USDC has 6 decimals)
  currency: string; // 'USDC' | 'USDT'
  raw: string;
};

const TOKEN_DECIMALS: Record<string, number> = {
  USDC: 6,
  USDT: 6,
};

export function parseBantabroTag(text: string): ParsedChallenge | null {
  const match = text.match(BANTABRO_REGEX);
  if (!match) return null;
  const [, name, opponent, pos, amt, currency] = match;
  const token = (currency || 'USDC').toUpperCase();

  // parse decimal amount and scale to minor units
  const parsedFloat = parseFloat(String(amt).replace(/,/g, ''));
  const decimals = TOKEN_DECIMALS[token] ?? 6;
  const scaled = Math.round(parsedFloat * Math.pow(10, decimals));

  const position = pos ? pos.toUpperCase() : null;
  const isYes = position ? position === 'YES' : null;

  return {
    name,
    opponent: opponent ?? null,
    position,
    isYes,
    amount: scaled,
    currency: token,
    raw: match[0],
  };
}
