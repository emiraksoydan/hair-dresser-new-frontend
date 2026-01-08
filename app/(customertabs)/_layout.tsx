import { Text, TouchableOpacity, View } from 'react-native'
import { Tabs } from 'expo-router';
import { Icon, IconButton } from 'react-native-paper';
import { useAppDispatch } from '../store/hook';
import { showSnack } from '../store/snackbarSlice';
import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import { useGetBadgeCountsQuery } from '../store/api';
import { BadgeIconButton } from '../components/common/badgeiconbutton';
import { useAuth } from '../hook/useAuth';
import { useBottomSheet } from '../hook/useBottomSheet';
import { NotificationsSheet } from '../components/appointment/notificationsheet';
import React, { useState } from 'react';
import { InfoModal } from '../components/common/infomodal';
import { HeaderDropdownMenu } from '../components/common/headerdropdownmenu';
import { useNotificationSound } from '../hook/useNotificationSound';

const CustomerLayout = () => {
    const [infoModalVisible, setInfoModalVisible] = useState(false);
    const dispatch = useAppDispatch();

    // Bottom sheet hook
    const notificationsSheet = useBottomSheet({
        snapPoints: ["100%"],
        enablePanDownToClose: true,
        enableOverDrag: false,
    });
    const { data: badge } = useGetBadgeCountsQuery();
    const unreadNoti = badge?.unreadNotifications ?? 0;
    const unreadMsg = badge?.unreadMessages ?? 0;
    const { userName } = useAuth();

    // Play notification sound when badge count changes
    useNotificationSound(unreadNoti);

    // Info modal items - kullanıcı buraya uygulamanın kullanım bilgilerini ekleyecek
    const infoItems = [
        {
            title: "Uygulama Kullanım Bilgileri",
            description: "Buraya uygulamanın kullanım bilgileri eklenecek",
        },
        // Daha fazla item eklenebilir
    ];
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
                            <View className='items-center justify-center flex-row mr-2'>
                                <BadgeIconButton
                                    icon="bell-outline"
                                    iconColor="white"
                                    size={20}
                                    badgeCount={unreadNoti}
                                    onPress={() => notificationsSheet.present()}
                                    animateWhenActive={true}
                                />
                                <HeaderDropdownMenu
                                    items={[
                                        {
                                            icon: 'information-outline',
                                            label: 'Bilgi',
                                            onPress: () => setInfoModalVisible(true),
                                        },
                                        {
                                            icon: 'shopping-outline',
                                            label: 'Alışveriş',
                                            onPress: () => { },
                                        },
                                    ]}
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
                            <View className='items-center justify-center flex-row mr-2'>
                                <BadgeIconButton
                                    icon="bell-outline"
                                    iconColor="white"
                                    size={20}
                                    badgeCount={unreadNoti}
                                    onPress={() => notificationsSheet.present()}
                                    animateWhenActive={true}
                                />
                                <HeaderDropdownMenu
                                    items={[
                                        {
                                            icon: 'information-outline',
                                            label: 'Bilgi',
                                            onPress: () => setInfoModalVisible(true),
                                        },
                                        {
                                            icon: 'shopping-outline',
                                            label: 'Alışveriş',
                                            onPress: () => { },
                                        },
                                    ]}
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
                            <View className='items-center justify-center flex-row mr-2'>
                                <BadgeIconButton
                                    icon="bell-outline"
                                    iconColor="white"
                                    size={20}
                                    badgeCount={unreadNoti}
                                    onPress={() => notificationsSheet.present()}
                                    animateWhenActive={true}
                                />
                                <HeaderDropdownMenu
                                    items={[
                                        {
                                            icon: 'information-outline',
                                            label: 'Bilgi',
                                            onPress: () => setInfoModalVisible(true),
                                        },
                                        {
                                            icon: 'shopping-outline',
                                            label: 'Alışveriş',
                                            onPress: () => { },
                                        },
                                    ]}
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
                            <View className='items-center justify-center flex-row mr-2'>
                                <BadgeIconButton
                                    icon="bell-outline"
                                    iconColor="white"
                                    size={20}
                                    badgeCount={unreadNoti}
                                    onPress={() => notificationsSheet.present()}
                                    animateWhenActive={true}
                                />
                                <HeaderDropdownMenu
                                    items={[
                                        {
                                            icon: 'information-outline',
                                            label: 'Bilgi',
                                            onPress: () => setInfoModalVisible(true),
                                        },
                                        {
                                            icon: 'shopping-outline',
                                            label: 'Alışveriş',
                                            onPress: () => { },
                                        },
                                    ]}
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
                            <View className='items-center justify-center flex-row mr-2'>
                                <BadgeIconButton
                                    icon="bell-outline"
                                    iconColor="white"
                                    size={20}
                                    badgeCount={unreadNoti}
                                    onPress={() => notificationsSheet.present()}
                                    animateWhenActive={true}
                                />
                                <HeaderDropdownMenu
                                    items={[
                                        {
                                            icon: 'information-outline',
                                            label: 'Bilgi',
                                            onPress: () => setInfoModalVisible(true),
                                        },
                                        {
                                            icon: 'shopping-outline',
                                            label: 'Alışveriş',
                                            onPress: () => { },
                                        },
                                    ]}
                                />
                            </View>
                        ),

                    }}
                />
            </Tabs>
            <BottomSheetModal
                ref={notificationsSheet.ref}
                backdropComponent={notificationsSheet.makeBackdrop()}
                handleIndicatorStyle={{ backgroundColor: "#47494e" }}
                backgroundStyle={{ backgroundColor: "#151618" }}
                snapPoints={notificationsSheet.snapPoints}
                enableOverDrag={notificationsSheet.enableOverDrag}
                enablePanDownToClose={notificationsSheet.enablePanDownToClose}
                onChange={notificationsSheet.handleChange}
            >
                <NotificationsSheet
                    onClose={() => notificationsSheet.dismiss()}
                    autoOpenFirstUnread={true}
                    onDeleteSuccess={(message) => {
                        dispatch(showSnack({ message, isError: false }));
                    }}
                    onDeleteInfo={(message) => {
                        dispatch(showSnack({ message, isError: true }));
                    }}
                    onDeleteError={(message) => {
                        dispatch(showSnack({ message, isError: true }));
                    }}
                />
            </BottomSheetModal>
            <InfoModal
                visible={infoModalVisible}
                onClose={() => setInfoModalVisible(false)}
                title="Kullanım Bilgileri"
                items={infoItems}
            />
        </>
    )
}

export default CustomerLayout

