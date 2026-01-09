/**
 * Parser for extracting stake information from social media comments
 * Examples:
 * - "@bantabro challenge @userB YES ₦100 $JAN"
 * - "challenge @alice NO 50 USDC"
 * - "@UserA YES ₦100"
 */

export type ParsedStake = {
  challenger: string; // @username making the bet
  opponent: string; // @username being challenged
  side: 'yes' | 'no'; // 'YES' or 'NO'
  amount: number; // amount in minor units
  currency: string; // 'USDC' | 'USDT' | token symbol
  settlementToken?: string; // Optional creator coin (e.g., '$JAN')
  raw: string; // Original matched text
};

const TOKEN_DECIMALS: Record<string, number> = {
  USDC: 6,
  USDT: 6,
  JAN: 18,
  DEGEN: 18,
};

// Pattern: @username challenge @opponent YES/NO ₦amount [token] [settlement_token]
// Examples:
// - "@userA challenge @userB YES ₦100 USDC"
// - "@alice challenge @bob NO 50"
// - "@bantabro challenge @eve YES ₦100 $JAN"
export const STAKE_REGEX = /(?:@(\w+)\s+)?challenge\s+@(\w+)\s+(YES|NO)\s+₦?\s*([\d,]+(?:\.\d+)?)\s*([A-Z]{2,})?(?:\s+\$([A-Z]+))?/i;

export function parseStakeFromComment(text: string, authorUsername: string): ParsedStake | null {
  const match = text.match(STAKE_REGEX);
  if (!match) return null;

  const [, potentialChallenger, opponent, sideStr, amtStr, currency, settlementToken] = match;

  // If challenger is explicitly mentioned, use it; otherwise, use comment author
  const challenger = potentialChallenger || authorUsername;
  const side = (sideStr.toUpperCase() === 'YES' ? 'yes' : 'no') as 'yes' | 'no';
  const token = (currency || 'USDC').toUpperCase();

  // Parse amount and scale to minor units
  const parsedFloat = parseFloat(String(amtStr).replace(/,/g, ''));
  const decimals = TOKEN_DECIMALS[token] ?? 6;
  const scaled = Math.round(parsedFloat * Math.pow(10, decimals));

  return {
    challenger: `@${challenger}`,
    opponent: `@${opponent}`,
    side,
    amount: scaled,
    currency: token,
    settlementToken: settlementToken ? `$${settlementToken.toUpperCase()}` : undefined,
    raw: match[0],
  };
}

/**
 * Extract all stakes mentioned in a comment thread
 * Useful for processing multiple stakes in a single social media thread
 */
export function parseAllStakesFromComment(text: string, authorUsername: string): ParsedStake[] {
  const stakes: ParsedStake[] = [];
  const lines = text.split('\n');

  for (const line of lines) {
    const stake = parseStakeFromComment(line, authorUsername);
    if (stake) {
      stakes.push(stake);
    }
  }

  return stakes;
}

/**
 * Validate a parsed stake before creating it in the database
 */
export function validateStake(stake: ParsedStake): { valid: boolean; error?: string } {
  if (stake.amount <= 0) {
    return { valid: false, error: 'Amount must be greater than 0' };
  }

  if (stake.challenger === stake.opponent) {
    return { valid: false, error: 'Cannot challenge yourself' };
  }

  if (!['yes', 'no'].includes(stake.side)) {
    return { valid: false, error: 'Side must be YES or NO' };
  }

  const validTokens = ['USDC', 'USDT', 'JAN', 'DEGEN', 'HIGHER', 'BRETT', 'VIRTUAL'];
  if (!validTokens.includes(stake.currency)) {
    return { valid: false, error: `Unsupported token: ${stake.currency}` };
  }

  return { valid: true };
}
