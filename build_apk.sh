#!/usr/bin/env bash
# Mac/Linux: ./build_apk.sh   (Flutter + Android SDK must be installed)
set -e
API_BASE="${API_BASE:-https://theroyalfeast.in}"
[ -d android ] || { cp -r test /tmp/rf_test_keep; cp -r lib /tmp/rf_lib_keep; flutter create --org com.royalfeast --project-name royal_feast_app --platforms android .; rm -rf test lib; mv /tmp/rf_test_keep test; mv /tmp/rf_lib_keep lib; }
# Play Store signing: put android/key.properties + android/app/upload-keystore.jks first (see APK_BANANE_KA_TARIKA.md)
python3 tool/patch_android.py
flutter pub get
dart run flutter_launcher_icons
flutter build appbundle --release --dart-define=API_BASE="$API_BASE"
flutter build apk --release --dart-define=API_BASE="$API_BASE"
echo; echo "AAB: build/app/outputs/bundle/release/app-release.aab"; echo "APK: build/app/outputs/flutter-apk/app-release.apk"
