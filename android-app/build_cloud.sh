#!/usr/bin/env bash
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

BUILD_TOOLS_DIR="$(ls -d "$ANDROID_HOME/build-tools/"* | tail -n 1)"
ANDROID_JAR="$ANDROID_HOME/platforms/android-33/android.jar"

mkdir -p gen bin/classes

"$BUILD_TOOLS_DIR/aapt" package -f -m -J gen -M AndroidManifest.xml -S res -I "$ANDROID_JAR"

javac -source 8 -target 8 \
  -bootclasspath "$ANDROID_JAR" \
  -cp "$ANDROID_JAR" \
  -d bin/classes \
  gen/org/teleplus/messenger/R.java \
  src/org/teleplus/messenger/MainActivity.java

"$BUILD_TOOLS_DIR/d8" --output bin/ --lib "$ANDROID_JAR" bin/classes/org/teleplus/messenger/*.class

"$BUILD_TOOLS_DIR/aapt" package -f -M AndroidManifest.xml -S res -A assets -I "$ANDROID_JAR" -F bin/unaligned.apk
(cd bin && "$BUILD_TOOLS_DIR/aapt" add unaligned.apk classes.dex)

if [ ! -f debug.keystore ]; then
  keytool -genkeypair -v -keystore debug.keystore -alias androiddebugkey \
    -keyalg RSA -keysize 2048 -validity 10000 \
    -storepass android -keypass android \
    -dname "CN=TelePlus,O=TelePlus,C=BD"
fi

"$BUILD_TOOLS_DIR/apksigner" sign --ks debug.keystore --ks-pass pass:android --key-pass pass:android --out TelePlus-Pro.apk bin/unaligned.apk
echo "✓ Built TelePlus-Pro.apk on GitHub Actions"
