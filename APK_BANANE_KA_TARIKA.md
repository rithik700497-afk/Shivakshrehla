# Royal Feast — AAB (Play Store) + APK banane ka tarika

Play Store ko **.aab** chahiye. APK sirf apne phone par test ke liye hai. Dono ek hi build se milte hain.

## Step 1 — GitHub repo
1. github.com par free account -> **New repository** -> naam `royal-feast-app`, **Private**.
2. `royal_feast_app` folder ki saari files upload karo (hidden `.github` folder bhi).
   **KEEP-PRIVATE folder kabhi upload mat karna.**

## Step 2 — Upload key (4 secrets)
Repo > **Settings > Secrets and variables > Actions > New repository secret**.
`KEEP-PRIVATE/SECRETS.txt` kholo aur 4 secrets banao: `KEYSTORE_PASSWORD`, `KEY_PASSWORD`, `KEY_ALIAS`, `KEYSTORE_BASE64`.
(Bina secrets ke build chalega, par us AAB ko Play Store nahi lega.)

## Step 3 — Build
Repo > **Actions** > "Build Royal Feast AAB + APK" > **Run workflow**. ~12 min.
Run ke neeche **Artifacts** se download karo:
- `royal-feast-aab-playstore` -> `app-release.aab`  (Play Console mein upload)
- `royal-feast-apk` -> `app-release.apk`           (phone par install)
Fail ho to log copy karke bhejo.

## Step 4 — Play Console
1. App banao -> **Production** (ya pehle Internal/Closed testing) -> Create release -> `.aab` upload.
2. **Play App Signing** ON rakho (default). Google asli signing key sambhalta hai; aapki `.jks` sirf "upload key" hai.
3. Zaroori forms: Privacy Policy URL, **Account deletion URL**, Data safety, Content rating, Target audience.
   Details `royal-feast/PLAYSTORE.md` mein hain.
4. **Har naye upload par version badhao**: `pubspec.yaml` mein `version: 1.0.0+1` ka `+1` -> `+2`, `+3` ...

## Zaroori baatein
- `royal-feast-upload.jks` aur passwords ka **backup** rakho (Drive + pendrive). Kho gayi to Play Support se upload key reset karwani padegi.
- Package name `com.royalfeast.royal_feast_app` — Play Store par ek baar upload ke baad badal nahi sakta. Final karo to upload se pehle batao.
- Server (`royal-feast/` ka naya code) `theroyalfeast.in` par deploy hona chahiye, warna OTP login nahi chalega. Check: `https://theroyalfeast.in/api/health`.
- Push notifications: baad mein `flutterfire configure`. Uske bina app normal chalega.

## PC par banana ho to
Flutter 3.27+ + Android Studio. `android/key.properties` aur `android/app/upload-keystore.jks` rakh ke `build_apk.bat` (Windows) / `./build_apk.sh` (Mac/Linux) chalao.
`key.properties` mein: storePassword, keyPassword, keyAlias=upload, storeFile=upload-keystore.jks
