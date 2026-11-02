# ✈️ TelePlus Pro — Open-Source Telegram Premium Mod & Cloud APK Builder

ওপেন-সোর্স **Telegram-FOSS** (`DrKLO/Telegram` / `Telegram-FOSS-Team/Telegram-FOSS`) এবং **Telegram WebK/WebA MTProto** ভিত্তিক কাস্টমাইজড টেলিগ্রাম প্রজেক্ট, যেখানে সব পাবলিক ক্লায়েন্ট-সাইড প্রিমিয়াম এবং প্রাইভেসি ফিচার যুক্ত করা হয়েছে।

---

## 🌟 যুক্ত করা এক্সট্রা ও প্রিমিয়াম ফিচারসমূহ (Unlocked Features)

1. **👻 Ghost Mode (গোপন মোড)**:
   - **No Read Receipts**: অন্যের মেসেজ পড়লেও ডাবল ব্লু-টিক (Blue Tick) যাবে না (`TL_messages_readHistory` ব্লক করা)।
   - **Hide Typing & Recording**: চ্যাটে লেখার সময় বা ভয়েস দেওয়ার সময় `Typing...` / `Recording...` স্ট্যাটাস দেখাবে না (`TL_messages_setTyping` ব্লক করা)।
   - **Stealth Offline Presence**: অনলাইনে থাকলেও অন্যদের কাছে Offline দেখাবে।
2. **🗑️ Anti-Delete & ✏️ Anti-Edit Vault**:
   - অপর পাশের কেউ মেসেজ ডিলিট করে দিলেও (`TL_updateDeleteMessages`) আপনার চ্যাট বা **Anti-Delete Vault** থেকে মেসেজ মুছবে না।
   - মেসেজ এডিট করলে আগের আসল মেসেজটি সংরক্ষিত থাকবে।
3. **💎 Client-Side Premium Unlocks**:
   - **🚫 No Sponsored Ads**: পাবলিক চ্যানেল ও গ্রুপে টেলিগ্রামের সব স্পনসরড বিজ্ঞাপন সম্পূর্ণ বন্ধ (`isSponsoredDisabled() -> true`)।
   - **🔓 Save Restricted / No-Forward Content**: ফরওয়ার্ড বা কপি নিষিদ্ধ চ্যানেল থেকে মেসেজ কপি ও মিডিয়া ডাউনলোড আনলক (`isChatNoForwards() -> false`)।
   - **⚡ 4x Download Speed Boost**: `FileLoadOperation.java`-তে 1MB চাঙ্ক ও ১২টি প্যারালাল রিকোয়েস্ট স্ট্রিমের মাধ্যমে দ্রুত ডাউনলোড।
   - **👑 Local Premium Flag**: `UserConfig.isPremium()` ক্লায়েন্ট-সাইড আনলক (কাস্টম থিম, অ্যাপ আইকন, আনলিমিটেড পিন ও ফোল্ডার UI)।
4. **🇧🇩 Built-in One-Tap Bengali Translator**:
   - চ্যাটের ভেতর ভাসমান **`🇧🇩 অনুবাদ`** বাটনে ক্লিক করলেই যেকোনো বিদেশি ভাষার মেসেজ সাথে সাথে বাংলায় অনুবাদ হয়ে মেসেজের নিচে দেখাবে।

---

## 📱 পদ্ধতি ১: সরাসরি আপনার ফোনে রেডি APK ইনস্টল করুন (এখনই প্রস্তুত!)

আপনার ফোনের **Download** ফোল্ডারে ইতিমধ্যে **`TelePlus-Pro.apk`** তৈরি করে রাখা হয়েছে:
- ফাইল পাথ: `/sdcard/Download/TelePlus-Pro.apk`
- প্রজেক্ট পাথ: `android-app/TelePlus-Pro.apk`

### ব্যবহারের নিয়ম:
1. আপনার ফোনের **File Manager ➔ Downloads** ফোল্ডারে গিয়ে **`TelePlus-Pro.apk`** ইনস্টল করুন।
2. অ্যাপ ওপেন করে আপনার `my.telegram.org` থেকে পাওয়া **API ID** ও **API Hash** বসিয়ে **Save** করুন (ডিফল্ট ওপেন-সোর্স কী আগে থেকেই দেওয়া আছে)।
3. **🚀 Telegram চালু করুন (WebK)** বা **✨ Telegram চালু করুন (WebA)** বাটনে ট্যাপ করে লগইন করুন।
4. চ্যাট স্ক্রিনের নিচে ডানদিকে **`⚡ TelePlus`** এবং **`🇧🇩 অনুবাদ`** ভাসমান বাটন দেখতে পাবেন!

---

## ☁️ পদ্ধতি ২: GitHub Actions দিয়ে সম্পূর্ণ Native `Telegram-FOSS` C++/NDK APK বিল্ড করুন

আপনি যদি অফিশিয়াল অ্যান্ড্রয়েড `Telegram-FOSS` রিপোজিটরির সম্পূর্ণ C++/Java সোর্স কোড প্যাচ করে ক্লাউডে APK বিল্ড করতে চান:

### ধাপ ১: এই প্রজেক্টটি আপনার GitHub রিপোজিটরিতে পুশ করুন
```bash
cd ~/projects/telegram-premium-mod
git remote add origin https://github.com/<আপনার-ইউজারনেম>/<রিপোজিটরি-নাম>.git
git branch -M main
git push -u origin main
```

### ধাপ ২: GitHub Actions থেকে ১ ক্লিকে APK বিল্ড ও ডাউনলোড করুন
1. আপনার GitHub রিপোজিটরির **Actions** ট্যাবে যান।
2. **Build TelePlus Premium APK (Telegram-FOSS + Mod Suite)** ওয়ার্কফ্লো সিলেক্ট করে **Run workflow**-এ ক্লিক করুন।
3. সেখানে আপনার `telegram_api_id` এবং `telegram_api_hash` দিন (অথবা রিপোজিটরির **Settings ➔ Secrets and variables ➔ Actions**-এ `TELEGRAM_API_ID` এবং `TELEGRAM_API_HASH` নামে সেভ করুন)।
4. বিল্ড শেষ হলে **Artifacts** সেকশন থেকে তৈরি হওয়া APK ডাউনলোড করে নিন!
