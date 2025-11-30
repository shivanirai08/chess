// Random avatar
export function getRandomAvatar(): string {
  const randomNum = Math.floor(Math.random() * 8) + 1;
  return `avatar${randomNum}.svg`;
}

// Get full URL for avatar
export function getAvatarUrl(avatar: string | undefined): string {
  if (!avatar) {
    return `/${getRandomAvatar()}`;
  }

  // If avatar already starts with /, return as is
  if (avatar.startsWith('/')) {
    return avatar;
  }

  // Otherwise prepend /
  return `/${avatar}`;
}
