import { Text, TouchableOpacity, View } from 'react-native'
import { Tabs } from 'expo-router';
import { Icon, IconButton, Snackbar, Portal } from 'react-native-paper';
import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import React, { useState } from 'react';
import FormStoreAdd from '../components/store/formstoreadd';
import { useBottomSheet } from '../hook/useBottomSheet';
import { useGetBadgeCountsQuery } from '../store/api';
import { BadgeIconButton } from '../components/common/badgeiconbutton';
import { NotificationsSheet } from '../components/appointment/notificationsheet';
import { useAuth } from '../hook/useAuth';
import { DeferredRender } from '../components/common/deferredrender';
import { CrudSkeletonComponent } from '../components/common/crudskeleton';
import { InfoModal } from '../components/common/infomodal';

const BarberStoreLayout = () => {
    const { userName } = useAuth();
    const [infoModalVisible, setInfoModalVisible] = useState(false);

    // Bottom sheet hooks
    const addStoreSheet = useBottomSheet({
        snapPoints: ['100%'],
        enablePanDownToClose: false,
        enableOverDrag: false,
    });
    const [snackbarVisible, setSnackbarVisible] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState("");
    const [snackbarIsError, setSnackbarIsError] = useState(false);

    const notificationsSheet = useBottomSheet({
        snapPoints: ["100%"],
        enablePanDownToClose: true,
        enableOverDrag: false,
    });

    // Info modal items - kullanıcı buraya uygulamanın kullanım bilgilerini ekleyecek
    const infoItems = [
        {
            title: "Uygulama Kullanım Bilgileri",
            description: "Buraya uygulamanın kullanım bilgileri eklenecek",
        },
        // Daha fazla item eklenebilir
    ];

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
                                    onPress={() => setInfoModalVisible(true)}
                                    className=' items-center justify-center mr-[7px]'
                                >
                                    <Icon source={"information-outline"} size={25} color='white'></Icon>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => { }}
                                    className=' items-center justify-center mr-[7px]'
                                >
                                    <Icon source={"shopping-outline"} size={25} color='white'></Icon>

                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => addStoreSheet.present()}
                                    className='items-center justify-center mr-[-5px]'
                                >
                                    <Icon source={"plus"} size={25} color='white'></Icon>
                                </TouchableOpacity>
                                <BadgeIconButton
                                    icon="bell-outline"
                                    iconColor="white"
                                    size={20}
                                    badgeCount={unreadNoti}
                                    onPress={() => notificationsSheet.present()}
                                    animateWhenActive={true}
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
                                    onPress={() => setInfoModalVisible(true)}
                                    className=' items-center justify-center mr-[7px]'
                                >
                                    <Icon source={"information-outline"} size={25} color='white'></Icon>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => { }}
                                    className=' items-center justify-center mr-[7px]'
                                >
                                    <Icon source={"shopping-outline"} size={25} color='white'></Icon>

                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => addStoreSheet.present()}
                                    className='items-center justify-center mr-[-5px]'
                                >
                                    <Icon source={"plus"} size={25} color='white'></Icon>
                                </TouchableOpacity>
                                <BadgeIconButton
                                    icon="bell-outline"
                                    iconColor="white"
                                    size={20}
                                    badgeCount={unreadNoti}
                                    onPress={() => notificationsSheet.present()}
                                    animateWhenActive={true}
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
                                    onPress={() => setInfoModalVisible(true)}
                                    className=' items-center justify-center mr-[7px]'
                                >
                                    <Icon source={"information-outline"} size={25} color='white'></Icon>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => { }}
                                    className=' items-center justify-center mr-[7px]'
                                >
                                    <Icon source={"shopping-outline"} size={25} color='white'></Icon>

                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => addStoreSheet.present()}
                                    className='items-center justify-center mr-[-5px]'
                                >
                                    <Icon source={"plus"} size={25} color='white'></Icon>
                                </TouchableOpacity>
                                <BadgeIconButton
                                    icon="bell-outline"
                                    iconColor="white"
                                    size={20}
                                    badgeCount={unreadNoti}
                                    onPress={() => notificationsSheet.present()}
                                    animateWhenActive={true}
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
                                    onPress={() => setInfoModalVisible(true)}
                                    className=' items-center justify-center mr-[7px]'
                                >
                                    <Icon source={"information-outline"} size={25} color='white'></Icon>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => { }}
                                    className=' items-center justify-center mr-[7px]'
                                >
                                    <Icon source={"shopping-outline"} size={25} color='white'></Icon>

                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => addStoreSheet.present()}
                                    className='items-center justify-center mr-[-5px]'
                                >
                                    <Icon source={"plus"} size={25} color='white'></Icon>
                                </TouchableOpacity>
                                <BadgeIconButton
                                    icon="bell-outline"
                                    iconColor="white"
                                    size={20}
                                    badgeCount={unreadNoti}
                                    onPress={() => notificationsSheet.present()}
                                    animateWhenActive={true}
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
                                    onPress={() => setInfoModalVisible(true)}
                                    className=' items-center justify-center mr-[7px]'
                                >
                                    <Icon source={"information-outline"} size={25} color='white'></Icon>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => { }}
                                    className=' items-center justify-center mr-[7px]'
                                >
                                    <Icon source={"shopping-outline"} size={25} color='white'></Icon>

                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => addStoreSheet.present()}
                                    className='items-center justify-center mr-[-5px]'
                                >
                                    <Icon source={"plus"} size={25} color='white'></Icon>
                                </TouchableOpacity>
                                <BadgeIconButton
                                    icon="bell-outline"
                                    iconColor="white"
                                    size={20}
                                    badgeCount={unreadNoti}
                                    onPress={() => notificationsSheet.present()}
                                    animateWhenActive={true}
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
                        setSnackbarMessage(message);
                        setSnackbarIsError(false);
                        setSnackbarVisible(true);
                    }}
                    onDeleteInfo={(message) => {
                        setSnackbarMessage(message);
                        setSnackbarIsError(true);
                        setSnackbarVisible(true);
                    }}
                    onDeleteError={(message) => {
                        setSnackbarMessage(message);
                        setSnackbarIsError(true);
                        setSnackbarVisible(true);
                    }}
                />
            </BottomSheetModal>
            <BottomSheetModal
                ref={addStoreSheet.ref}
                backdropComponent={addStoreSheet.makeBackdrop()}
                handleIndicatorStyle={{ backgroundColor: '#47494e' }}
                backgroundStyle={{ backgroundColor: '#151618' }}
                onChange={addStoreSheet.handleChange}
                snapPoints={addStoreSheet.snapPoints}
                enableOverDrag={addStoreSheet.enableOverDrag}
                enablePanDownToClose={addStoreSheet.enablePanDownToClose}
            >
                <BottomSheetView className='h-full pt-2'>
                    <DeferredRender
                        active={addStoreSheet.isOpen}
                        placeholder={
                            <View className="flex-1 pt-4">
                                <CrudSkeletonComponent />
                            </View>
                        }
                    >
                        <FormStoreAdd onClose={() => addStoreSheet.dismiss()} />
                    </DeferredRender>
                </BottomSheetView>
            </BottomSheetModal>
            <Portal>
                <Snackbar
                    visible={snackbarVisible}
                    onDismiss={() => setSnackbarVisible(false)}
                    duration={3000}
                    style={{ backgroundColor: snackbarIsError ? '#f59e0b' : '#10b981' }}
                >
                    {snackbarMessage}
                </Snackbar>
            </Portal>
            <InfoModal
                visible={infoModalVisible}
                onClose={() => setInfoModalVisible(false)}
                title="Kullanım Bilgileri"
                items={infoItems}
            />
        </>


    )
}

export default BarberStoreLayout

