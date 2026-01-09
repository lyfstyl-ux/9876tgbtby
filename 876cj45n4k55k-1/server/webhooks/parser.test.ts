import { describe, it, expect } from 'vitest';
import { parseBantabroTag } from './parser';

describe('parseBantabroTag', () => {
  it('parses full tag with opponent, position, and USDC currency', () => {
    const text = '@bantabro challenge "MUTED LOSE TODAY" @jack YES 10,000 USDC';
    const parsed = parseBantabroTag(text);
    expect(parsed).not.toBeNull();
    expect(parsed).toMatchObject({
      name: 'MUTED LOSE TODAY',
      opponent: 'jack',
      position: 'YES',
      isYes: true,
      amount: 10000 * Math.pow(10, 6),
      currency: 'USDC',
    });
  });

  it('parses open challenge without opponent and defaults to USDC', () => {
    const text = '@bantabro challenge "FIRST TO 10K STEPS" YES 20,000';
    const parsed = parseBantabroTag(text);
    expect(parsed).not.toBeNull();
    expect(parsed).toMatchObject({
      name: 'FIRST TO 10K STEPS',
      opponent: null,
      position: 'YES',
      isYes: true,
      amount: 20000 * Math.pow(10, 6),
      currency: 'USDC',
    });
  });

  it('parses USDT currency', () => {
    const text = '@bantabro challenge "OPEN CHALLENGE" @tosin 5,000 USDT';
    const parsed = parseBantabroTag(text);
    expect(parsed).not.toBeNull();
    expect(parsed).toMatchObject({
      name: 'OPEN CHALLENGE',
      opponent: 'tosin',
      position: null,
      isYes: null,
      amount: 5000 * Math.pow(10, 6),
      currency: 'USDT',
    });
  });

  it('returns null for non-matching text', () => {
    const text = 'this is just a normal cast';
    expect(parseBantabroTag(text)).toBeNull();
  });
});
