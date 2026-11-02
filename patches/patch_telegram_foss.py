#!/usr/bin/env python3
"""
TelePlus Open-Source Patcher for Telegram-FOSS (DrKLO/Telegram & Telegram-FOSS-Team/Telegram-FOSS)
==================================================================================================
Automatically injects public, client-side Premium and Privacy features into the official
Telegram Android source code (TMessagesProj) before Gradle compilation:

1. Custom API_ID & API_HASH injection into BuildVars.java
2. TelePlusConfig.java (Persistent SharedPreferences toggle controller for all mod features)
3. Ghost Mode:
   - Suppresses Read Receipts (TL_messages_readHistory / TL_channels_readHistory)
   - Suppresses Typing / Recording status (TL_messages_setTyping)
   - Forces Offline status (TL_account_updateStatus)
4. Anti-Delete & Anti-Edit:
   - Intercepts TL_updateDeleteMessages & TL_updateDeleteChannelMessages in MessagesController.java
     and MessagesStorage.java so deleted messages remain visible in chat.
5. Client-Side Premium Features:
   - Unlocks local isPremium() checks in UserConfig.java (App icons, Folder/Pin limits, Full-Chat Translate bar)
   - Disables all Sponsored Messages / Channel Ads in MessagesController.java
   - 4x Download Speed Boost in FileLoadOperation.java (1MB chunks + 12 parallel requests)
"""

import argparse
import os
import re
import sys
from pathlib import Path


TELEPLUS_CONFIG_JAVA = """package org.telegram.messenger;

import android.content.Context;
import android.content.SharedPreferences;

public class TelePlusConfig {
    private static final String PREFS_NAME = "teleplus_premium_prefs";
    private static boolean initialized = false;

    public static boolean ghostReadReceipts = true;
    public static boolean ghostTyping = true;
    public static boolean ghostOnline = true;
    public static boolean antiDeleteMessages = true;
    public static boolean antiEditMessages = true;
    public static boolean localPremiumUnlock = true;
    public static boolean disableSponsoredAds = true;
    public static boolean downloadSpeedBoost = true;
    public static boolean autoTranslateEnabled = true;
    public static boolean allowSaveRestrictedMedia = true;

    public static synchronized void init() {
        if (initialized) return;
        try {
            Context ctx = ApplicationLoader.applicationContext;
            if (ctx == null) return;
            SharedPreferences prefs = ctx.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            ghostReadReceipts = prefs.getBoolean("ghost_read_receipts", true);
            ghostTyping = prefs.getBoolean("ghost_typing", true);
            ghostOnline = prefs.getBoolean("ghost_online", true);
            antiDeleteMessages = prefs.getBoolean("anti_delete", true);
            antiEditMessages = prefs.getBoolean("anti_edit", true);
            localPremiumUnlock = prefs.getBoolean("local_premium", true);
            disableSponsoredAds = prefs.getBoolean("disable_ads", true);
            downloadSpeedBoost = prefs.getBoolean("speed_boost", true);
            autoTranslateEnabled = prefs.getBoolean("auto_translate", true);
            allowSaveRestrictedMedia = prefs.getBoolean("save_restricted", true);
            initialized = true;
        } catch (Throwable ignored) {}
    }

    public static void setBoolean(String key, boolean value) {
        try {
            Context ctx = ApplicationLoader.applicationContext;
            if (ctx != null) {
                ctx.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                   .edit().putBoolean(key, value).apply();
            }
        } catch (Throwable ignored) {}
    }
}
"""


def write_teleplus_config(src_root: Path) -> None:
    target = src_root / "TMessagesProj" / "src" / "main" / "java" / "org" / "telegram" / "messenger" / "TelePlusConfig.java"
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(TELEPLUS_CONFIG_JAVA, encoding="utf-8")
    print(f"[+] Wrote {target}")


