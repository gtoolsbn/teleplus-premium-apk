#!/data/user/0/com.termux/files/usr/bin/bash
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

ANDROID_JAR="$HOME/.gemini/android-sdk/platforms/android-30/android.jar"
KEYSTORE="$HOME/projects/secure-notebook-apk/debug.keystore"

mkdir -p gen bin/classes

echo "[1/5] Packaging resources with aapt..."
aapt package -f -m -J gen -M AndroidManifest.xml -S res -I "$ANDROID_JAR"

echo "[2/5] Compiling Java sources..."
javac -source 8 -target 8 \
  -bootclasspath "$ANDROID_JAR" \
  -cp "$ANDROID_JAR" \
  -d bin/classes \
  gen/org/teleplus/messenger/R.java \
  src/org/teleplus/messenger/MainActivity.java

echo "[3/5] Converting bytecode to DEX with d8..."
d8 --output bin/ --lib "$ANDROID_JAR" bin/classes/org/teleplus/messenger/*.class

echo "[4/5] Packaging APK with assets..."
aapt package -f -M AndroidManifest.xml -S res -A assets -I "$ANDROID_JAR" -F bin/unaligned.apk
(cd bin && aapt add unaligned.apk classes.dex)

if [ ! -f "$KEYSTORE" ]; then
  keytool -genkeypair -v -keystore debug.keystore -alias androiddebugkey \
    -keyalg RSA -keysize 2048 -validity 10000 \
    -storepass android -keypass android \
    -dname "CN=Android Debug,O=Android,C=US"
  KEYSTORE="debug.keystore"
fi

echo "[5/5] Signing APK..."
apksigner sign --ks "$KEYSTORE" --ks-pass pass:android --key-pass pass:android --out TelePlus-Pro.apk bin/unaligned.apk

cp TelePlus-Pro.apk /sdcard/Download/TelePlus-Pro.apk 2>/dev/null || true
cp TelePlus-Pro.apk /sdcard/TelePlus-Pro.apk 2>/dev/null || true

echo "✓ Successfully built and signed: $ROOT/TelePlus-Pro.apk"
echo "✓ Copied to: /sdcard/Download/TelePlus-Pro.apk"
