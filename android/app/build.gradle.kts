plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

// Version comes from the git tag in CI (v1.2.3 → 1.2.3), so a GitHub release and the app always agree.
val versionNameFromEnv = (System.getenv("APP_VERSION") ?: "1.0.0").removePrefix("v")
val versionCodeFromName = versionNameFromEnv.split(".").map { it.toIntOrNull() ?: 0 }
    .let { (it + listOf(0, 0, 0)).take(3) }.let { it[0] * 10000 + it[1] * 100 + it[2] }

fun prop(name: String): String = (project.findProperty(name) as String?) ?: ""

android {
    namespace = "com.itssinghankit.i"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.itssinghankit.i"
        minSdk = 26
        targetSdk = 35
        versionCode = maxOf(1, versionCodeFromName)
        versionName = versionNameFromEnv
        buildConfigField("String", "GITHUB_REPO", "\"${prop("I_GITHUB_REPO")}\"")
        buildConfigField("String", "GOOGLE_WEB_CLIENT_ID", "\"${prop("I_GOOGLE_WEB_CLIENT_ID")}\"")
    }

    // Release signing reads from env vars (set as GitHub Actions secrets).
    signingConfigs {
        create("release") {
            val ks = System.getenv("I_KEYSTORE_PATH")
            if (ks != null) {
                storeFile = file(ks)
                storePassword = System.getenv("I_KEYSTORE_PASSWORD")
                keyAlias = System.getenv("I_KEY_ALIAS")
                keyPassword = System.getenv("I_KEY_PASSWORD")
            }
        }
    }

    // Which server each build talks to (see gradle.properties):
    //   debug   → I_DEV_URL (your Mac)       release → I_APP_URL (Vercel)
    buildTypes {
        debug {
            buildConfigField("String", "APP_URL", "\"${prop("I_DEV_URL")}\"")
        }
        release {
            buildConfigField("String", "APP_URL", "\"${prop("I_APP_URL")}\"")
            isMinifyEnabled = false
            // With your key: a proper signed release. Without it: signed with the debug key so it still installs.
            signingConfig = if (System.getenv("I_KEYSTORE_PATH") != null) signingConfigs.getByName("release")
                            else signingConfigs.getByName("debug")
        }
    }
    buildFeatures { buildConfig = true }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
}

dependencies {
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.core:core-splashscreen:1.0.1")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("androidx.webkit:webkit:1.12.1")
    implementation("androidx.swiperefreshlayout:swiperefreshlayout:1.1.0")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.7")
    // Google sign-in through Android's Credential Manager (the native account sheet)
    implementation("androidx.credentials:credentials:1.3.0")
    implementation("androidx.credentials:credentials-play-services-auth:1.3.0")
    implementation("com.google.android.libraries.identity.googleid:googleid:1.1.1")
}