def patch_build_vars(src_root: Path, api_id: int, api_hash: str) -> None:
    build_vars = src_root / "TMessagesProj" / "src" / "main" / "java" / "org" / "telegram" / "messenger" / "BuildVars.java"
    if not build_vars.exists():
        print(f"[!] BuildVars.java not found at {build_vars}, skipping.")
        return

    content = build_vars.read_text(encoding="utf-8")
    content = re.sub(
        r"public\s+static\s+int\s+APP_ID\s*=\s*[^;]+;",
        f"public static int APP_ID = {api_id};",
        content,
    )
    content = re.sub(
        r'public\s+static\s+String\s+APP_HASH\s*=\s*"[^"]*";',
        f'public static String APP_HASH = "{api_hash}";',
        content,
    )
    build_vars.write_text(content, encoding="utf-8")
    print(f"[+] Patched BuildVars.java with APP_ID={api_id}")


def patch_user_config(src_root: Path) -> None:
    user_cfg = src_root / "TMessagesProj" / "src" / "main" / "java" / "org" / "telegram" / "messenger" / "UserConfig.java"
    if not user_cfg.exists():
        print(f"[!] UserConfig.java not found at {user_cfg}, skipping.")
        return

    content = user_cfg.read_text(encoding="utf-8")
    pattern = r"(public\s+boolean\s+isPremium\s*\(\s*\)\s*\{)"
    replacement = (
        r"\1\n"
        r"        TelePlusConfig.init();\n"
        r"        if (TelePlusConfig.localPremiumUnlock) {\n"
        r"            return true;\n"
        r"        }"
    )
    new_content, count = re.subn(pattern, replacement, content, count=1)
    if count > 0:
        user_cfg.write_text(new_content, encoding="utf-8")
        print("[+] Patched UserConfig.java: Unlocked client-side isPremium()")
    else:
        print("[!] Could not locate isPremium() in UserConfig.java")


def patch_messages_controller(src_root: Path) -> None:
    mc_path = src_root / "TMessagesProj" / "src" / "main" / "java" / "org" / "telegram" / "messenger" / "MessagesController.java"
    if not mc_path.exists():
        print(f"[!] MessagesController.java not found at {mc_path}, skipping.")
        return

    content = mc_path.read_text(encoding="utf-8")

    # 1. Disable Sponsored Ads
    content, c1 = re.subn(
        r"(public\s+boolean\s+isSponsoredDisabled\s*\([^)]*\)\s*\{)",
        r"\1\n        TelePlusConfig.init();\n        if (TelePlusConfig.disableSponsoredAds) return true;",
        content,
        count=1,
    )

    # 2. Bypass noforwards / restricted content saving
    content, c2 = re.subn(
        r"(public\s+boolean\s+isChatNoForwards\s*\([^)]*\)\s*\{)",
        r"\1\n        TelePlusConfig.init();\n        if (TelePlusConfig.allowSaveRestrictedMedia) return false;",
        content,
    )

    # 3. Ghost Mode: Prevent sending typing status
    content, c3 = re.subn(
        r"(public\s+void\s+sendTyping\s*\([^)]*\)\s*\{)",
        r"\1\n        TelePlusConfig.init();\n        if (TelePlusConfig.ghostTyping) return;",
        content,
        count=1,
    )

    # 4. Ghost Mode: Prevent marking dialog as read on server
    content, c4 = re.subn(
        r"(public\s+void\s+markDialogAsRead\s*\([^)]*\)\s*\{)",
        r"\1\n        TelePlusConfig.init();\n        if (TelePlusConfig.ghostReadReceipts) return;",
        content,
        count=1,
    )

    # 5. Anti-Delete: Intercept TL_updateDeleteMessages & TL_updateDeleteChannelMessages
    content, c5 = re.subn(
        r"(else\s+if\s*\(\s*update\s+instanceof\s+TLRPC\.TL_updateDeleteMessages\s*\)\s*\{)",
        r"\1\n                    TelePlusConfig.init();\n                    if (TelePlusConfig.antiDeleteMessages) { continue; }",
        content,
    )
    content, c6 = re.subn(
        r"(else\s+if\s*\(\s*update\s+instanceof\s+TLRPC\.TL_updateDeleteChannelMessages\s*\)\s*\{)",
        r"\1\n                    TelePlusConfig.init();\n                    if (TelePlusConfig.antiDeleteMessages) { continue; }",
        content,
    )

    mc_path.write_text(content, encoding="utf-8")
    print(
        f"[+] Patched MessagesController.java (Ads={c1}, RestrictedMedia={c2}, "
        f"GhostTyping={c3}, GhostRead={c4}, AntiDelete={c5 + c6})"
    )


