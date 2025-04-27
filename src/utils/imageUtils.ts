
export function getTrainerImageUrl(name: string): string {
  if (!name) return 'https://placehold.co/28x28?text=NA&bg=cccccc&fg=555555';
  
  // Get initials from name
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
  
  // Generate a consistent color based on name
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const color = `hsl(${hash % 360}, 60%, 70%)`;
  
  // Encode color for URL
  const bg = encodeURIComponent(color);
  const fg = '333333';
  
  return `https://placehold.co/28x28/${bg}/${fg}?text=${initials}`;
}
