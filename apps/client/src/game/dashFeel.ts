/** Cosmetic anticipation and release only; authoritative movement starts immediately. */
export function dashFeel(age: number) {
  if (!Number.isFinite(age) || age < 0 || age >= 0.45) return { offset: 0, lean: 0, tint: 0 };
  const pull = age < 0.025 ? Math.sin(age / 0.025 * Math.PI) : 0;
  const launch = age >= 0.025 && age < 0.145 ? Math.sin((age - 0.025) / 0.12 * Math.PI) : 0;
  return { offset: -0.20 * pull + 0.25 * launch, lean: -0.25 * pull + 0.35 * launch, tint: Math.min(1, age / 0.01) * Math.exp(-Math.max(0, age - 0.12) * 13) };
}
