/** 20 preset avatar URLs (DiceBear). Keep in sync with frontend/lib/avatars.ts */
export const PRESET_AVATARS: readonly string[] = Array.from({ length: 20 }, (_, i) => {
  const id = i + 1;
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=cd-avatar-${id}`;
});

export function getRandomPresetAvatar(): string {
  const index = Math.floor(Math.random() * PRESET_AVATARS.length);
  return PRESET_AVATARS[index]!;
}

export function resolveAvatar(avatarId?: string | number | null, imageUrl?: string | null): string {
  if (imageUrl && /^https:\/\//i.test(imageUrl)) {
    return imageUrl;
  }
  if (avatarId !== undefined && avatarId !== null && avatarId !== '') {
    const n = typeof avatarId === 'number' ? avatarId : parseInt(String(avatarId), 10);
    if (Number.isInteger(n) && n >= 1 && n <= PRESET_AVATARS.length) {
      return PRESET_AVATARS[n - 1]!;
    }
  }
  return getRandomPresetAvatar();
}
