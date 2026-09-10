// First release is Apple-only. Expanding scope requires a reviewed source change.
// No environment variable or workflow input can enable another platform.
export const releasePlatforms = Object.freeze(['ios']);

export function assertReleasePlatform(platform) {
  if (!releasePlatforms.includes(platform)) throw new Error(`Release policy blocks ${platform}: Apple-only release scope.`);
}
