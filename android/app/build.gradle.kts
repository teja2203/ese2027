import java.util.Properties

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("kotlin-kapt")
}

val localProperties = Properties().apply {
    val file = rootProject.file("local.properties")
    if (file.exists()) file.inputStream().use(::load)
}

val secretProperties = Properties().apply {
    val file = rootProject.file("secrets.properties")
    if (file.exists()) file.inputStream().use(::load)
}

fun requiredClientConfig(name: String): String =
    providers.gradleProperty(name).orNull
        ?: System.getenv(name)
        ?: secretProperties.getProperty(name)
        ?: localProperties.getProperty(name)
        ?: error("Missing $name. Add it to android/local.properties or the environment.")

fun String.asBuildConfigString(): String =
    "\"${replace("\\", "\\\\").replace("\"", "\\\"")}\""

val supabaseUrl = requiredClientConfig("SUPABASE_URL")
val supabaseAnonKey = requiredClientConfig("SUPABASE_ANON_KEY")

// Keep the APK's local web renderer synchronized with the React build output.
// The web app is a Vite build: run `npm run build` first (wired below), then
// copy the flat, relative-path bundle (dist/) into the WebView assets.
// delete() wipes stale files (old css/ js/ dirs) so the APK never ships
// leftovers from the previous pipeline.
val syncWebAssets by tasks.registering(Copy::class) {
    val webDist = rootProject.projectDir.parentFile.resolve("dist")
    delete(layout.projectDirectory.dir("src/main/assets"))
    from(webDist) {
        include("index.html")
        include("assets/")
        include("fonts/")
    }
    into(layout.projectDirectory.dir("src/main/assets"))
}

val buildWebApp by tasks.registering(Exec::class) {
    val webRoot = rootProject.projectDir.parentFile
    workingDir(webRoot)
    val isWindows = System.getProperty("os.name").lowercase().contains("win")
    commandLine(
        if (isWindows) "cmd" else "npm",
        *if (isWindows) arrayOf("/c", "npm", "run", "build") else arrayOf("run", "build")
    )
    inputs.dir(webRoot.resolve("src"))
    inputs.file(webRoot.resolve("vite.config.ts"))
    inputs.file(webRoot.resolve("package.json"))
    outputs.dir(webRoot.resolve("dist"))
}

tasks.named("preBuild") { dependsOn(buildWebApp, syncWebAssets) }
tasks.named("syncWebAssets") { dependsOn(buildWebApp) }

android {
    namespace = "com.ese2027.studyos"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.ese2027.studyos"
        minSdk = 26
        targetSdk = 34
        versionCode = 3
        versionName = "1.2.0"
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        
        buildConfigField("String", "SUPABASE_URL", supabaseUrl.asBuildConfigString())
        buildConfigField("String", "SUPABASE_ANON_KEY", supabaseAnonKey.asBuildConfigString())
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

    sourceSets.getByName("androidTest").assets.srcDir("schemas")

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    
    kotlinOptions {
        jvmTarget = "17"
    }
}

kapt {
    arguments {
        arg("room.schemaLocation", "$projectDir/schemas")
    }
}

dependencies {
    // Core Android
    implementation("androidx.core:core-ktx:1.12.0")
    implementation("androidx.appcompat:appcompat:1.6.1")
    implementation("androidx.webkit:webkit:1.10.0")
    implementation("androidx.activity:activity-ktx:1.8.2")
    implementation("com.google.android.material:material:1.11.0")
    
    // Lifecycle
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.7.0")
    
    // Compose
    val composeBom = platform("androidx.compose:compose-bom:2024.02.00")
    implementation(composeBom)
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-graphics")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.activity:activity-compose:1.8.2")
    
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

    testImplementation("junit:junit:4.13.2")
    androidTestImplementation("androidx.test.ext:junit:1.1.5")
    androidTestImplementation("androidx.test:runner:1.5.2")
    androidTestImplementation("androidx.room:room-testing:$roomVersion")
}
