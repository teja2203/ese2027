plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("kotlin-kapt")
}

// Keep the APK's local web renderer synchronized with the repository source.
// This prevents a future web UI change from silently leaving stale assets in
// the Android package.
val syncWebAssets by tasks.registering(Copy::class) {
    val webRoot = rootProject.projectDir.parentFile
    from(webRoot) {
        include("index.html", "manifest.json", "sw.js")
    }
    from(webRoot.resolve("css")) { into("css") }
    from(webRoot.resolve("js")) { into("js") }
    from(webRoot.resolve("fonts")) { into("fonts") }
    from(webRoot.resolve("icons")) { into("icons") }
    into(layout.projectDirectory.dir("src/main/assets"))
}

tasks.named("preBuild") { dependsOn(syncWebAssets) }

android {
    namespace = "com.ese2027.studyos"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.ese2027.studyos"
        minSdk = 26
        targetSdk = 34
        versionCode = 2
        versionName = "1.1.0"
        
        buildConfigField("String", "SUPABASE_URL", "\"https://vfpyymmpenitljeobwot.supabase.co\"")
        buildConfigField("String", "SUPABASE_ANON_KEY", "\"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmcHl5bW1wZW5pdGxqZW9id290Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1NDI4NzgsImV4cCI6MjA5OTExODg3OH0.73O1tNgeelXIgqsA-xjKYCOPKwxLY54FPqYth1SzG0U\"")
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
    }
    
    buildFeatures {
        buildConfig = true
        compose = true
    }
    
    composeOptions {
        kotlinCompilerExtensionVersion = "1.5.8"
    }
    
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    
    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    // Core Android
    implementation("androidx.core:core-ktx:1.12.0")
    implementation("androidx.appcompat:appcompat:1.6.1")
    implementation("androidx.webkit:webkit:1.10.0")
    implementation("androidx.activity:activity-compose:1.8.2")
    implementation("com.google.android.material:material:1.11.0")

    // Compose
    val composeBom = platform("androidx.compose:compose-bom:2023.10.01")
    implementation(composeBom)
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.material:material-icons-extended")
    debugImplementation("androidx.compose.ui:ui-tooling")
    
    // Lifecycle
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.7.0")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.7.0")
    
    // Navigation
    implementation("androidx.navigation:navigation-compose:2.7.6")
    
    // Room
    val roomVersion = "2.6.1"
    implementation("androidx.room:room-runtime:$roomVersion")
    implementation("androidx.room:room-ktx:$roomVersion")
    kapt("androidx.room:room-compiler:$roomVersion")
    
    // WorkManager
    implementation("androidx.work:work-runtime-ktx:2.9.0")
    
    // Supabase
    implementation(platform("io.github.jan-tennert.supabase:bom:2.0.0"))
    implementation("io.github.jan-tennert.supabase:postgrest-kt")
    implementation("io.github.jan-tennert.supabase:gotrue-kt")
    implementation("io.ktor:ktor-client-okhttp:2.3.7")
    
    // Coroutines
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3")
    
    // DataStore
    implementation("androidx.datastore:datastore-preferences:1.0.0")
    
    // Gson
    implementation("com.google.code.gson:gson:2.10.1")
}
