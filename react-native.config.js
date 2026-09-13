const isTV = process.env.EXPO_TV === "1"
const off = { platforms: { ios: null } }

module.exports = {
    // Keep React Native's generated entry point in the same namespace as the
    // Expo/Gradle application when producing the separate TV APK.
    project: {
        android: {
            packageName: isTV ? "app.zdost.seanime.tenji.tv" : "app.zdost.seanime.tenji",
        },
    },
    dependencies: isTV
        ? {
            "@react-native-community/datetimepicker": off,
            "@react-native-community/slider": off,
            "@react-native-menu/menu": off,
            "react-native-ios-context-menu": off,
            "react-native-ios-utilities": off,
            "react-native-volume-manager": off,
        }
        : {},
}
