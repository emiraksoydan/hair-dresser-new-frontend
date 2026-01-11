import { TouchableOpacity, View } from 'react-native'
import { Text } from '../components/common/Text'
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
import React, { useState, useMemo } from 'react';
import { InfoModal } from '../components/common/infomodal';
import { HeaderDropdownMenu } from '../components/common/headerdropdownmenu';
import { useNotificationSound } from '../hook/useNotificationSound';
import { useGetHelpGuideByUserTypeQuery } from '../store/api';
import { UserType } from '../types';
import { useLanguage } from '../hook/useLanguage';

const CustomerLayout = () => {
    const { t } = useLanguage();
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
    const { userName, userType } = useAuth();

    // Play notification sound when badge count changes
    useNotificationSound(unreadNoti);

    // Help guide items - API'den dinamik olarak çek
    const { data: helpGuideResponse, isLoading: isLoadingHelpGuide } = useGetHelpGuideByUserTypeQuery(
        UserType.Customer,
        { skip: userType !== UserType.Customer }
    );

    // API'den gelen veriyi InfoModal formatına dönüştür (fallback olarak hardcoded veriler)
    const infoItems = useMemo(() => {
        if (helpGuideResponse?.success && helpGuideResponse?.data && helpGuideResponse.data.length > 0) {
            return helpGuideResponse.data.map((guide) => ({
                title: guide.title,
                description: guide.description,
            }));
        }
        return [];
    }, [helpGuideResponse]);
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
                                {userName ? t('navigation.welcomeWithName', { name: userName }) : t('navigation.welcome')}
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
                                {t('navigation.shops')}
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
                                            label: t('navigation.info'),
                                            onPress: () => setInfoModalVisible(true),
                                        },
                                        {
                                            icon: 'shopping-outline',
                                            label: t('navigation.shopping'),
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
                                {t('navigation.myAppointments')}
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
                                {t('navigation.appointments')}
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
                                            label: t('navigation.info'),
                                            onPress: () => setInfoModalVisible(true),
                                        },
                                        {
                                            icon: 'shopping-outline',
                                            label: t('navigation.shopping'),
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
                                {t('navigation.myMessages')}
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
                                {t('navigation.messages')}
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
                                            label: t('navigation.info'),
                                            onPress: () => setInfoModalVisible(true),
                                        },
                                        {
                                            icon: 'shopping-outline',
                                            label: t('navigation.shopping'),
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
                                {t('navigation.myFavorites')}
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
                                {t('navigation.favorites')}
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
                                            label: t('navigation.info'),
                                            onPress: () => setInfoModalVisible(true),
                                        },
                                        {
                                            icon: 'shopping-outline',
                                            label: t('navigation.shopping'),
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
                                {t('profile.myProfile')}
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
                                {t('navigation.profile')}
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
                                            label: t('navigation.info'),
                                            onPress: () => setInfoModalVisible(true),
                                        },
                                        {
                                            icon: 'shopping-outline',
                                            label: t('navigation.shopping'),
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
                title={t('navigation.usageInfo')}
                items={infoItems}
            />
        </>
    )
}

export default CustomerLayout

