import { describe, it, expect, vi, afterEach } from 'vitest';
import { generatePairs, generatePairsByLevel, generateRounds } from './pairing';
import type { Person } from '../types';

const leader = (id: string, level = 'Newcomer'): Person => ({
  id,
  name: `Leader ${id}`,
  role: 'leader',
  level,
});
const follower = (id: string, level = 'Newcomer'): Person => ({
  id,
  name: `Follower ${id}`,
  role: 'follower',
  level,
});

describe('generatePairs', () => {
  it('returns empty when leaders is empty', () => {
    expect(generatePairs([], [follower('a')])).toEqual([]);
  });

  it('returns empty when followers is empty', () => {
    expect(generatePairs([leader('a')], [])).toEqual([]);
  });

  it('pairs equal counts', () => {
    const pairs = generatePairs([leader('a'), leader('b')], [follower('x'), follower('y')]);
    expect(pairs).toHaveLength(2);
  });

  it('handles more leaders than followers', () => {
    const pairs = generatePairs(
      [leader('a'), leader('b'), leader('c')],
      [follower('x'), follower('y')],
    );
    expect(pairs).toHaveLength(3);
  });

  it('handles more followers than leaders', () => {
    const pairs = generatePairs(
      [leader('a'), leader('b')],
      [follower('x'), follower('y'), follower('z')],
    );
    expect(pairs).toHaveLength(3);
  });

  it('every leader and follower appears at least once', () => {
    const leaders = [leader('a'), leader('b'), leader('c')];
    const followers = [follower('x'), follower('y')];
    const pairs = generatePairs(leaders, followers);
    const usedLeaderIds = new Set(pairs.map((p) => p.leader.id));
    const usedFollowerIds = new Set(pairs.map((p) => p.follower.id));
    leaders.forEach((l) => expect(usedLeaderIds.has(l.id)).toBe(true));
    followers.forEach((f) => expect(usedFollowerIds.has(f.id)).toBe(true));
  });
});

