export function openExternalNavigation(lat: number, lng: number) {
  const isApple = /iPad|iPhone|iPod/.test(navigator.userAgent) || navigator.platform === 'MacIntel';
  window.location.href = isApple
    ? `maps://maps.google.com/?daddr=${lat},${lng}`
    : `google.navigation:q=${lat},${lng}`;
}
