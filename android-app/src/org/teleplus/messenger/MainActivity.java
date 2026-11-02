package org.teleplus.messenger;

import android.app.Activity;
import android.content.Context;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.os.Bundle;
import android.view.KeyEvent;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;

public class MainActivity extends Activity {
    private WebView webView;
    private SharedPreferences prefs;
    private String injectorScript = "";

    private static final String PREFS_NAME = "teleplus_native_store";
    private static final String KEY_CONFIG = "config_json";
    private static final String KEY_VAULT = "vault_json";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        injectorScript = loadAssetText("teleplus_injector.js");

        webView = new WebView(this);
        webView.setBackgroundColor(Color.parseColor("#070b14"));

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setAllowFileAccessFromFileURLs(true);
        settings.setAllowUniversalAccessFromFileURLs(true);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setUserAgentString(
            "Mozilla/5.0 (Linux; Android 13; Pixel 7 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36 TelePlusPro/1.0"
        );

        CookieManager cookieManager = CookieManager.getInstance();
        cookieManager.setAcceptCookie(true);
        cookieManager.setAcceptThirdPartyCookies(webView, true);

        webView.addJavascriptInterface(new TelePlusBridge(), "TelePlusBridge");

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                if (injectorScript != null && !injectorScript.isEmpty()) {
                    view.evaluateJavascript(injectorScript, null);
                }
            }
        });

        webView.setWebChromeClient(new WebChromeClient());

        setContentView(webView);
        webView.loadUrl("file:///android_asset/index.html");
    }

    private String loadAssetText(String fileName) {
        StringBuilder sb = new StringBuilder();
        try {
            InputStream is = getAssets().open(fileName);
            BufferedReader reader = new BufferedReader(new InputStreamReader(is, "UTF-8"));
            String line;
            while ((line = reader.readLine()) != null) {
                sb.append(line).append("\n");
            }
            reader.close();
        } catch (Exception ignored) {}
        return sb.toString();
    }

    public class TelePlusBridge {
        @JavascriptInterface
        public String getConfigJson() {
            return prefs.getString(KEY_CONFIG, "");
        }

        @JavascriptInterface
        public void saveConfigJson(String json) {
            prefs.edit().putString(KEY_CONFIG, json).apply();
        }

        @JavascriptInterface
        public String getVaultJson() {
            return prefs.getString(KEY_VAULT, "[]");
        }

        @JavascriptInterface
        public void saveVaultJson(String json) {
            prefs.edit().putString(KEY_VAULT, json).apply();
        }

        @JavascriptInterface
        public void launchTelegramClient(final String url) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    webView.loadUrl(url);
                }
            });
        }

        @JavascriptInterface
        public void openHomeDashboard() {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    webView.loadUrl("file:///android_asset/index.html");
                }
            });
        }
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_BACK && webView != null && webView.canGoBack()) {
            webView.goBack();
            return true;
        }
        return super.onKeyDown(keyCode, event);
    }
}