describe('generatePairsByLevel', () => {
  const levels = ['Newcomer', 'Intermediate', 'Advanced'];

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns empty when leaders is empty', () => {
    expect(generatePairsByLevel([], [follower('a')], levels)).toEqual([]);
  });

  it('returns empty when followers is empty', () => {
    expect(generatePairsByLevel([leader('a')], [], levels)).toEqual([]);
  });

  it('pairs dancers of the same level together', () => {
    const leaders = [leader('a', 'Newcomer'), leader('b', 'Advanced')];
    const followers = [follower('x', 'Newcomer'), follower('y', 'Advanced')];
    const pairs = generatePairsByLevel(leaders, followers, levels);

    expect(pairs).toHaveLength(2);
    const newcomerPair = pairs.find((p) => p.leader.id === 'a');
    expect(newcomerPair?.follower.id).toBe('x');
    const advancedPair = pairs.find((p) => p.leader.id === 'b');
    expect(advancedPair?.follower.id).toBe('y');
  });

  it('falls back to closest-level pairing when no exact match', () => {
    const leaders = [leader('a', 'Newcomer')];
    const followers = [follower('x', 'Advanced')];
    const pairs = generatePairsByLevel(leaders, followers, levels);

    expect(pairs).toHaveLength(1);
    expect(pairs[0].leader.id).toBe('a');
    expect(pairs[0].follower.id).toBe('x');
  });

  it('picks closest level when exact match unavailable', () => {
    // 1 leader (Intermediate), 2 followers (Newcomer, Advanced) — leader dances twice
    const leaders = [leader('a', 'Intermediate')];
    const followers = [follower('x', 'Newcomer'), follower('y', 'Advanced')];
    const pairs = generatePairsByLevel(leaders, followers, levels);
    expect(pairs).toHaveLength(2);
    expect(pairs.every((p) => p.leader.id === 'a')).toBe(true);
    const usedFollowerIds = new Set(pairs.map((p) => p.follower.id));
    expect(usedFollowerIds.has('x')).toBe(true);
    expect(usedFollowerIds.has('y')).toBe(true);
  });

  it('leaves extra dancers from uneven levels and pairs them', () => {
    const leaders = [leader('a', 'Newcomer'), leader('b', 'Newcomer')];
    const followers = [follower('x', 'Newcomer'), follower('y', 'Advanced')];
    const pairs = generatePairsByLevel(leaders, followers, levels);

    expect(pairs).toHaveLength(2);
    const allLeaderIds = new Set(pairs.map((p) => p.leader.id));
    const allFollowerIds = new Set(pairs.map((p) => p.follower.id));
    expect(allLeaderIds.has('a') || allLeaderIds.has('b')).toBe(true);
    expect(allFollowerIds.has('x')).toBe(true);
    expect(allFollowerIds.has('y')).toBe(true);
  });

  it('generates max pairs when followers outnumber leaders (all same level)', () => {
    const ls = ['a', 'b', 'c', 'd'].map((id) => leader(id, 'Newcomer'));
    const fs = ['v', 'w', 'x', 'y', 'z'].map((id) => follower(id, 'Newcomer'));
    const pairs = generatePairsByLevel(ls, fs, levels);

    expect(pairs).toHaveLength(5);
    const usedFollowerIds = new Set(pairs.map((p) => p.follower.id));
    fs.forEach((f) => expect(usedFollowerIds.has(f.id)).toBe(true));
  });

  it('handles a dancer whose level is not in the levels array', () => {
    // getLevelIdx returns levels.length as a sentinel for unknown levels
    const leaders = [leader('a', 'Unknown')];
    const followers = [follower('x', 'Newcomer')];
    const pairs = generatePairsByLevel(leaders, followers, levels);
    expect(pairs).toHaveLength(1);
    expect(pairs[0].leader.id).toBe('a');
    expect(pairs[0].follower.id).toBe('x');
  });

  it('prefers the follower already in history as "best" when candidate f is in leader history', () => {
    // Mock shuffle so round 2 gets sf=[y, x], where x is in leader a's history.
    // In the reduce: best=y (new), f=x (old) → fNew=false, bNew=true → return best (y).
    // This exercises the `return best` branch on line 116.
    const mockRandom = vi
      .spyOn(Math, 'random')
      .mockReturnValueOnce(0.9) // round 1: fisherYates(leaders=[a,b]) → no swap → [a,b]
      .mockReturnValueOnce(0.9) // round 1: fisherYates(followers=[x,y]) → no swap → [x,y]
      .mockReturnValueOnce(0.9) // round 2: fisherYates(leaders=[a,b]) → no swap → [a,b]
      .mockReturnValueOnce(0.1); // round 2: fisherYates(followers=[x,y]) → swap → [y,x]

    const rounds = generateRounds(
      [leader('a', 'Newcomer'), leader('b', 'Newcomer')],
      [follower('x', 'Newcomer'), follower('y', 'Newcomer')],
      2,
      true,
      ['Newcomer'],
    );

    expect(rounds).toHaveLength(2);
    // Round 2 should avoid repeats from round 1
    const round1Set = new Set(rounds[0].map((p) => `${p.leader.id}-${p.follower.id}`));
    const repeats = rounds[1].filter((p) => round1Set.has(`${p.leader.id}-${p.follower.id}`));
    expect(repeats).toHaveLength(0);
    expect(mockRandom).toHaveBeenCalled();
  });

  it('generates max pairs when leaders outnumber followers (all same level)', () => {
    const ls = ['a', 'b', 'c', 'd', 'e'].map((id) => leader(id, 'Newcomer'));
    const fs = ['x', 'y', 'z'].map((id) => follower(id, 'Newcomer'));
    const pairs = generatePairsByLevel(ls, fs, levels);

    expect(pairs).toHaveLength(5);
    const usedLeaderIds = new Set(pairs.map((p) => p.leader.id));
    ls.forEach((l) => expect(usedLeaderIds.has(l.id)).toBe(true));
  });
});

describe('generateRounds', () => {
  it('generates the correct number of rounds', () => {
    const rounds = generateRounds(
      [leader('a'), leader('b')],
      [follower('x'), follower('y')],
      3,
      false,
      [],
    );
    expect(rounds).toHaveLength(3);
  });

  it('avoids repeating pairs across rounds when possible', () => {
    const leaders = [leader('a'), leader('b')];
    const followers = [follower('x'), follower('y')];
    const rounds = generateRounds(leaders, followers, 2, false, []);

    const round1Pairings = new Set(rounds[0].map((p) => `${p.leader.id}-${p.follower.id}`));
    const round2Pairings = rounds[1].map((p) => `${p.leader.id}-${p.follower.id}`);
    const repeats = round2Pairings.filter((p) => round1Pairings.has(p)).length;
    expect(repeats).toBe(0);
  });

  it('generates correct number of pairs per round in pairByLevel mode', () => {
    const rounds = generateRounds([leader('a', 'Newcomer')], [follower('x', 'Newcomer')], 2, true, [
      'Newcomer',
    ]);
    expect(rounds).toHaveLength(2);
    expect(rounds[0]).toHaveLength(1);
    // Round 2 forces a repeat (only one possible pair), exercising the repeat penalty
    expect(rounds[1]).toHaveLength(1);
    expect(rounds[1][0].leader.id).toBe('a');
    expect(rounds[1][0].follower.id).toBe('x');
  });

  it('generates correct number of pairs per round with equal counts', () => {
    const rounds = generateRounds(
      [leader('a'), leader('b')],
      [follower('x'), follower('y')],
      2,
      false,
      [],
    );
    expect(rounds[0]).toHaveLength(2);
    expect(rounds[1]).toHaveLength(2);
  });
});
