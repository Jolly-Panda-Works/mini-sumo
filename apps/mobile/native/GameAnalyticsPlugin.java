package __PACKAGE__;

import android.content.SharedPreferences;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import ir.metrix.analytics.MetrixAnalytics;
import ir.metrix.analytics.messaging.RevenueCurrency;
import java.util.HashMap;
import java.util.Map;

@CapacitorPlugin(name = "GameAnalytics")
public class GameAnalyticsPlugin extends Plugin {
    @PluginMethod
    public void sessions(PluginCall call) {
        SharedPreferences prefs = getContext().getSharedPreferences("game-analytics", 0);
        Map<String, Object> attributes = new HashMap<>();
        attributes.put("store", call.getString("store"));
        attributes.put("app_version", call.getString("version"));
        MetrixAnalytics.setSessionIdListener(sessionId -> {
            synchronized (prefs) {
                if (sessionId.equals(prefs.getString("last-session", ""))) return;
                MetrixAnalytics.newEventByName("session_started", attributes);
                prefs.edit().putString("last-session", sessionId).apply();
            }
        });
        call.resolve();
    }

    @PluginMethod
    public void event(PluginCall call) {
        JSObject fields = call.getObject("fields", new JSObject());
        Map<String, Object> attributes = new HashMap<>();
        for (java.util.Iterator<String> keys = fields.keys(); keys.hasNext();) {
            String key = keys.next();
            attributes.put(key, fields.opt(key));
        }
        MetrixAnalytics.newEventByName(call.getString("name"), attributes);
        call.resolve();
    }

    @PluginMethod
    public void revenue(PluginCall call) {
        MetrixAnalytics.newRevenueByName("purchase_revenue", call.getDouble("amount"), RevenueCurrency.IRR);
        call.resolve();
    }
}
