# Seanime Tenji ZDOST

Custom Tenji client builds for connecting to a Seanime media server.

> [!IMPORTANT]
> Seanime Tenji does not provide, host, or distribute any media content. Users are responsible for obtaining media through legal means and complying with their local laws.

## Custom builds

- Separate application IDs allow the phone and Android TV builds to coexist:
  - Phone: `app.zdost.seanime.tenji`
  - Android TV: `app.zdost.seanime.tenji.tv`
- Expo OTA updates are disabled by default.
- Android TV supports external player selection.
- The TV anime home screen reads the connected server's `/api/v1/status/home-items` layout.
- The TV release is packaged as a universal ARM APK for broad Android TV compatibility.

Release APKs are available from the [Releases](https://github.com/ZDOSt/seanime-tenji/releases) page.

## Build

Install Node.js, Java, Android Studio, and an Android SDK, then run:

```powershell
npm install
npx expo run:android --variant release
```

For the Android TV-configured build:

```powershell
$env:EXPO_TV = "1"
npx expo run:android --variant release
```

The TV-configured APK keeps mobile support enabled while adding Android TV launcher metadata and remote-friendly orientation.
