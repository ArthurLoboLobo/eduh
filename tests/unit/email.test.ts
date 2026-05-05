import { describe, expect, it } from 'vitest';
import { normalizeEmail } from '@/lib/email';

describe('normalizeEmail', () => {
  it('strips plus aliases and lowercases emails', () => {
    expect(normalizeEmail(' User+promo@Example.com ')).toBe('user@example.com');
  });

  it('preserves dots in gmail addresses', () => {
    expect(normalizeEmail('first.last+promo@gmail.com')).toBe('first.last@gmail.com');
  });

  it('does not change emails without plus aliases beyond trimming and lowercasing', () => {
    expect(normalizeEmail(' Student.Name@University.edu ')).toBe('student.name@university.edu');
  });
});
