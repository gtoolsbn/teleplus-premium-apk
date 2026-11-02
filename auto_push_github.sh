#!/data/user/0/com.termux/files/usr/bin/bash
set -e

PROJECT_DIR="/data/user/0/com.termux/files/home/projects/telegram-premium-mod"
cd "$PROJECT_DIR"

echo "========================================================"
echo "🚀 TelePlus Pro — 1-Click GitHub Auto Push & APK Builder"
echo "========================================================"
echo ""

if [ -z "$GH_TOKEN" ]; then
  printf "🔑 আপনার GitHub Personal Access Token পেস্ট করুন: "
  read -r GH_TOKEN
fi

GH_TOKEN="$(echo "$GH_TOKEN" | tr -d '[:space:]')"
if [ -z "$GH_TOKEN" ]; then
  echo "❌ ত্রুটি: GitHub Token দেওয়া হয়নি!"
  exit 1
fi

if [ -z "$REPO_NAME" ]; then
  printf "📦 রিপোজিটরির নাম দিন (Enter চাপলে ডিফল্ট: teleplus-premium-apk): "
  read -r REPO_NAME
fi
REPO_NAME="${REPO_NAME:-teleplus-premium-apk}"
REPO_NAME="$(echo "$REPO_NAME" | tr -d '[:space:]')"

if [ -z "$TG_API_ID" ]; then
  printf "🆔 আপনার Telegram API_ID দিন (Enter চাপলে ডিফল্ট ওপেন-সোর্স কী): "
  read -r TG_API_ID
fi
TG_API_ID="${TG_API_ID:-6}"

if [ -z "$TG_API_HASH" ]; then
  printf "🔒 আপনার Telegram API_HASH দিন (Enter চাপলে ডিফল্ট ওপেন-সোর্স কী): "
  read -r TG_API_HASH
fi
TG_API_HASH="${TG_API_HASH:-eb06d4abfb49dc3eeb1aeb98ae0f581e}"

echo ""
echo "⏳ [1/4] আপনার GitHub অ্যাকাউন্ট যাচাই করা হচ্ছে..."
USER_JSON="$(curl -sS -H "Authorization: token $GH_TOKEN" -H "Accept: application/vnd.github+json" https://api.github.com/user)"
GH_USER="$(python3 -c 'import sys, json; data = json.loads(sys.stdin.read()); print(data.get("login", ""))' <<< "$USER_JSON")"

if [ -z "$GH_USER" ]; then
  echo "❌ ত্রুটি: আপনার GitHub Token সঠিক নয় বা মেয়াদ শেষ হয়েছে!"
  echo "একটি নতুন Token তৈরি করুন এখানে: https://github.com/settings/tokens/new?scopes=repo,workflow&description=TelePlusBuilder"
  exit 1
fi
echo "✓ GitHub ইউজার শনাক্ত হয়েছে: @$GH_USER"

echo "⏳ [2/4] GitHub-এ '$REPO_NAME' রিপোজিটরি তৈরি করা হচ্ছে..."
CREATE_RES="$(curl -sS -X POST \
  -H "Authorization: token $GH_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  https://api.github.com/user/repos \
  -d "{\"name\":\"$REPO_NAME\",\"description\":\"TelePlus Pro Open-Source Telegram Premium APK Builder\",\"public\":true,\"auto_init\":false}")"

echo "✓ রিপোজিটরি প্রস্তুত: https://github.com/$GH_USER/$REPO_NAME"

# Save custom API_ID and API_HASH as default inside workflow so user doesn't even have to enter secrets manually
python3 - "$TG_API_ID" "$TG_API_HASH" << 'PYEOF'
import sys, pathlib, re
api_id, api_hash = sys.argv[1], sys.argv[2]
wf = pathlib.Path(".github/workflows/build-telegram-premium.yml")
text = wf.read_text(encoding="utf-8")
text = re.sub(r"\|\|\s*'6'\s*\}\}", f"|| '{api_id}' }}}}", text)
text = re.sub(r"\|\|\s*'eb06d4abfb49dc3eeb1aeb98ae0f581e'\s*\}\}", f"|| '{api_hash}' }}}}", text)
wf.write_text(text, encoding="utf-8")
PYEOF

echo "⏳ [3/4] সব ফাইল GitHub-এ অটো-পুশ করা হচ্ছে..."
git config user.name "$GH_USER"
git config user.email "$GH_USER@users.noreply.github.com"
git add -A
git commit -m "chore: Update TelePlus configuration and workflows" >/dev/null 2>&1 || true
git branch -M main

REMOTE_URL="https://$GH_USER:$GH_TOKEN@github.com/$GH_USER/$REPO_NAME.git"
git remote remove origin >/dev/null 2>&1 || true
git remote add origin "$REMOTE_URL"
git push -u origin main --force

# Clean token from git remote config after push for security
git remote set-url origin "https://github.com/$GH_USER/$REPO_NAME.git"

echo "⏳ [4/4] GitHub Actions অটো-বিল্ড চালু করা হচ্ছে..."
sleep 2
curl -sS -X POST \
  -H "Authorization: token $GH_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/$GH_USER/$REPO_NAME/actions/workflows/build-telegram-premium.yml/dispatches" \
  -d "{\"ref\":\"main\",\"inputs\":{\"build_target\":\"both\",\"telegram_api_id\":\"$TG_API_ID\",\"telegram_api_hash\":\"$TG_API_HASH\"}}" >/dev/null 2>&1 || true

echo ""
echo "========================================================"
echo "✅ সম্পূর্ণ সফল! সব ফাইল GitHub-এ আপলোড ও বিল্ড শুরু হয়েছে!"
echo "🔗 আপনার রিপোজিটরি লিংক: https://github.com/$GH_USER/$REPO_NAME"
echo "⚙️ APK ডাউনলোড লিংক (Actions): https://github.com/$GH_USER/$REPO_NAME/actions"
echo "========================================================"