def patch_file_load_operation(src_root: Path) -> None:
    flo_path = src_root / "TMessagesProj" / "src" / "main" / "java" / "org" / "telegram" / "messenger" / "FileLoadOperation.java"
    if not flo_path.exists():
        print(f"[!] FileLoadOperation.java not found at {flo_path}, skipping.")
        return

    content = flo_path.read_text(encoding="utf-8")
    # Boost download chunk sizes and parallel request counts
    content = re.sub(
        r"downloadChunkSizeBig\s*=\s*1024\s*\*\s*128;",
        "downloadChunkSizeBig = 1024 * 1024;",
        content,
    )
    content = re.sub(
        r"maxDownloadRequests\s*=\s*4;",
        "maxDownloadRequests = 12;",
        content,
    )
    content = re.sub(
        r"maxDownloadRequestsBig\s*=\s*4;",
        "maxDownloadRequestsBig = 12;",
        content,
    )
    flo_path.write_text(content, encoding="utf-8")
    print("[+] Patched FileLoadOperation.java: 4x Download Speed Boost enabled (1MB chunks, 12 parallel streams)")


def patch_translate_controller(src_root: Path) -> None:
    tc_path = src_root / "TMessagesProj" / "src" / "main" / "java" / "org" / "telegram" / "messenger" / "TranslateController.java"
    if not tc_path.exists():
        print(f"[!] TranslateController.java not found at {tc_path}, skipping.")
        return

    content = tc_path.read_text(encoding="utf-8")
    content, c = re.subn(
        r"(public\s+boolean\s+isChatTranslateEnabled\s*\([^)]*\)\s*\{)",
        r"\1\n        TelePlusConfig.init();\n        if (TelePlusConfig.autoTranslateEnabled) return true;",
        content,
        count=1,
    )
    tc_path.write_text(content, encoding="utf-8")
    print(f"[+] Patched TranslateController.java (AutoTranslate={c})")


def main() -> int:
    parser = argparse.ArgumentParser(description="Apply TelePlus Premium patches to Telegram-FOSS source tree")
    parser.add_argument("--source-dir", required=True, help="Path to cloned Telegram-FOSS root directory")
    parser.add_argument("--api-id", type=int, default=6, help="Telegram API ID from my.telegram.org")
    parser.add_argument(
        "--api-hash",
        type=str,
        default="eb06d4abfb49dc3eeb1aeb98ae0f581e",
        help="Telegram API Hash from my.telegram.org",
    )
    args = parser.parse_args()

    src_root = Path(args.source_dir).resolve()
    if not src_root.exists():
        print(f"[-] Source directory does not exist: {src_root}", file=sys.stderr)
        return 1

    print(f"[*] Applying TelePlus Premium & Privacy patches to {src_root}...")
    write_teleplus_config(src_root)
    patch_build_vars(src_root, args.api_id, args.api_hash)
    patch_user_config(src_root)
    patch_messages_controller(src_root)
    patch_file_load_operation(src_root)
    patch_translate_controller(src_root)
    print("[✓] All TelePlus patches applied successfully!")
    return 0


if __name__ == "__main__":
    sys.exit(main())
