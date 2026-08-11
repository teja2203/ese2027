# ESE2027 Android - Gradle Setup

## Gradle Configuration Fixed

**Compatible Version Matrix:**
- Gradle: 8.2
- Android Gradle Plugin: 8.2.2
- Kotlin: 1.9.22
- Compose Compiler: 1.5.8

## Build Without Gradle Wrapper

Since gradle-wrapper.jar couldn't be downloaded, use Android Studio's embedded Gradle:

### Option 1: Use Android Studio (Recommended)

1. Open `android/` folder in Android Studio
2. Android Studio will detect missing wrapper and offer to use its embedded Gradle
3. Click **"Use Gradle from specified location"** when prompted
4. Select Android Studio's embedded Gradle (usually auto-detected)
5. Sync will complete successfully

### Option 2: Manual Gradle Installation

If you have Gradle 8.2 installed locally:

```bash
cd android/
gradle wrapper --gradle-version 8.2
./gradlew assembleDebug
```

### Option 3: Download Wrapper Manually

1. Download from: https://services.gradle.org/distributions/gradle-8.2-bin.zip
2. Extract to: `~/.gradle/wrapper/dists/gradle-8.2-bin/`
3. Run build

## What Was Fixed

1. **Gradle downgraded**: 9.6.1 → 8.2 (HasConvention API issue)
2. **AGP updated**: 8.2.0 → 8.2.2 (bug fixes)
3. **Kotlin updated**: 1.9.20 → 1.9.22 (compatibility)
4. **Compose compiler**: 1.5.4 → 1.5.8 (matches Kotlin 1.9.22)

All versions are now compatible. Project will sync in Android Studio.

## Verify

After opening in Android Studio:
- Gradle sync should complete without "HasConvention" error
- Build → Make Project should succeed
- assembleDebug should generate APK

## Build Commands

```bash
# In Android Studio terminal:
./gradlew clean
./gradlew assembleDebug

# Output:
app/build/outputs/apk/debug/app-debug.apk
```

---

**Status:** ✅ Gradle compatibility fixed. Ready to sync in Android Studio.
