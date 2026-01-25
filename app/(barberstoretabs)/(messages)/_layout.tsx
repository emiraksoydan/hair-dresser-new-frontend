import { Stack } from 'expo-router'
import { View } from 'react-native'
import { Text } from '../../components/common/Text'

const MessagesLayout = () => {
    return (
        <Stack screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#0d0d12' },
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

