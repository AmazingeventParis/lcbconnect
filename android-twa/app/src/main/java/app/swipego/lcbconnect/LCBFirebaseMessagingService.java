package app.swipego.lcbconnect;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;

import androidx.core.app.NotificationCompat;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

import java.util.Map;

public class LCBFirebaseMessagingService extends FirebaseMessagingService {

    private static final String CHANNEL_ID = "lcb_notifications";
    private static final String PREFS_NAME = "lcb_prefs";
    private static final String FCM_TOKEN_KEY = "fcm_token";

    @Override
    public void onNewToken(String token) {
        super.onNewToken(token);
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        prefs.edit().putString(FCM_TOKEN_KEY, token).apply();
    }

    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {
        super.onMessageReceived(remoteMessage);

        Map<String, String> data = remoteMessage.getData();
        String title = data.get("title");
        String body = data.get("body");
        String url = data.get("url");
        String tag = data.get("tag");

        if (title == null || title.isEmpty()) return;

        createNotificationChannel();

        Intent intent = new Intent(this, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        if (url != null && !url.isEmpty()) {
            intent.putExtra("deep_link", url);
        }

        PendingIntent pendingIntent = PendingIntent.getActivity(
                this, 0, intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(title)
                .setContentText(body != null ? body : "")
                .setAutoCancel(true)
                .setContentIntent(pendingIntent)
                .setPriority(NotificationCompat.PRIORITY_HIGH);

        NotificationManager manager = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        int notifId = (tag != null) ? tag.hashCode() : (int) System.currentTimeMillis();
        manager.notify(notifId, builder.build());
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "LCBconnect",
                    NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Notifications LCBconnect");
            NotificationManager manager = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
            manager.createNotificationChannel(channel);
        }
    }
}
