import { Stack } from 'expo-router'
import { StyleSheet, Text, View } from 'react-native'

const StoreAndFreeBarbersLayout = () => {
    return (
        <Stack screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#151618' },
        }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="details" />
        </Stack>
    )
}

export default StoreAndFreeBarbersLayout

