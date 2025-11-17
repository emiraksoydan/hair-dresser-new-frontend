import { Dimensions, Text, TouchableOpacity, View } from 'react-native'
import { Tabs } from 'expo-router';
import { IconButton } from 'react-native-paper';
import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import FormStoreAdd from '../components/formstoreadd';
import { useBottomSheetRegistry, useSheet } from '../context/bottomsheet';

const BarberStoreLayout = () => {

    const { width } = Dimensions.get('window');
    const { setRef, makeBackdrop } = useBottomSheetRegistry();
    const { present } = useSheet('addStore');

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
                            <Text className='text-lg text-white mr-0' >
                                Hoşgeldiniz Emir
                            </Text>
                        ),
                        tabBarIcon: ({ focused }) => (
                            <IconButton
                                icon="store"
                                iconColor={focused ? '#c2a523' : '#38393b'}
                                size={30}
                                style={{ margin: 0, }}
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
                                Hoşgeldiniz Emir
                            </Text>
                        ),
                        tabBarIcon: ({ focused }) => (
                            <IconButton
                                icon="clock"
                                iconColor={focused ? '#c2a523' : '#38393b'}
                                size={30}
                                style={{ margin: 0, }}
                            />
                        ),
                        tabBarLabel: ({ focused }) => (
                            <Text
                                className={`text-xs ${focused ? 'text-[#c2a523]' : 'text-[#454648]'}`}
                            >
                                Randevular
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
                    name="(messages)"
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
                                icon="message"
                                iconColor={focused ? '#c2a523' : '#38393b'}
                                size={30}
                                style={{ margin: 0, }}
                            />
                        ),
                        tabBarLabel: ({ focused }) => (
                            <Text
                                className={`text-xs ${focused ? 'text-[#c2a523]' : 'text-[#454648]'}`}
                            >
                                Mesajlar
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
                        headerTitle: () => (
                            <Text className='text-lg text-white mr-0' >
                                Hoşgeldiniz Emir
                            </Text>
                        ),
                        tabBarIcon: ({ focused }) => (
                            <IconButton
                                icon="account"
                                iconColor={focused ? '#c2a523' : '#38393b'}
                                size={30}
                                style={{ margin: 0, }}
                            />
                        ),
                        tabBarLabel: ({ focused }) => (
                            <Text
                                className={`text-xs ${focused ? 'text-[#c2a523]' : 'text-[#454648]'}`}
                            >
                                Profil
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
            <TouchableOpacity
                onPress={present}
                className='absolute bottom-7 w-14 h-14 rounded-full bg-[#c2a523] items-center justify-center z-[100px] shadow-black'
                style={{
                    left: width / 2 - 25,
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.3,
                    shadowRadius: 4,
                    elevation: 5,
                }}
            >
                <Text className='text-black text-2xl font-ibm-plex-sans-regular mt-[-2px]'>+</Text>
            </TouchableOpacity>
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

