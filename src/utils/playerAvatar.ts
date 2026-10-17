import { UserMembership } from '../types/football';

/**
 * Modern SVG gray silhouette avatar for 'gratuit' membership tier.
 */
export const GRAY_PLACEHOLDER_AVATAR = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="%23475569"><rect width="100" height="100" fill="%231e293b" rx="20"/><circle cx="50" cy="38" r="19" fill="%2364748b"/><path d="M22,86 C22,66 36,58 50,58 C64,58 78,66 78,86 Z" fill="%2364748b"/></svg>`;

/**
 * Returns player photo if user has Pro/Admin/Creator membership tier,
 * or gray silhouette placeholder if user has Gratuit membership tier.
 */
export function getPlayerDisplayAvatar(
  player: { avatar?: string; name?: string },
  membership?: UserMembership
): string {
  if (membership === 'gratuit') {
    return GRAY_PLACEHOLDER_AVATAR;
  }
  return player.avatar || GRAY_PLACEHOLDER_AVATAR;
}
