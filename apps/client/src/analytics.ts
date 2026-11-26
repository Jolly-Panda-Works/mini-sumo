type Attributes = Record<string, string | number | boolean>;
interface AnalyticsPlugin {
  event(data: { name: string; fields: Attributes }): Promise<void>;
  revenue(data: { amount: number }): Promise<void>;
}
function plugin(): AnalyticsPlugin | undefined {
  const cap = (window as Window & { Capacitor?: { Plugins?: { GameAnalytics?: AnalyticsPlugin } } }).Capacitor;
  return cap?.Plugins?.GameAnalytics;
}
export const analyticsEnabled = () => Boolean(plugin());
export function track(name: string, fields: Attributes = {}) {
  void plugin()?.event({ name, fields: { store: import.meta.env.VITE_STORE || "android", app_version: import.meta.env.VITE_APP_VERSION || "unknown", ...fields } }).catch(() => {});
}
export function trackRevenue(amount: number) {
  if (Number.isFinite(amount) && amount > 0) void plugin()?.revenue({ amount }).catch(() => {});
}
