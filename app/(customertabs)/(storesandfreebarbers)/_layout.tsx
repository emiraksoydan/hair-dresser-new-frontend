import { Stack } from 'expo-router'
import { StyleSheet, Text, View } from 'react-native'

const StoreAndFreeBarbersLayout = () => {
    return (
        <Stack screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#151618' },
        }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="details/[id]" />
        </Stack>
    )
}

export default StoreAndFreeBarbersLayout

