# ProGuard rules for ESE2027

# Keep BuildConfig
-keep class com.ese2027.studyos.BuildConfig { *; }

# Room
-keep class * extends androidx.room.RoomDatabase
-keep @androidx.room.Entity class *
-dontwarn androidx.room.paging.**

# Supabase/Ktor
-keep class io.ktor.** { *; }
-keep class kotlinx.coroutines.** { *; }
-dontwarn kotlinx.atomicfu.**

# Ktor includes optional JVM diagnostics that aren't needed on Android
-dontwarn java.lang.management.ManagementFactory
-dontwarn java.lang.management.RuntimeMXBean

# SLF4J logging framework uses JVM-only bindings that aren't needed on Android
# (Ktor optionally uses SLF4J for logging, but Android uses its own logging)
-dontwarn org.slf4j.impl.StaticLoggerBinder
-dontwarn org.slf4j.impl.StaticMDCBinder

# Gson
-keepattributes Signature
-keepattributes *Annotation*
-dontwarn sun.misc.**
-keep class com.google.gson.** { *; }
-keep class * implements com.google.gson.TypeAdapter
-keep class * implements com.google.gson.TypeAdapterFactory
-keep class * implements com.google.gson.JsonSerializer
-keep class * implements com.google.gson.JsonDeserializer

# Data models
-keep class com.ese2027.studyos.data.** { *; }

# Serialization
-keepattributes *Annotation*, InnerClasses
-dontnote kotlinx.serialization.AnnotationsKt
-keep,includedescriptorclasses class com.ese2027.studyos.**$$serializer { *; }
-keepclassmembers class com.ese2027.studyos.** {
    *** Companion;
}
-keepclasseswithmembers class com.ese2027.studyos.** {
    kotlinx.serialization.KSerializer serializer(...);
}

# Compose
-dontwarn androidx.compose.**
-keep class androidx.compose.** { *; }
