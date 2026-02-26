import { randomInt } from 'crypto';

const LOWER = 'abcdefghijklmnopqrstuvwxyz';
const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const DIGIT = '0123456789';
const ALL = LOWER + UPPER + DIGIT;

function pick(chars: string) {
  return chars[randomInt(0, chars.length)];
}

export function generateTemporaryPassword(length = 12) {
  const chars = [pick(LOWER), pick(UPPER), pick(DIGIT)];

  while (chars.length < length) {
    chars.push(pick(ALL));
  }

  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(0, i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join('');
}
