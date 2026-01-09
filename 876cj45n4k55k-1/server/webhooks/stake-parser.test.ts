import { describe, it, expect } from 'vitest';
import {
  parseStakeFromComment,
  parseAllStakesFromComment,
  validateStake,
  STAKE_REGEX,
} from '../webhooks/stake-parser';

describe('Stake Parser', () => {
  describe('parseStakeFromComment', () => {
    it('should parse a basic stake: challenge @opponent YES ₦100', () => {
      const text = 'challenge @alice YES ₦100';
      const parsed = parseStakeFromComment(text, 'bob');

      expect(parsed).not.toBeNull();
      expect(parsed?.challenger).toBe('@bob');
      expect(parsed?.opponent).toBe('@alice');
      expect(parsed?.side).toBe('yes');
      expect(parsed?.amount).toBe(100 * 1e6); // 100 USDC in wei
      expect(parsed?.currency).toBe('USDC');
    });

    it('should parse with explicit challenger: @alice challenge @bob NO ₦50', () => {
      const text = '@alice challenge @bob NO ₦50';
      const parsed = parseStakeFromComment(text, 'unknown');

      expect(parsed?.challenger).toBe('@alice');
      expect(parsed?.opponent).toBe('@bob');
      expect(parsed?.side).toBe('no');
      expect(parsed?.amount).toBe(50 * 1e6);
    });

    it('should parse with custom token: challenge @user YES ₦100 JAN', () => {
      const text = 'challenge @user YES ₦100 JAN';
      const parsed = parseStakeFromComment(text, 'alice');

      expect(parsed?.currency).toBe('JAN');
      expect(parsed?.amount).toBe(100 * 1e18); // JAN has 18 decimals
    });

    it('should parse with settlement token: challenge @user YES ₦100 $JAN', () => {
      const text = 'challenge @user YES ₦100 USDC $JAN';
      const parsed = parseStakeFromComment(text, 'bob');

      expect(parsed?.currency).toBe('USDC');
      expect(parsed?.settlementToken).toBe('$JAN');
    });

    it('should parse without ₦ symbol: challenge @user YES 100', () => {
      const text = 'challenge @user YES 100';
      const parsed = parseStakeFromComment(text, 'alice');

      expect(parsed?.amount).toBe(100 * 1e6);
    });

    it('should parse with comma in amount: challenge @user NO ₦1,000', () => {
      const text = 'challenge @user NO ₦1,000';
      const parsed = parseStakeFromComment(text, 'bob');

      expect(parsed?.amount).toBe(1000 * 1e6);
    });

    it('should parse decimal amounts: challenge @user YES ₦100.5', () => {
      const text = 'challenge @user YES ₦100.5';
      const parsed = parseStakeFromComment(text, 'alice');

      expect(parsed?.amount).toBe(Math.round(100.5 * 1e6));
    });

    it('should handle case-insensitive YES/NO', () => {
      const text1 = 'challenge @user yes ₦100';
      const text2 = 'challenge @user no ₦100';

      const parsed1 = parseStakeFromComment(text1, 'alice');
      const parsed2 = parseStakeFromComment(text2, 'alice');

      expect(parsed1?.side).toBe('yes');
      expect(parsed2?.side).toBe('no');
    });

    it('should return null for invalid format', () => {
      const invalid = [
        'just some random text',
        'challenge without amount',
        'YES ₦100 without challenge',
      ];

      invalid.forEach(text => {
        const parsed = parseStakeFromComment(text, 'alice');
        expect(parsed).toBeNull();
      });
    });

    it('should default currency to USDC if not specified', () => {
      const text = 'challenge @user YES ₦50';
      const parsed = parseStakeFromComment(text, 'bob');

      expect(parsed?.currency).toBe('USDC');
    });

    it('should use author as challenger if not explicitly mentioned', () => {
      const text = 'challenge @alice YES ₦100';
      const parsed = parseStakeFromComment(text, 'bob');

      expect(parsed?.challenger).toBe('@bob');
    });
  });

  describe('parseAllStakesFromComment', () => {
    it('should parse multiple stakes from multi-line comment', () => {
      const text = `challenge @alice YES ₦100
challenge @bob NO ₦50`;

      const stakes = parseAllStakesFromComment(text, 'charlie');

      expect(stakes.length).toBe(2);
      expect(stakes[0].opponent).toBe('@alice');
      expect(stakes[0].side).toBe('yes');
      expect(stakes[1].opponent).toBe('@bob');
      expect(stakes[1].side).toBe('no');
    });

    it('should parse stakes mixed with other text', () => {
      const text = `Here are my bets:
challenge @alice YES ₦100
Some random text
challenge @bob NO ₦50
More text`;

      const stakes = parseAllStakesFromComment(text, 'charlie');

      expect(stakes.length).toBe(2);
    });

    it('should return empty array if no stakes found', () => {
      const text = 'Just some random comment with no stakes';
      const stakes = parseAllStakesFromComment(text, 'alice');

      expect(stakes.length).toBe(0);
    });
  });

  describe('validateStake', () => {
    it('should validate a correct stake', () => {
      const stake = {
        challenger: '@alice',
        opponent: '@bob',
        side: 'yes' as const,
        amount: 100 * 1e6,
        currency: 'USDC',
        raw: 'test',
      };

      const result = validateStake(stake);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject zero or negative amounts', () => {
      const stake = {
        challenger: '@alice',
        opponent: '@bob',
        side: 'yes' as const,
        amount: 0,
        currency: 'USDC',
        raw: 'test',
      };

      const result = validateStake(stake);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('greater than 0');
    });

    it('should reject self-challenges', () => {
      const stake = {
        challenger: '@alice',
        opponent: '@alice', // same as challenger!
        side: 'yes' as const,
        amount: 100 * 1e6,
        currency: 'USDC',
        raw: 'test',
      };

      const result = validateStake(stake);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('yourself');
    });

    it('should reject invalid side', () => {
      const stake = {
        challenger: '@alice',
        opponent: '@bob',
        side: 'invalid' as any,
        amount: 100 * 1e6,
        currency: 'USDC',
        raw: 'test',
      };

      const result = validateStake(stake);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('YES or NO');
    });

    it('should reject unsupported tokens', () => {
      const stake = {
        challenger: '@alice',
        opponent: '@bob',
        side: 'yes' as const,
        amount: 100 * 1e6,
        currency: 'INVALID_TOKEN',
        raw: 'test',
      };

      const result = validateStake(stake);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Unsupported');
    });

    it('should accept supported tokens', () => {
      const tokens = ['USDC', 'USDT', 'JAN', 'DEGEN', 'HIGHER', 'BRETT', 'VIRTUAL'];

      tokens.forEach(token => {
        const stake = {
          challenger: '@alice',
          opponent: '@bob',
          side: 'yes' as const,
          amount: 100 * 1e6,
          currency: token,
          raw: 'test',
        };

        const result = validateStake(stake);
        expect(result.valid).toBe(true);
      });
    });
  });

  describe('STAKE_REGEX', () => {
    it('should match the regex pattern', () => {
      const examples = [
        'challenge @alice YES ₦100',
        '@bob challenge @alice NO 50',
        'challenge @user YES ₦1,000.50 JAN',
        '@alice challenge @bob NO 100 USDC $JAN',
      ];

      examples.forEach(example => {
        expect(STAKE_REGEX.test(example)).toBe(true);
      });
    });

    it('should not match invalid patterns', () => {
      const invalid = [
        'just text',
        'YES ₦100 challenge',
        'challenge without opponent',
      ];

      invalid.forEach(example => {
        expect(STAKE_REGEX.test(example)).toBe(false);
      });
    });
  });
});
