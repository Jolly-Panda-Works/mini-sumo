package __PACKAGE__;

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
    public void event(PluginCall call) {
        JSObject fields = call.getObject("fields", new JSObject());
        Map<String, Object> attributes = new HashMap<>();
        fields.keys().forEachRemaining(key -> attributes.put(key, fields.opt(key)));
        MetrixAnalytics.newEventByName(call.getString("name"), attributes);
        call.resolve();
    }

    @PluginMethod
    public void revenue(PluginCall call) {
        MetrixAnalytics.newRevenueByName("purchase_revenue", call.getDouble("amount"), RevenueCurrency.IRR);
        call.resolve();
    }
}
