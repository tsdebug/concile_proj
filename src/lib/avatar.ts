const avatarColors = [
  "bg-violet-100 text-violet-950 dark:bg-violet-900 dark:text-violet-100",
  "bg-orange-100 text-orange-950 dark:bg-orange-900 dark:text-orange-100",
  "bg-emerald-100 text-emerald-950 dark:bg-emerald-900 dark:text-emerald-100",
  "bg-sky-100 text-sky-950 dark:bg-sky-900 dark:text-sky-100",
  "bg-pink-100 text-pink-950 dark:bg-pink-900 dark:text-pink-100",
  "bg-amber-100 text-amber-950 dark:bg-amber-900 dark:text-amber-100",
]

export function presenceColor(userId: string) {
  let hash = 0
  for (const character of userId) {
    hash = ((hash * 31) + character.charCodeAt(0)) >>> 0
  }
  return avatarColors[hash % avatarColors.length]
}
