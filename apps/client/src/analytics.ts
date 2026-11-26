type Attributes = Record<string, string | number | boolean>;
interface AnalyticsPlugin {
  sessions(data: { store: string; version: string }): Promise<void>;
  event(data: { name: string; fields: Attributes }): Promise<void>;
  revenue(data: { amount: number }): Promise<void>;
}
export let activityContext = "game";
export async function withActivityContext<T>(context: string, action: () => Promise<T>) {
  const previous = activityContext;
  activityContext = context;
  try { return await action(); }
  finally { activityContext = previous; }
}
function plugin(): AnalyticsPlugin | undefined {
  const cap = (window as Window & { Capacitor?: { Plugins?: { GameAnalytics?: AnalyticsPlugin } } }).Capacitor;
  return cap?.Plugins?.GameAnalytics;
}
const store = import.meta.env.VITE_STORE || "android";
const version = import.meta.env.VITE_APP_VERSION || "unknown";

export function startAnalyticsSessions() {
  void plugin()?.sessions({ store, version }).catch(() => {});
}
export const analyticsEnabled = () => Boolean(plugin());
export function track(name: string, fields: Attributes = {}) {
  void plugin()?.event({ name, fields: { store, app_version: version, ...fields } }).catch(() => {});
}
export function trackRevenue(amount: number) {
  if (Number.isFinite(amount) && amount > 0) void plugin()?.revenue({ amount }).catch(() => {});
}
