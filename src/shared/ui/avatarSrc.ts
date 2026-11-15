/**
 * Sized profile photos. Seed avatars come from Unsplash, whose image CDN resizes on the fly, so
 * each spot asks for what it shows instead of one blurry 400px file everywhere:
 *  - `thumb`: square, face-centered, 2x for round avatars up to 80px
 *  - `card`:  original shape at 2x for the Connect card photo (cropped in CSS, see object-position)
 * Anything that isn't an Unsplash URL (LinkedIn initials data: URLs, user-entered links) is
 * returned untouched.
 */
export type AvatarSize = 'thumb' | 'card';

export function avatarSrc(url: string, size: AvatarSize = 'thumb'): string {
  if (!url) return url;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }
  if (parsed.hostname !== 'images.unsplash.com') return url;

  const params = parsed.searchParams;
  params.set('auto', 'format');
  if (size === 'thumb') {
    params.set('w', '160');
    params.set('h', '160');
    params.set('fit', 'crop');
    params.set('crop', 'faces');
    params.set('q', '75');
  } else {
    params.set('w', '900');
    params.delete('h');
    params.set('q', '80');
  }
  return parsed.toString();
}
