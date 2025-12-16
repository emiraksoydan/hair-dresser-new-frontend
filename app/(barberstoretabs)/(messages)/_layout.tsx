import { Stack } from 'expo-router'
import { Text, View } from 'react-native'

const MessagesLayout = () => {
    return (
        <Stack screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#151618' },
        }}>
            <Stack.Screen name="index" />
            <Stack.Screen 
                name="details" 
                options={{
                    presentation: 'modal',
                    headerShown: false,
                }}
            />
        </Stack>
    )
}

export default MessagesLayout

