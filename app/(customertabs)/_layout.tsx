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
                name="(panel)"
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
                            icon={focused ? 'home' : 'home-outline'}
                            iconColor={focused ? '#c2a523' : '#38393b'}
                            size={30}
                            style={{ margin: 0 }}
                        />
                    ),
                    tabBarLabel: ({ focused }) => (
                        <Text
                            className={`text-xs ${focused ? 'text-[#c2a523]' : 'text-[#454648]'}`}
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
                name="(appointment)"
                options={{
                    headerStyle: {
                        backgroundColor: '#151618',
                    },
                    headerShown: true,
                    headerTitle: () => (
                        <Text className='text-lg text-white mr-0' >
                            Randevularım
                        </Text>
                    ),
                    tabBarIcon: ({ focused }) => (
                        <IconButton
                            icon={focused ? 'clock' : 'clock-outline'}
                            iconColor={focused ? '#c2a523' : '#38393b'}
                            size={30}
                            style={{ margin: 0 }}
                        />
                    ),
                    tabBarLabel: ({ focused }) => (
                        <Text
                            className={`text-xs ${focused ? 'text-[#c2a523]' : 'text-[#454648]'}`}
                        >
                            Randevular
                        </Text>
                    ),
                    headerTitleAlign: 'center',
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
                name="(messages)"
                options={{
                    headerStyle: {
                        backgroundColor: '#151618',
                    },
                    headerShown: true,
                    headerTitle: () => (
                        <Text className='text-lg text-white mr-0' >
                            Mesajlarım
                        </Text>
                    ),
                    tabBarIcon: ({ focused }) => (
                        <IconButton
                            icon={focused ? 'message' : 'message-outline'}
                            iconColor={focused ? '#c2a523' : '#38393b'}
                            size={30}
                            style={{ margin: 0 }}
                        />
                    ),
                    tabBarLabel: ({ focused }) => (
                        <Text
                            className={`text-xs ${focused ? 'text-[#c2a523]' : 'text-[#454648]'}`}
                        >
                            Mesajlar
                        </Text>
                    ),
                    headerTitleAlign: 'center',
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
                name="(favorites)"
                options={{
                    headerStyle: {
                        backgroundColor: '#151618',
                    },
                    headerShown: true,
                    headerTitle: () => (
                        <Text className='text-lg text-white mr-0' >
                            Favorilerim
                        </Text>
                    ),
                    tabBarIcon: ({ focused }) => (
                        <IconButton
                            icon={focused ? 'heart' : 'heart-outline'}
                            iconColor={focused ? '#c2a523' : '#38393b'}
                            size={30}
                            style={{ margin: 0, }}
                        />
                    ),
                    tabBarLabel: ({ focused }) => (
                        <Text
                            className={`text-xs ${focused ? 'text-[#c2a523]' : 'text-[#454648]'}`}
                        >
                            Favoriler
                        </Text>
                    ),
                    headerTitleAlign: 'center',
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
                    headerTitle: () => (
                        <Text className='text-lg text-white mr-0' >
                            Profilim
                        </Text>
                    ),
                    tabBarIcon: ({ focused }) => (
                        <IconButton
                            icon={focused ? 'account' : 'account-outline'}
                            iconColor={focused ? '#c2a523' : '#38393b'}
                            size={30}
                            style={{ margin: 0 }}
                        />
                    ),
                    tabBarLabel: ({ focused }) => (
                        <Text
                            className={`text-xs ${focused ? 'text-[#c2a523]' : 'text-[#454648]'}`}
                        >
                            Profil
                        </Text>
                    ),
                    headerTitleAlign: 'center',
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

