package app.swipego.lcbconnect;

import android.content.Context;
import android.content.SharedPreferences;
import android.webkit.JavascriptInterface;

public class WebAppInterface {

    private static final String PREFS_NAME = "lcb_prefs";
    private static final String SUBSCRIBER_ID_KEY = "subscriber_id";

    private final Context context;

    public WebAppInterface(Context context) {
        this.context = context;
    }

    @JavascriptInterface
    public String getSubscriberId() {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        return prefs.getString(SUBSCRIBER_ID_KEY, "");
    }

    @JavascriptInterface
    public boolean isNativeApp() {
        return true;
    }
}
