# libmpv JNI Libraries

This directory must contain the prebuilt `libmpv.so`, `libplayer.so`, and their FFmpeg shared-library dependencies for each ABI.

## Required Structure

```
jniLibs/
  arm64-v8a/
    libavcodec.so
    libavdevice.so
    libavfilter.so
    libavformat.so
    libavutil.so
    libmpv.so
    libplayer.so
    libswresample.so
    libswscale.so
  armeabi-v7a/
    libavcodec.so
    libavdevice.so
    libavfilter.so
    libavformat.so
    libavutil.so
    libmpv.so
    libplayer.so
    libswresample.so
    libswscale.so
  x86_64/
    libavcodec.so
    libavdevice.so
    libavfilter.so
    libavformat.so
    libavutil.so
    libmpv.so
    libplayer.so
    libswresample.so
    libswscale.so
  x86/
    libavcodec.so
    libavdevice.so
    libavfilter.so
    libavformat.so
    libavutil.so
    libmpv.so
    libplayer.so
    libswresample.so
    libswscale.so
```

## How to Obtain

The recommended source is the [mpv-android](https://github.com/mpv-android/mpv-android) project.

### Option A: Download from mpv-android releases

1. Go to https://github.com/mpv-android/mpv-android/releases
2. Download the universal debug APK
3. Extract `libmpv.so`, `libplayer.so`, and all `libav*.so`/`libsw*.so` files from `lib/{abi}/` inside the APK (it's a zip)
4. Place them in the above structure
5. Remove `libc++_shared.so` from each ABI (React Native provides it; the app build plugin replaces it when needed)

`libmpv.so` is dynamically linked against FFmpeg. Shipping only `libmpv.so` and `libplayer.so` causes Android's linker to fail with a missing `libavcodec.so` error during playback.

### Option B: Build from source

1. Clone https://github.com/mpv-android/mpv-android
2. Follow their buildscripts README to compile libmpv for Android
3. Copy the resulting `.so` files here

## Pinned Version

- **mpv-android version:** 2026-03-22 release
- **Source:** https://github.com/mpv-android/mpv-android/releases/tag/2026-03-22
- **Date obtained:** 2025-07-03
