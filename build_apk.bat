@echo off
REM Windows: double-click or run build_apk.bat  (Flutter + Android Studio must be installed)
set API_BASE=https://theroyalfeast.in
if not exist android (
  xcopy /E /I /Y test %TEMP%\rf_test_keep >nul
  xcopy /E /I /Y lib %TEMP%\rf_lib_keep >nul
  call flutter create --org com.royalfeast --project-name royal_feast_app --platforms android .
  rmdir /S /Q test
  rmdir /S /Q lib
  xcopy /E /I /Y %TEMP%\rf_test_keep test >nul
  xcopy /E /I /Y %TEMP%\rf_lib_keep lib >nul
)
python tool\patch_android.py || py tool\patch_android.py
call flutter pub get
call dart run flutter_launcher_icons
call flutter build appbundle --release --dart-define=API_BASE=%API_BASE%
call flutter build apk --release --dart-define=API_BASE=%API_BASE%
echo.
echo AAB: build\app\outputs\bundle\release\app-release.aab
echo APK: build\app\outputs\flutter-apk\app-release.apk
pause
