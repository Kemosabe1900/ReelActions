function localDateKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export function computeStreakLocal(triedAt: string[]): number {
  if (!triedAt.length) return 0;
  const dateSet = new Set<string>();
  for (const t of triedAt) {
    if (!t) continue;
    dateSet.add(localDateKey(new Date(t)));
  }
  if (!dateSet.size) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const hasToday = dateSet.has(localDateKey(today));
  const cursor = new Date(today);
  if (!hasToday) {
    cursor.setDate(cursor.getDate() - 1);
    if (!dateSet.has(localDateKey(cursor))) return 0;
  }

  let streak = 0;
  while (dateSet.has(localDateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function getActiveDaysLocal(triedAt: string[]): number[] {
  const now = new Date();
  const todayIndex = (now.getDay() + 6) % 7;
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - todayIndex);
  startOfWeek.setHours(0, 0, 0, 0);
  const active = new Set<number>();
  for (const t of triedAt) {
    if (!t) continue;
    const d = new Date(t);
    if (d >= startOfWeek) active.add((d.getDay() + 6) % 7);
  }
  return Array.from(active);
}
