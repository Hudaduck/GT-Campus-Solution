import { describe, it, expect } from 'vitest';
import { avatarSrc } from './avatarSrc';

const seed = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80';

describe('avatarSrc', () => {
  it('asks Unsplash for a small face-centered square for round avatars', () => {
    const u = new URL(avatarSrc(seed));
    expect(u.searchParams.get('w')).toBe('160');
    expect(u.searchParams.get('h')).toBe('160');
    expect(u.searchParams.get('crop')).toBe('faces');
  });

  it('asks for a sharp, uncropped-shape photo for the Connect card', () => {
    const u = new URL(avatarSrc(seed, 'card'));
    expect(u.searchParams.get('w')).toBe('900');
    expect(u.searchParams.has('h')).toBe(false);
    expect(u.pathname).toBe('/photo-1534528741775-53994a69daeb');
  });

  it('leaves non-Unsplash avatars (LinkedIn initials, links) alone', () => {
    const data = 'data:image/svg+xml;utf8,<svg/>';
    expect(avatarSrc(data)).toBe(data);
    expect(avatarSrc('https://example.com/me.jpg', 'card')).toBe('https://example.com/me.jpg');
    expect(avatarSrc('')).toBe('');
  });
});
