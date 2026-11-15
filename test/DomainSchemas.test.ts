import { describe, expect, it } from '@jest/globals';
import { userSchema, walletSchema } from '../src/domain/schemas';

describe('userSchema', () => {
  const ValidUser = {
    id: 'user-1',
    username: 'player',
    email: 'player@redgreen.com',
  };

  it('accepts a valid user', () => {
    expect(userSchema.safeParse(ValidUser).success).toBe(true);
  });

  it('rejects a username shorter than 3 characters', () => {
    const Result = userSchema.safeParse({ ...ValidUser, username: 'ab' });

    expect(Result.success).toBe(false);
  });

  it('rejects an invalid email', () => {
    const Result = userSchema.safeParse({ ...ValidUser, email: 'not-email' });

    expect(Result.success).toBe(false);
  });

  it('rejects a user without id', () => {
    const WithoutId = { username: 'player', email: 'player@redgreen.com' };

    expect(userSchema.safeParse(WithoutId).success).toBe(false);
  });
});

describe('walletSchema', () => {
  it('accepts a wallet with zero balance', () => {
    const Result = walletSchema.safeParse({ balance: 0, currency: 'CHIPS' });

    expect(Result.success).toBe(true);
  });

  it('rejects a negative balance', () => {
    const Result = walletSchema.safeParse({ balance: -1, currency: 'CHIPS' });

    expect(Result.success).toBe(false);
  });

  it('rejects a non numeric balance', () => {
    const Result = walletSchema.safeParse({ balance: '10', currency: 'CHIPS' });

    expect(Result.success).toBe(false);
  });

  it('rejects a wallet without currency', () => {
    expect(walletSchema.safeParse({ balance: 10 }).success).toBe(false);
  });
});
