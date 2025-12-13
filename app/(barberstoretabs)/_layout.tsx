import { Dimensions, Text, TouchableOpacity, View } from 'react-native'
import { Tabs } from 'expo-router';
import { Icon, IconButton } from 'react-native-paper';
import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import FormStoreAdd from '../components/store/formstoreadd';
import { useBottomSheetRegistry, useSheet } from '../context/bottomsheet';
import { useGetBadgeCountsQuery } from '../store/api';
import { BadgeIconButton } from '../components/common/badgeiconbutton';
import { NotificationsSheet } from '../components/appointment/notificationsheet';
import { useAuth } from '../hook/useAuth';

const BarberStoreLayout = () => {

    const { setRef, makeBackdrop } = useBottomSheetRegistry();
    const { present } = useSheet('addStore');
    const { present: presentNoti, dismiss: dismissNoti } = useSheet("notifications");
    const { userName } = useAuth();

    const { data: badge } = useGetBadgeCountsQuery();
    const unreadNoti = badge?.unreadNotifications ?? 0;
    const unreadMsg = badge?.unreadMessages ?? 0;

    return (
        <>
            <Tabs
                initialRouteName="(panel)"
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
                            <Text className='text-lg  text-white mr-0' >
                                {userName ? `Hoşgeldiniz ${userName}` : 'Hoşgeldiniz'}
                            </Text>
                        ),
                        tabBarIcon: ({ focused }) => (
                            <IconButton
                                icon={focused ? 'store' : 'store-outline'}
                                iconColor={focused ? '#f05e23' : '#38393b'}
                                size={30}
                                style={{ margin: 0, }}
                            />
                        ),
                        tabBarLabel: ({ focused }) => (
                            <Text
                                className={`text-xs ${focused ? 'text-[#f05e23]' : 'text-[#454648]'}`}
                            >
                                Dükkanlar
                            </Text>
                        ),
                        headerTitleAlign: 'left',
                        headerRight: () => (
                            <View className='flex-row'>
                                <TouchableOpacity
                                    onPress={present}
                                    className='items-center justify-center mr-[-5px]'
                                >
                                    <Icon source={"plus"} size={25} color='white'></Icon>
                                </TouchableOpacity>
                                <BadgeIconButton
                                    icon="bell-outline"
                                    iconColor="white"
                                    size={20}
                                    badgeCount={unreadNoti}
                                    onPress={presentNoti}
                                />
                            </View>
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
                                iconColor={focused ? '#f05e23' : '#38393b'}
                                size={30}
                                style={{ margin: 0, }}
                            />
                        ),
                        tabBarLabel: ({ focused }) => (
                            <Text
                                className={`text-xs ${focused ? 'text-[#f05e23]' : 'text-[#454648]'}`}
                            >
                                Randevular
                            </Text>
                        ),
                        headerTitleAlign: 'center',
                        headerRight: () => (
                            <View className='flex-row'>
                                <TouchableOpacity
                                    onPress={present}
                                    className='items-center justify-center mr-[-5px]'
                                >
                                    <Icon source={"plus"} size={25} color='white'></Icon>
                                </TouchableOpacity>
                                <BadgeIconButton
                                    icon="bell-outline"
                                    iconColor="white"
                                    size={20}
                                    badgeCount={unreadNoti}
                                    onPress={presentNoti}
                                />
                            </View>
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
                                icon={focused ? "message" : "message-outline"}
                                iconColor={focused ? "#f05e23" : "#38393b"}
                                size={30}
                                badgeCount={unreadMsg}
                                onPress={undefined} // tab zaten navigation yapıyor
                            />
                        ),
                        tabBarLabel: ({ focused }) => (
                            <Text
                                className={`text-xs ${focused ? 'text-[#f05e23]' : 'text-[#454648]'}`}
                            >
                                Mesajlar
                            </Text>
                        ),
                        headerTitleAlign: 'center',
                        headerRight: () => (
                            <View className='flex-row'>
                                <TouchableOpacity
                                    onPress={present}
                                    className='items-center justify-center mr-[-5px]'
                                >
                                    <Icon source={"plus"} size={25} color='white'></Icon>
                                </TouchableOpacity>
                                <BadgeIconButton
                                    icon="bell-outline"
                                    iconColor="white"
                                    size={20}
                                    badgeCount={unreadNoti}
                                    onPress={presentNoti}
                                />
                            </View>
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
                                iconColor={focused ? '#f05e23' : '#38393b'}
                                size={30}
                                style={{ margin: 0, }}
                            />
                        ),
                        tabBarLabel: ({ focused }) => (
                            <Text
                                className={`text-xs ${focused ? 'text-[#f05e23]' : 'text-[#454648]'}`}
                            >
                                Favoriler
                            </Text>
                        ),
                        headerTitleAlign: 'center',
                        headerRight: () => (
                            <View className='flex-row'>
                                <TouchableOpacity
                                    onPress={present}
                                    className='items-center justify-center mr-[-5px]'
                                >
                                    <Icon source={"plus"} size={25} color='white'></Icon>
                                </TouchableOpacity>
                                <BadgeIconButton
                                    icon="bell-outline"
                                    iconColor="white"
                                    size={20}
                                    badgeCount={unreadNoti}
                                    onPress={presentNoti}
                                />
                            </View>
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
                                iconColor={focused ? '#f05e23' : '#38393b'}
                                size={30}
                                style={{ margin: 0, }}
                            />
                        ),
                        tabBarLabel: ({ focused }) => (
                            <Text
                                className={`text-xs ${focused ? 'text-[#f05e23]' : 'text-[#454648]'}`}
                            >
                                Profil
                            </Text>
                        ),
                        headerTitleAlign: 'center',
                        headerRight: () => (
                            <View className='flex-row'>
                                <TouchableOpacity
                                    onPress={present}
                                    className='items-center justify-center mr-[-5px]'
                                >
                                    <Icon source={"plus"} size={25} color='white'></Icon>
                                </TouchableOpacity>
                                <BadgeIconButton
                                    icon="bell-outline"
                                    iconColor="white"
                                    size={20}
                                    badgeCount={unreadNoti}
                                    onPress={presentNoti}
                                />
                            </View>
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
            <BottomSheetModal
                backdropComponent={makeBackdrop({ appearsOnIndex: 0, disappearsOnIndex: -1, pressBehavior: 'close' })}
                handleIndicatorStyle={{ backgroundColor: '#47494e' }}
                backgroundStyle={{ backgroundColor: '#151618' }}
                ref={(inst) => setRef('addStore', inst)}
                snapPoints={['100%']} enableOverDrag={false} enablePanDownToClose={false}>
                <BottomSheetView className='h-full pt-2'>
                    <FormStoreAdd  ></FormStoreAdd>
                </BottomSheetView>
            </BottomSheetModal>
        </>


    )
}

export default BarberStoreLayout

