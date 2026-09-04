import type { ConfigContext, ExpoConfig } from "expo/config"

export default ({ config }: ConfigContext): ExpoConfig => {
    const isTV = process.env.EXPO_TV === "1"
    const isTVDev = isTV && process.env.SEANIME_TV_DEV === "1"
    const version = "0.3.0"
    const androidPackage = process.env.EXPO_ANDROID_PACKAGE || (isTV ? "app.zdost.seanime.tenji.tv" : "app.zdost.seanime.tenji")
    const iosBundleIdentifier = process.env.EXPO_IOS_BUNDLE_ID || "app.zdost.seanime.tenji"
    const otaChannel = process.env.SEANIME_OTA_CHANNEL || (isTV ? "stable-tv" : "stable")
    const otaUrl = process.env.SEANIME_OTA_URL
    const otaEnabled = process.env.SEANIME_ENABLE_OTA === "1" && !!otaUrl && !isTVDev
    const appName = process.env.SEANIME_APP_NAME || (isTV ? "Seanime ZDOST TV" : "Seanime ZDOST")

    return {
        ...config,
        name: appName,
        slug: "seanime-app",
        version,
        orientation: isTV ? "default" : "portrait",
        icon: "./src/assets/images/icon.png",
        scheme: "seanime",
        userInterfaceStyle: "automatic",
        runtimeVersion: `${version}-zdost${isTV ? "-tv" : ""}`,
        updates: !otaEnabled ? {
            enabled: false,
        } : {
            enabled: true,
            url: otaUrl!,
            checkAutomatically: "NEVER",
            fallbackToCacheTimeout: 0,
            requestHeaders: {
                "expo-channel-name": otaChannel,
            },
        },
        ios: {
            buildNumber: "23",
            appleTeamId: process.env.EXPO_APPLE_TEAM_ID || "",
            supportsTablet: true,
            bundleIdentifier: iosBundleIdentifier,
            infoPlist: {
                NSLocalNetworkUsageDescription: "Seanime needs local network access to connect to your server on your home network.",
                UIBackgroundModes: [
                    "audio",
                ],
                LSApplicationQueriesSchemes: [
                    "vlc",
                    "outplayer",
                    "infuse",
                    "nplayer-http",
                    "oplayer",
                    "mangoplayer",
                ],
                UISupportedInterfaceOrientations: [
                    "UIInterfaceOrientationPortrait",
                    "UIInterfaceOrientationPortraitUpsideDown",
                    "UIInterfaceOrientationLandscapeLeft",
                    "UIInterfaceOrientationLandscapeRight",
                ],
                "UISupportedInterfaceOrientations~ipad": [
                    "UIInterfaceOrientationPortrait",
                    "UIInterfaceOrientationPortraitUpsideDown",
                    "UIInterfaceOrientationLandscapeLeft",
                    "UIInterfaceOrientationLandscapeRight",
                ],
            },
        },
        android: {
            jsEngine: "hermes",
            versionCode: 23,
            usesCleartextTraffic: true,
            adaptiveIcon: {
                foregroundImage: "./src/assets/images/adaptive-icon.png",
                backgroundColor: "#171140",
            },
            permissions: [
                "WRITE_SETTINGS",
            ],
            package: androidPackage,
        } as any,
        plugins: [
            [
                "@react-native-tvos/config-tv",
                {
                    androidTVRequired: false,
                    androidTVBanner: "./src/assets/images/tv/android-tv-banner.png",
                    androidTVIcon: "./src/assets/images/icon.png",
                    appleTVImages: {
                        icon: "./src/assets/images/tv/tvos-icon.png",
                        iconSmall: "./src/assets/images/tv/tvos-icon-small.png",
                        iconSmall2x: "./src/assets/images/tv/tvos-icon-small-2x.png",
                        topShelf: "./src/assets/images/tv/tvos-top-shelf.png",
                        topShelf2x: "./src/assets/images/tv/tvos-top-shelf-2x.png",
                        topShelfWide: "./src/assets/images/tv/tvos-top-shelf-wide.png",
                        topShelfWide2x: "./src/assets/images/tv/tvos-top-shelf-wide-2x.png",
                    },
                },
            ],
            "expo-router",
            [
                "expo-splash-screen",
                {
                    image: "./src/assets/images/splash-logo.png",
                    resizeMode: "contain",
                    backgroundColor: "#070707",
                    android: {
                        imageWidth: 200,
                        resizeMode: "contain",
                    },
                    ios: {
                        imageWidth: 100,
                        resizeMode: "contain",
                    },
                },
            ],
            "expo-font",
            "expo-status-bar",
            "@react-native-community/datetimepicker",
            "./plugins/withAndroidExternalPlayerQueries",
            "./plugins/withAndroidLanCleartext",
            "./plugins/withAndroidGradleProperties",
            "./plugins/withLibcppPickFirst",
            "./plugins/withPiPSupport",
            "./plugins/withMPVKitiOS",
            "./plugins/withExpoDownloadManageriOS",
            "./plugins/withExpoOfflineLoggeriOS",
            "expo-updates",
            "expo-image",
        ],
        experiments: {
            typedRoutes: true,
            reactCompiler: true,
        },
        extra: {
            ...config.extra,
            tv: {
                enabled: isTV,
                isDev: isTVDev,
            },
        },
    }
}
