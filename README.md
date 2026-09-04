<p align="center">
<a href="https://seanime.app/">
<img src="src/assets/images/logo_2.png" alt="preview" width="70px"/>
</a>
</p>

<h1 align="center"><b>Seanime Tenji</b></h1>

<p align="center">
<img src="https://s3.seanime.app/sea/tenji-banner.webp" alt="preview" width="100%"/>
</p>

<p align="center">
  <a href="https://seanime.app/docs">Documentation</a> |
  <a href="https://github.com/5rahim/seanime-tenji/releases">Latest release</a> |
  <a href="https://seanime.app/docs/policies">Copyright</a>
</p>

<div align="center">
  <a href="https://github.com/sponsors/5rahim">
    <img src="https://img.shields.io/static/v1?label=Sponsor&style=flat-square&message=%E2%9D%A4&logo=GitHub&color=%23fe8e86" alt="" />
  </a>
</div>


<h5 align="center">
Consider becoming a sponsor if you like the project! ⭐️
</h5>

## About

Seanime Tenji is a mobile and TV **client app** for your Seanime media server with a **built-in player** and **offline support** for streaming anime and reading manga.

> [!IMPORTANT]
> Seanime Tenji does not provide, host, or distribute any media content. Users are responsible for obtaining media through legal means and complying with their local laws. </strong>

## Features

- **Cross-platform**: Available on Android, AndroidTV, iOS and tvOS
- **Built-in media player**: Powered by libmpv, supports most anime codecs and formats
- **Playback Options**: Support for server local files, torrent, debrid and online streaming
- **Manga Reader**: Read and download chapters on iOS and Android
- **Download locally**: Download anime episodes and manga chapters to your mobile device
- **External Player Support**: Support for opening media in Android and iOS external players such as VLC, MX Player, Outplayer, etc.
- **Offline Mode**: Access your downloaded anime episodes and manga chapters without an internet connection

## Development

Seanime Tenji is built with React Native and Expo. Detailed guides on setup and local development workflows can be found in the [Contributing Guide](CONTRIBUTING.md).

### ZDOST custom build

This fork uses private application identifiers and has official Expo OTA updates disabled by default, so it can be installed alongside the official app without being replaced by upstream updates. The phone build uses `app.zdost.seanime.tenji`; the Android TV build uses `app.zdost.seanime.tenji.tv`, so both variants can be installed independently.

On TV, the Anime home screen reads Seanime's `/api/v1/status/home-items` layout from the connected server. Continue-watching, library, local-library, trending, recently-aired, missed-sequel, centered-title, and anime-carousel items are supported; manga, calendar, and statistics item types are skipped on this anime surface.

After installing Android Studio (including an Android SDK and Java), build a release APK with:

```powershell
npm install
npx expo run:android --variant release
```

Build the Android TV variant with:

```powershell
$env:EXPO_TV = "1"
npx expo run:android --variant release
```

For one APK that is recognized by both Android phones and Android TV, use the TV-configured command above. `androidTVRequired` remains false, so the TV-configured APK keeps mobile support while adding the TV launcher metadata and remote-friendly orientation. The plain command produces a phone-configured build.

Private OTA updates can be enabled only when both `SEANIME_ENABLE_OTA=1` and `SEANIME_OTA_URL` are supplied. The package identifiers can be overridden with `EXPO_ANDROID_PACKAGE` and `EXPO_IOS_BUNDLE_ID` when producing a differently named build.

---

> [!NOTE]
> For copyright-related requests, please contact the maintainer using the contact information provided on [the website](https://seanime.app/docs/policies).
