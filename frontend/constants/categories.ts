export const CATEGORY_EMOJI: Record<string, string> = {
  Cooking: '🍳', Recipes: '🍳', Food: '🍔',
  Workout: '💪', Workouts: '💪', Fitness: '💪',
  Finance: '💰', Money: '💰', Business: '📈',
  Mindset: '🧠', 'Self Improvement': '🌱', 'Personal Development': '🌱',
  Productivity: '⚡', 'Time Management': '⚡',
  Travel: '✈️', Fashion: '👗', Beauty: '💄',
  Tech: '💻', Technology: '💻', Programming: '💻',
  Art: '🎨', Design: '🎨', Music: '🎵', Dance: '💃',
  Health: '❤️', Wellness: '🧘', Meditation: '🧘',
  Marketing: '📣', Education: '📚', Learning: '📚',
  DIY: '🔨', Gaming: '🎮', Sports: '⚽',
  Entertainment: '🎬', Uncategorized: '📦',
  Lifestyle: '✨', Comedy: '😂', News: '📰',
  Science: '🔬', Nature: '🌿', Relationships: '💑', Career: '💼',
};

export const CATEGORY_COLOR: Record<string, string> = {
  Cooking: '#f97316', Recipes: '#f97316', Food: '#f97316',
  Workout: '#22c55e', Workouts: '#22c55e', Fitness: '#22c55e',
  Finance: '#f59e0b', Money: '#f59e0b', Business: '#f59e0b',
  Mindset: '#60a5fa', 'Self Improvement': '#60a5fa', 'Personal Development': '#60a5fa',
  Productivity: '#38bdf8', 'Time Management': '#38bdf8',
  Travel: '#38bdf8',
  Fashion: '#f472b6', Beauty: '#ec4899',
  Tech: '#3b82f6', Technology: '#3b82f6', Programming: '#3b82f6',
  Art: '#fb7185', Design: '#fb7185',
  Music: '#fbbf24', Dance: '#fbbf24',
  Health: '#f87171', Wellness: '#34d399', Meditation: '#34d399',
  Marketing: '#f59e0b', Education: '#3b82f6', Learning: '#3b82f6',
  DIY: '#d97706',
  Gaming: '#4ade80',
  Sports: '#22c55e',
  Entertainment: '#ef4444',
  Lifestyle: '#f472b6',
  Comedy: '#facc15',
  News: '#94a3b8',
  Science: '#38bdf8',
  Nature: '#86efac',
  Relationships: '#fb7185',
  Career: '#60a5fa',
  Uncategorized: '#94a3b8',
};

const FALLBACK_COLORS = ['#f97316', '#f59e0b', '#22c55e', '#60a5fa', '#fb7185', '#fbbf24', '#38bdf8', '#f472b6'];

export function getCategoryColor(name: string): string {
  if (CATEGORY_COLOR[name]) return CATEGORY_COLOR[name];
  let hash = 0;
  for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) % FALLBACK_COLORS.length;
  return FALLBACK_COLORS[Math.abs(hash)];
}

export function getCategoryEmoji(name: string): string {
  return CATEGORY_EMOJI[name] ?? '📌';
}

export const CATEGORY_ICON: Record<string, string> = {
  Cooking: 'restaurant-outline', Recipes: 'restaurant-outline', Food: 'restaurant-outline',
  Workout: 'barbell-outline', Workouts: 'barbell-outline', Fitness: 'barbell-outline',
  Finance: 'cash-outline', Money: 'cash-outline', Business: 'trending-up-outline',
  Mindset: 'bulb-outline', 'Self Improvement': 'bulb-outline', 'Personal Development': 'bulb-outline',
  Productivity: 'flash-outline', 'Time Management': 'flash-outline',
  Travel: 'airplane-outline', Fashion: 'shirt-outline', Beauty: 'sparkles-outline',
  Tech: 'code-slash-outline', Technology: 'code-slash-outline', Programming: 'code-slash-outline',
  Art: 'color-palette-outline', Design: 'color-palette-outline',
  Music: 'musical-notes-outline', Dance: 'body-outline',
  Health: 'heart-outline', Wellness: 'leaf-outline', Meditation: 'leaf-outline',
  Marketing: 'megaphone-outline', Education: 'book-outline', Learning: 'book-outline',
  DIY: 'hammer-outline', Gaming: 'game-controller-outline', Sports: 'football-outline',
  Entertainment: 'film-outline', Lifestyle: 'sunny-outline', Comedy: 'happy-outline',
  News: 'newspaper-outline', Science: 'flask-outline', Nature: 'leaf-outline',
  Relationships: 'heart-outline', Career: 'briefcase-outline',
  Uncategorized: 'grid-outline',
};

export function getCategoryIcon(name: string): string {
  return CATEGORY_ICON[name] ?? 'grid-outline';
}
