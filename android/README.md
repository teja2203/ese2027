# ESE2027 Study OS - Native Android Application

## Overview

This is the native Android implementation of ESE2027 Study OS. It provides:

- **Offline-first architecture** with Room local database
- **Automatic cloud sync** via Supabase
- **Real app blocking** using AccessibilityService
- **Real website blocking** using VPN service
- **Native notifications** for focus sessions
- **Persistent timer** that survives app closure/reboot
- **Nothing UI design** preserved from web app

## Architecture

```
UI (Jetpack Compose)
    ↓
ViewModels
    ↓
Repositories
    ↓
    ├─ Room (Local Database)
    └─ Supabase (Cloud Sync)

Services:
- FocusTimerService (Foreground service for timer)
- AppBlockingService (AccessibilityService)
- WebsiteBlockingVpnService (VPN for DNS filtering)
- BootReceiver (Session recovery after reboot)
- SyncWorker (Background sync via WorkManager)
```

## Build Requirements

- Android Studio Hedgehog (2023.1.1) or later
- JDK 17
- Android SDK 34
- Kotlin 1.9.20
- Gradle 8.2

## Build Instructions

### 1. Open in Android Studio

```bash
cd android/
# Open this folder in Android Studio
```

### 2. Sync Gradle

Android Studio will automatically sync dependencies. If not, click:
**File → Sync Project with Gradle Files**

### 3. Build Debug APK

```bash
./gradlew assembleDebug
```

Output: `app/build/outputs/apk/debug/app-debug.apk`

### 4. Build Release APK

```bash
./gradlew assembleRelease
```

Output: `app/build/outputs/apk/release/app-release-unsigned.apk`

### 5. Sign Release APK

Create keystore:
```bash
keytool -genkey -v -keystore ese2027-key.keystore -alias ese2027 -keyalg RSA -keysize 2048 -validity 10000
```

Sign APK:
```bash
jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 -keystore ese2027-key.keystore app/build/outputs/apk/release/app-release-unsigned.apk ese2027
```

## Required Permissions

The app requests these permissions at runtime:

1. **Notifications** - For focus session alerts
2. **Usage Access** - To detect foreground apps
3. **Accessibility** - To block distracting apps
4. **VPN** - To block websites
5. **Battery Optimization** - For reliable background operation

## Features Implemented

### ✅ Core Features

- [x] Room local database with offline-first architecture
- [x] Supabase authentication integration
- [x] Automatic background sync via WorkManager
- [x] Study session tracking
- [x] Focus timer with foreground service
- [x] Native Android notifications
- [x] App blocking via AccessibilityService
- [x] Website blocking via VPN service
- [x] Boot receiver for session recovery
- [x] Nothing UI design theme
- [x] Bottom navigation (Today/Plan/Focus/Progress/You)

### 📝 Data Models

- Study Sessions
- Focus Sessions
- Achievements
- Mock Scores
- Ratings
- Habits & Habit Logs
- Blocked Apps
- Blocked Websites
- Sync Queue

### 🔄 Sync Strategy

- Local-first writes
- Automatic background sync every 15 minutes
- Retry with exponential backoff
- Conflict resolution using timestamps
- Offline queue for pending syncs

## Testing

### Test App Blocking

1. Enable Accessibility permission
2. Add Instagram/YouTube to blocked apps
3. Start focus session
4. Try opening blocked app
5. Should show blocking screen

### Test Website Blocking

1. Enable VPN permission
2. Add youtube.com to blocked websites
3. Start focus session
4. Try accessing blocked site
5. Should be blocked

### Test Offline Mode

1. Disable internet
2. Log study session
3. Re-enable internet
4. Check Supabase - should auto-sync

## Known Limitations

1. **VPN Website Blocking**: Simplified DNS filtering. Production version needs full DNS parser.
2. **Accessibility Service**: Can be disabled by user in Settings. Cannot be prevented on non-rooted devices.
3. **Battery Optimization**: User must manually exempt app from battery optimization for reliable background operation.

## Migration from Web App

Existing web app users can install this Android app and login with the same credentials. Data will automatically sync from Supabase.

## Future Enhancements

- [ ] Google Play update system (currently uses manual APK updates)
- [ ] More granular website blocking (URL paths, not just domains)
- [ ] Biometric authentication for strict mode bypass
- [ ] Widget for timer
- [ ] Wear OS companion app
- [ ] Export/import via Google Drive

## Project Structure

```
app/src/main/java/com/ese2027/studyos/
├── data/
│   ├── local/          # Room database, entities, DAOs
│   ├── remote/         # Supabase API
│   └── repository/     # Repository layer
├── service/            # Android services
│   ├── FocusTimerService.kt
│   ├── AppBlockingService.kt
│   ├── WebsiteBlockingVpnService.kt
│   └── BootReceiver.kt
├── ui/                 # Compose UI
│   ├── MainActivity.kt
│   └── BlockingActivity.kt
└── StudyOsApplication.kt
```

## Troubleshooting

### Build Fails

- Ensure JDK 17 is installed
- Clear Gradle cache: `./gradlew clean`
- Invalidate Android Studio cache: **File → Invalidate Caches**

### App Blocking Not Working

- Check Accessibility permission is enabled
- Go to **Settings → Accessibility → ESE2027 → Enable**
- Restart app after enabling

### Notifications Not Showing

- Check notification permission granted
- Check notification channel not disabled in Settings
- Ensure battery optimization exempted

### Sync Not Working

- Check internet connection
- Check logged into Supabase
- Check WorkManager logs in Logcat

## License

Same as parent project.

## Support

For issues related to the Android app specifically, check:
1. Android Studio Build output
2. Logcat for runtime errors
3. Ensure all permissions granted

---

**Version**: 1.0.0  
**Min SDK**: 26 (Android 8.0)  
**Target SDK**: 34 (Android 14)  
**Package**: com.ese2027.studyos
# Android conversion

The APK packages the audited web application from the repository into a local
WebView. `MainActivity` deliberately does not duplicate the web renderer in
Compose: the local `app/src/main/assets` copy is the source of truth for the
exact DOM/CSS/JavaScript UI, scrolling, timer dock, WebAudio, celebrations,
backup state, and settings behavior.

Build a debug APK with:

```powershell
$env:JAVA_HOME='C:\Users\91830\.jdks\ms-17.0.20'
.\gradlew.bat assembleDebug --no-daemon --max-workers=1 --console plain
```

The output is `app/build/outputs/apk/debug/app-debug.apk`.
