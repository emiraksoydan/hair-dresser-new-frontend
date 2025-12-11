import { Tabs } from 'expo-router'
import { StyleSheet, Text, View } from 'react-native'
import { IconButton } from 'react-native-paper'
import { useGetBadgeCountsQuery } from '../store/api';
import { BadgeIconButton } from '../components/common/badgeiconbutton';

const FreeBarberLayout = () => {
    const { data: badge } = useGetBadgeCountsQuery();
    const unreadMsg = badge?.unreadMessages ?? 0;

    return (
        <Tabs
            screenOptions={{
                tabBarStyle: {
                    backgroundColor: "#191a1c",
                    borderColor: '#191a1c',
                },
                headerShown: false,

            }}>
            <Tabs.Screen name="index" options={{ href: null }} />
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
                            icon={focused ? 'store' : 'store-outline'}
                            iconColor={focused ? '#c2a523' : '#38393b'}
                            size={30}
                            style={{ margin: 0 }}
                        />
                    ),
                    tabBarLabel: ({ focused }) => (
                        <Text
                            className={`text-xs ${focused ? 'text-[#c2a523]' : 'text-[#454648]'}`}
                        >
                            İşletmeler
                        </Text>
                    ),
                    headerTitleAlign: 'left',
                    headerRight: () => (
                        <IconButton
                            icon="bell-outline"
                            iconColor='white'
                            size={20}
                            onPress={() => {
                                // Notification bell - to be implemented
                            }}
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
                            onPress={() => {
                                // Notification bell - to be implemented
                            }}
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
                        <BadgeIconButton
                            icon={focused ? 'message' : 'message-outline'}
                            iconColor={focused ? '#c2a523' : '#38393b'}
                            size={30}
                            badgeCount={unreadMsg}
                            onPress={undefined}
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
                            onPress={() => {
                                // Notification bell - to be implemented
                            }}
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
                            onPress={() => {
                                // Notification bell - to be implemented
                            }}
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
                            onPress={() => {
                                // Notification bell - to be implemented
                            }}
                            style={{ marginRight: 14 }}
                        />
                    ),

                }}
            />

        </Tabs>
    )
}

export default FreeBarberLayout

