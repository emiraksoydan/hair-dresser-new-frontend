import { useRouter } from 'expo-router';
import { InteractionManager, Text, View } from 'react-native'
import { Avatar, Button, Divider, IconButton } from 'react-native-paper';
import { useRevokeMutation } from '../../store/api';
import { tokenStore } from '../../lib/tokenStore';
import { clearStoredTokens } from '../../lib/tokenStorage';

const Index = () => {
    const expoRouter = useRouter();
    const [logout, { isLoading, isError, data, error }] = useRevokeMutation();
    return (
        <View className='flex-1 flex pl-0 pt-4   bg-[#151618]'>
            <View className='items-center'>
                <View className="relative  h-[120px] w-[120px]">
                    <Avatar.Image
                        size={120}
                        source={{ uri: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQxxOeOXHNrUgfxDbpJZJCxcDOjTlrBRlH7wA&s' }}
                    />
                    <IconButton
                        icon="pencil"
                        size={20}
                        iconColor="white"
                        style={{ position: 'absolute', bottom: -5, right: -0, backgroundColor: '#38393b', }}
                        onPress={() => {
                        }}
                    />
                </View>
                <Text className='font-ibm-plex-sans-regular text-center mt-3 text-white' style={{ fontSize: 20 }}>Emir Aksoydan</Text>
                <View className='w-full px-8 pt-6'>
                    <Divider style={{ borderWidth: 0.1, width: "100%", }}></Divider>
                </View>
            </View>
            <View className='px-6  pt-6'>
                <View className="flex-row items-center justify-between py-0  ">
                    <View className="flex-row items-center">
                        <IconButton icon="account-edit" size={24} iconColor="white" />
                        <Text className="text-white font-ibm-plex-sans-regular ">Profili Düzenle</Text>
                    </View>
                    <IconButton icon="chevron-right" size={24} iconColor="gray" />
                </View>
                <View className="flex-row items-center justify-between py-0 mt-[-5px]">
                    <View className="flex-row items-center">
                        <IconButton icon="security" size={24} iconColor="white" />
                        <Text className="text-white font-ibm-plex-sans-regular">Güvenlik</Text>
                    </View>
                    <IconButton icon="chevron-right" size={24} iconColor="gray" />
                </View>
                <View className="flex-row items-center justify-between py-0 mt-[-5px]">
                    <View className="flex-row items-center">
                        <IconButton icon="cog-outline" size={24} iconColor="white" />
                        <Text className="text-white font-ibm-plex-sans-regular">Ayarlar</Text>
                    </View>
                    <IconButton icon="chevron-right" size={24} iconColor="gray" />
                </View>
                <Button
                    mode='text'
                    icon="logout"
                    onPress={async () => {
                        try {
                            const tokenLoad = tokenStore.refresh;
                            if (tokenLoad !== null && tokenLoad !== undefined) {
                                const res = await logout({ refreshToken: tokenLoad }).unwrap();
                                if (res.success)
                                    InteractionManager.runAfterInteractions(() => {
                                        tokenStore.clear();
                                        clearStoredTokens();
                                        expoRouter.replace("(auth)");
                                    });

                            }
                        } catch (error) {
                            console.log(error);
                        }


                    }}
                    contentStyle={{
                        alignItems: 'center',
                        justifyContent: 'flex-start',
                        paddingLeft: 5
                    }}
                    labelStyle={{
                        marginLeft: 25,
                    }}
                    textColor="red"
                    style={{ marginTop: 5, }}
                >
                    Çıkış Yap
                </Button>
            </View>
        </View>
    );
}

export default Index

