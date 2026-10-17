#!/usr/bin/env python3
"""Run once after `flutter create`. Patches the generated android/ folder so the app builds:
 - INTERNET + POST_NOTIFICATIONS permissions, app name "Royal Feast"
 - minSdk 24 (Firebase / Razorpay)
 - core-library desugaring (needed by flutter_local_notifications)
 - R8 shrinking off in release (Razorpay breaks with it)
Safe to run twice."""
import os, re, sys

root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'android', 'app')
manifest = os.path.join(root, 'src', 'main', 'AndroidManifest.xml')

# ---- manifest
m = open(manifest, encoding='utf-8').read()
for perm in ('INTERNET', 'POST_NOTIFICATIONS'):
    tag = f'<uses-permission android:name="android.permission.{perm}"/>'
    if f'android.permission.{perm}' not in m:
        m = m.replace('<application', tag + '\n    <application', 1)
m = re.sub(r'android:label="[^"]*"', 'android:label="Royal Feast"', m, count=1)
open(manifest, 'w', encoding='utf-8').write(m)

# ---- gradle
kts = os.path.join(root, 'build.gradle.kts')
groovy = os.path.join(root, 'build.gradle')
if os.path.exists(kts):
    p, is_kts = kts, True
elif os.path.exists(groovy):
    p, is_kts = groovy, False
else:
    sys.exit('No android/app/build.gradle(.kts) found - did flutter create run?')
g = open(p, encoding='utf-8').read()

if is_kts:
    g = re.sub(r'minSdk\s*=\s*[^\n]+', 'minSdk = 24', g, count=1)
    if 'isCoreLibraryDesugaringEnabled' not in g:
        g = re.sub(r'(compileOptions\s*\{)', r'\1\n        isCoreLibraryDesugaringEnabled = true', g, count=1)
    if 'desugar_jdk_libs' not in g:
        g += '\n\ndependencies {\n    coreLibraryDesugaring("com.android.tools:desugar_jdk_libs:2.1.4")\n}\n'
    if 'isMinifyEnabled' not in g:
        g = re.sub(r'(release\s*\{)', r'\1\n            isMinifyEnabled = false\n            isShrinkResources = false', g, count=1)
else:
    g = re.sub(r'minSdkVersion\s+[^\n]+', 'minSdkVersion 24', g, count=1)
    if 'coreLibraryDesugaringEnabled' not in g:
        g = re.sub(r'(compileOptions\s*\{)', r'\1\n        coreLibraryDesugaringEnabled true', g, count=1)
    if 'desugar_jdk_libs' not in g:
        g += "\n\ndependencies {\n    coreLibraryDesugaring 'com.android.tools:desugar_jdk_libs:2.1.4'\n}\n"
    if 'minifyEnabled' not in g:
        g = re.sub(r'(release\s*\{)', r'\1\n            minifyEnabled false\n            shrinkResources false', g, count=1)

# ---- release signing (only when android/key.properties exists, i.e. a real upload key is present)
if os.path.exists(os.path.join(root, '..', 'key.properties')) and 'signingConfigs.getByName("release")' not in g and 'signingConfigs.release' not in g:
    if is_kts:
        imports = 'import java.util.Properties\nimport java.io.FileInputStream\n\n'
        header = ('val keystoreProperties = Properties()\n'
                  'rootProject.file("key.properties").takeIf { it.exists() }?.let { keystoreProperties.load(FileInputStream(it)) }\n\n')
        sc = ('\n    signingConfigs {\n        create("release") {\n'
              '            keyAlias = keystoreProperties["keyAlias"] as String\n'
              '            keyPassword = keystoreProperties["keyPassword"] as String\n'
              '            storeFile = file(keystoreProperties["storeFile"] as String)\n'
              '            storePassword = keystoreProperties["storePassword"] as String\n        }\n    }\n')
        g = re.sub(r'(\nandroid\s*\{)', lambda m: '\n' + header + m.group(1).lstrip('\n') + sc, g, count=1)
        g = imports + g
        g = re.sub(r'signingConfig\s*=\s*signingConfigs\.getByName\("debug"\)', 'signingConfig = signingConfigs.getByName("release")', g)
    else:
        header = ('def keystoreProperties = new Properties()\n'
                  'def keystorePropertiesFile = rootProject.file("key.properties")\n'
                  'if (keystorePropertiesFile.exists()) { keystoreProperties.load(new FileInputStream(keystorePropertiesFile)) }\n\n')
        sc = ('\n    signingConfigs {\n        release {\n'
              '            keyAlias keystoreProperties["keyAlias"]\n'
              '            keyPassword keystoreProperties["keyPassword"]\n'
              '            storeFile file(keystoreProperties["storeFile"])\n'
              '            storePassword keystoreProperties["storePassword"]\n        }\n    }\n')
        g = re.sub(r'(\nandroid\s*\{)', lambda m: '\n' + header + m.group(1).lstrip('\n') + sc, g, count=1)
        g = re.sub(r'signingConfig\s+signingConfigs\.debug', 'signingConfig signingConfigs.release', g)
    print('release signing enabled')
open(p, 'w', encoding='utf-8').write(g)
print('android/ patched OK:', os.path.basename(p))
