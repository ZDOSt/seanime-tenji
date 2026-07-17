const isTV = process.env.EXPO_TV === "1"
const off = { platforms: { ios: null } }

module.exports = {
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
