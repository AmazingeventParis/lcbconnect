package app.swipego.lcbconnect;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ServiceInfo;
import android.os.Build;
import android.os.IBinder;

import androidx.core.app.NotificationCompat;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;

public class NtfyListenerService extends Service {

    private static final String CHANNEL_ID = "lcb_notifications";
    private static final String FOREGROUND_CHANNEL_ID = "lcb_foreground";
    private static final int FOREGROUND_ID = 1;
    private static final String PREFS_NAME = "lcb_prefs";
    private static final String TOPIC_KEY = "ntfy_topic";

    private volatile boolean running = false;
    private Thread listenerThread;

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onCreate() {
        super.onCreate();
        createChannels();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String topic = null;
        if (intent != null) {
            topic = intent.getStringExtra("topic");
        }

        // Fall back to SharedPreferences (for START_STICKY restart)
        if (topic == null || topic.isEmpty()) {
            SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
            topic = prefs.getString(TOPIC_KEY, null);
        }

        if (topic == null || topic.isEmpty()) {
            stopSelf();
            return START_NOT_STICKY;
        }

        // Save topic for restart
        getSharedPreferences(PREFS_NAME, MODE_PRIVATE)
                .edit().putString(TOPIC_KEY, topic).apply();

        // Start as foreground service
        Notification foregroundNotif = new NotificationCompat.Builder(this, FOREGROUND_CHANNEL_ID)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle("LCBconnect")
                .setContentText("Notifications actives")
                .setPriority(NotificationCompat.PRIORITY_MIN)
                .setOngoing(true)
                .build();

        if (Build.VERSION.SDK_INT >= 29) {
            startForeground(FOREGROUND_ID, foregroundNotif,
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC);
        } else {
            startForeground(FOREGROUND_ID, foregroundNotif);
        }

        // Start listener thread
        if (listenerThread != null) {
            running = false;
            listenerThread.interrupt();
        }
        running = true;
        final String finalTopic = topic;
        listenerThread = new Thread(() -> listen(finalTopic));
        listenerThread.start();

        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        running = false;
        if (listenerThread != null) listenerThread.interrupt();
        super.onDestroy();
    }

    private void listen(String topic) {
        int backoff = 2000;

        while (running) {
            HttpURLConnection conn = null;
            try {
                URL url = new URL("https://ntfy.sh/" + topic + "/json");
                conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("GET");
                conn.setConnectTimeout(30000);
                conn.setReadTimeout(90000); // ntfy sends keepalive every ~30s

                BufferedReader reader = new BufferedReader(
                        new InputStreamReader(conn.getInputStream()));

                backoff = 2000; // Reset on successful connect

                String line;
                while (running && (line = reader.readLine()) != null) {
                    if (line.trim().isEmpty()) continue;
                    try {
                        JSONObject json = new JSONObject(line);
                        String event = json.optString("event", "");
                        if ("message".equals(event)) {
                            showNotification(json);
                        }
                    } catch (Exception ignored) {
                    }
                }
                reader.close();
            } catch (Exception e) {
                if (conn != null) {
                    try { conn.disconnect(); } catch (Exception ignored) {}
                }
            }

            // Reconnect with exponential backoff (max 30s)
            if (running) {
                try {
                    Thread.sleep(backoff);
                } catch (InterruptedException ie) {
                    break;
                }
                backoff = Math.min(backoff * 2, 30000);
            }
        }
    }

    private void showNotification(JSONObject json) {
        String title = json.optString("title", "LCBconnect");
        String message = json.optString("message", "");
        String click = json.optString("click", "");

        Intent intent = new Intent(this, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);

        if (!click.isEmpty()) {
            String deepLink = click.replace("https://lcbconnect.swipego.app", "");
            if (!deepLink.isEmpty()) {
                intent.putExtra("deep_link", deepLink);
            }
        }

        PendingIntent pi = PendingIntent.getActivity(this, (int) System.currentTimeMillis(),
                intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        Notification notif = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(title)
                .setContentText(message)
                .setAutoCancel(true)
                .setContentIntent(pi)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .build();

        NotificationManager manager = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        manager.notify((int) System.currentTimeMillis(), notif);
    }

    private void createChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager manager = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);

            NotificationChannel mainChannel = new NotificationChannel(
                    CHANNEL_ID, "Notifications", NotificationManager.IMPORTANCE_HIGH);
            mainChannel.setDescription("Notifications LCBconnect");
            manager.createNotificationChannel(mainChannel);

            NotificationChannel fgChannel = new NotificationChannel(
                    FOREGROUND_CHANNEL_ID, "Service actif", NotificationManager.IMPORTANCE_MIN);
            fgChannel.setDescription("Maintient les notifications actives");
            manager.createNotificationChannel(fgChannel);
        }
    }
}
