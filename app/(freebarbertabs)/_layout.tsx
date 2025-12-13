import { Tabs } from 'expo-router'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Icon, IconButton } from 'react-native-paper'
import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import { useGetBadgeCountsQuery } from '../store/api';
import { BadgeIconButton } from '../components/common/badgeiconbutton';
import { useAuth } from '../hook/useAuth';
import { useBottomSheetRegistry, useSheet } from '../context/bottomsheet';
import { NotificationsSheet } from '../components/appointment/notificationdetail';

const FreeBarberLayout = () => {
    const { setRef, makeBackdrop } = useBottomSheetRegistry();
    const { present: presentNoti, dismiss: dismissNoti } = useSheet("notifications");
    const { data: badge } = useGetBadgeCountsQuery();
    const unreadNoti = badge?.unreadNotifications ?? 0;
    const unreadMsg = badge?.unreadMessages ?? 0;
    const { userName } = useAuth();

    return (
        <>
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
                                {userName ? `Hoşgeldiniz ${userName}` : 'Hoşgeldiniz'}
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
                            <BadgeIconButton
                                icon="bell-outline"
                                iconColor="white"
                                size={20}
                                badgeCount={unreadNoti}
                                onPress={presentNoti}
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
                            <BadgeIconButton
                                icon="bell-outline"
                                iconColor="white"
                                size={20}
                                badgeCount={unreadNoti}
                                onPress={presentNoti}
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
                            <BadgeIconButton
                                icon="bell-outline"
                                iconColor="white"
                                size={20}
                                badgeCount={unreadNoti}
                                onPress={presentNoti}
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
                            <BadgeIconButton
                                icon="bell-outline"
                                iconColor="white"
                                size={20}
                                badgeCount={unreadNoti}
                                onPress={presentNoti}
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
                            <BadgeIconButton
                                icon="bell-outline"
                                iconColor="white"
                                size={20}
                                badgeCount={unreadNoti}
                                onPress={presentNoti}
                            />
                        ),

                    }}
                />

            </Tabs>
            <BottomSheetModal
                backdropComponent={makeBackdrop({ appearsOnIndex: 0, disappearsOnIndex: -1, pressBehavior: "close" })}
                handleIndicatorStyle={{ backgroundColor: "#47494e" }}
                backgroundStyle={{ backgroundColor: "#151618" }}
                ref={(inst) => setRef("notifications", inst)}
                snapPoints={["100%"]}
                enableOverDrag={false}
                enablePanDownToClose
            >
                <BottomSheetView style={{ flex: 1, paddingTop: 8 }}>
                    <NotificationsSheet onClose={dismissNoti} autoOpenFirstUnread={true} />
                </BottomSheetView>
            </BottomSheetModal>
        </>
    )
}

export default FreeBarberLayout

