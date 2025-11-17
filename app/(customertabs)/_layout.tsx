import { Text, View } from 'react-native'
import { Tabs } from 'expo-router';
import { IconButton } from 'react-native-paper';

const CustomerLayout = () => {
    return (
        <Tabs
            screenOptions={{
                tabBarStyle: {
                    backgroundColor: "#191a1c",
                    borderColor: '#191a1c',
                },
                headerShown: false,

            }}>
            <Tabs.Screen
                name="(storesandfreebarbers)"

                options={{
                    headerStyle: {
                        backgroundColor: '#151618',
                    },
                    headerShown: true,
                    headerTitle: () => (
                        <Text className='text-lg text-white mr-0' >
                            Hoşgeldiniz Emir
                        </Text>
                    ),
                    tabBarIcon: ({ focused }) => (
                        <IconButton
                            icon="home"
                            iconColor={focused ? '#d5d6d8' : '#38393b'}
                            size={30}
                            style={{ margin: 0 }}
                        />
                    ),
                    tabBarLabel: ({ focused }) => (
                        <Text
                            className={`text-xs ${focused ? 'text-[#7b7c7e]' : 'text-[#454648]'}`}
                        >
                            Dükkanlar
                        </Text>
                    ),
                    headerTitleAlign: 'left',
                    headerRight: () => (
                        <IconButton
                            icon="bell-outline"
                            iconColor='white'
                            size={20}
                            onPress={() => console.log('Zil tıklandı')}
                            style={{ marginRight: 14 }}
                        />
                    ),

                }}
            />
            <Tabs.Screen
                name="(profile)"
                options={{
                    headerStyle: {
                        backgroundColor: '#151618',
                    },
                    headerShown: true,
                    tabBarIcon: ({ focused }) => (
                        <IconButton
                            icon="account"
                            iconColor={focused ? '#d5d6d8' : '#38393b'}
                            size={30}
                            style={{ margin: 0 }}
                        />
                    ),
                    tabBarLabel: ({ focused }) => (
                        <Text
                            className={`text-xs ${focused ? 'text-[#7b7c7e]' : 'text-[#454648]'}`}
                        >
                            Profile
                        </Text>
                    ),
                    headerTitleAlign: 'left',
                    headerRight: () => (
                        <IconButton
                            icon="bell-outline"
                            iconColor='white'
                            size={20}
                            onPress={() => console.log('Zil tıklandı')}
                            style={{ marginRight: 14 }}
                        />
                    ),

                }}
            />

        </Tabs>
    )
}

export default CustomerLayout

