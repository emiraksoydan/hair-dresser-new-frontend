import { useRouter } from 'expo-router';
import { InteractionManager, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native'
import { Avatar, Button, Divider, IconButton, TextInput, HelperText, Switch } from 'react-native-paper';
import { useRevokeMutation, useGetMeQuery, useUpdateProfileMutation, useUploadImageMutation, useGetSettingQuery, useUpdateSettingMutation } from '../../store/api';
import { tokenStore } from '../../lib/tokenStore';
import { clearStoredTokens, saveTokens } from '../../lib/tokenStorage';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { handlePickImage } from '../../utils/form/pick-document';
import { ImageOwnerType } from '../../types';
import { useSnackbar } from '../../hook/useSnackbar';
import { useEffect, useState, useRef } from 'react';
import { ProfileSkeleton } from '../../components/common/profileskeleton';
import { resolveApiErrorMessage } from '../../utils/common/error';
import { LottieViewComponent } from '../../components/common/lottieview';

const profileSchema = z.object({
    firstName: z.string()
        .min(2, "İsim en az 2 karakter olmalıdır")
        .max(20, "İsim en fazla 20 karakter olabilir")
        .regex(/^[^\s]+$/, "İsim boşluk içeremez"),
    lastName: z.string()
        .min(2, "Soyisim en az 2 karakter olmalıdır")
        .max(20, "Soyisim en fazla 20 karakter olabilir")
        .regex(/^[^\s]+$/, "Soyisim boşluk içeremez"),
    phoneNumber: z.string()
        .min(1, "Telefon numarası gereklidir")
        .refine((val) => val.length === 10 || val.startsWith('+90'), "Telefon numarası 10 haneli olmalıdır veya +90 ile başlamalıdır"),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

const Index = () => {
    const expoRouter = useRouter();
    const [logout, { isLoading: isLoggingOut }] = useRevokeMutation();
    const { data: userData, isLoading: isLoadingUser, refetch, isFetching, error: userError, isError: isUserError } = useGetMeQuery();
    const [updateProfile, { isLoading: isUpdating }] = useUpdateProfileMutation();
    const [uploadImage] = useUploadImageMutation();
    const { data: settingData, isLoading: isLoadingSetting, refetch: refetchSetting } = useGetSettingQuery();
    const [updateSetting, { isLoading: isUpdatingSetting }] = useUpdateSettingMutation();
    const { showSnack, SnackbarComponent } = useSnackbar();
    const [refreshing, setRefreshing] = useState(false);
    const isUpdatingSettingRef = useRef(false);

    const {
        control,
        handleSubmit,
        formState: { errors, isDirty },
        reset,
        setValue,
    } = useForm<ProfileFormValues>({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            firstName: '',
            lastName: '',
            phoneNumber: '',
        },
    });

    useEffect(() => {
        if (userData?.data) {
            // Telefon numarasını işle - +90 ile başlıyorsa kaldır, null/undefined ise boş string yapma
            let phone = '';
            if (userData.data.phoneNumber) {
                phone = userData.data.phoneNumber.startsWith('+90')
                    ? userData.data.phoneNumber.substring(3)
                    : userData.data.phoneNumber;
            }

            reset({
                firstName: userData.data.firstName || '',
                lastName: userData.data.lastName || '',
                phoneNumber: phone,
            });
        }
    }, [userData, reset]);

    const onSubmit = async (data: ProfileFormValues) => {
        try {
            const phoneNumber = data.phoneNumber.startsWith('+90')
                ? data.phoneNumber
                : `+90${data.phoneNumber}`;

            const result = await updateProfile({
                firstName: data.firstName,
                lastName: data.lastName,
                phoneNumber: phoneNumber,
            }).unwrap();

            if (result.success && result.data) {
                // Yeni token'ı kaydet
                tokenStore.set({
                    accessToken: result.data.token,
                    refreshToken: result.data.refreshToken,
                });
                await saveTokens({
                    accessToken: result.data.token,
                    refreshToken: result.data.refreshToken,
                });

                showSnack('Profil başarıyla güncellendi', false);
                reset(data);
            } else {
                showSnack(result.message || 'Bir hata oluştu', true);
            }
        } catch (error: any) {
            showSnack(error?.data?.message || 'Profil güncellenemedi', true);
        }
    };

    const handleImagePick = async () => {
        try {
            const file = await handlePickImage();
            if (!file || !userData?.data?.id) return;

            const formData = new FormData();
            formData.append('file', {
                uri: file.uri,
                name: file.name,
                type: file.type,
            } as any);
            formData.append('ownerType', String(ImageOwnerType.User));
            formData.append('ownerId', userData.data.id);

            const uploadResult = await uploadImage(formData).unwrap();
            if (uploadResult.success) {
                // Refetch user data to get updated image (snackbar refetch sonrası gösterilecek)
                await refetch();
                // Snackbar'ı sadece bir kere göster
                showSnack('Profil fotoğrafı güncellendi', false);
            } else {
                showSnack('Fotoğraf yüklenemedi', true);
            }
        } catch (error) {
            showSnack('Fotoğraf yüklenirken hata oluştu', true);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        try {
            await refetch();
        } catch (error) {
            showSnack('Yenileme başarısız', true);
        } finally {
            setRefreshing(false);
        }
    };

    const handleLogout = async () => {
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
        } catch {
            // Error handled silently
        }
    };

    if (isLoadingUser) {
        return <ProfileSkeleton />;
    }

    // Error durumu - refresh edildiğinde de göster
    if (isUserError && userError) {
        const errorMessage = resolveApiErrorMessage(userError);
        return (
            <View className="flex-1 bg-[#151618]">
                <ScrollView
                    contentContainerStyle={{ flexGrow: 1 }}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing || isFetching}
                            onRefresh={handleRefresh}
                            colors={['#10B981']}
                            tintColor='#10B981'
                        />
                    }
                >
                    <LottieViewComponent
                        animationSource={require('../../../assets/animations/error.json')}
                        message={errorMessage}
                    />
                </ScrollView>
            </View>
        );
    }

    return (
        <ScrollView
            className='flex-1 pl-0 pt-4 bg-[#151618]'
            refreshControl={
                <RefreshControl
                    refreshing={refreshing}
                    onRefresh={handleRefresh}
                    colors={['#10B981']}
                    tintColor='#10B981'
                />
            }
        >
            <View className='items-center'>
                <View className="relative h-[120px] w-[120px]">
                    <Avatar.Image
                        size={120}
                        source={{ uri: userData?.data?.image?.imageUrl || 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQxxOeOXHNrUgfxDbpJZJCxcDOjTlrBRlH7wA&s' }}
                    />
                    <IconButton
                        icon="pencil"
                        size={20}
                        iconColor="white"
                        style={{ position: 'absolute', bottom: -5, right: -0, backgroundColor: '#38393b', }}
                        onPress={handleImagePick}
                    />
                </View>
                <Text className='font-ibm-plex-sans-regular text-center mt-3 text-white' style={{ fontSize: 20 }}>
                    {userData?.data?.firstName} {userData?.data?.lastName}
                </Text>
                <View className='w-full px-8 pt-6'>
                    <Divider style={{ borderWidth: 0.1, width: "100%", }}></Divider>
                </View>
            </View>

            <View className='px-6 pt-6'>
                <Text className='text-white text-lg mb-4 font-ibm-plex-sans-semibold'>Profil Bilgileri</Text>
                <View className='bg-[#1F2937] rounded-xl p-4 mb-6'>
                    <View className='flex-row gap-3'>
                        <View className='flex-1'>
                            <Controller
                                control={control}
                                name="firstName"
                                render={({ field: { onChange, onBlur, value } }) => (
                                    <TextInput
                                        dense
                                        label="İsim"
                                        mode="outlined"
                                        value={value}
                                        onChangeText={onChange}
                                        onBlur={onBlur}
                                        textColor="white"
                                        error={!!errors.firstName}
                                        outlineColor={errors.firstName ? "#b00020" : "#444"}
                                        theme={{
                                            roundness: 10,
                                            colors: { onSurfaceVariant: "gray", primary: "white" }
                                        }}
                                        style={{ backgroundColor: '#2D3748', marginBottom: 0 }}
                                    />
                                )}
                            />
                        </View>

                        <View className='flex-1'>
                            <Controller
                                control={control}
                                name="lastName"
                                render={({ field: { onChange, onBlur, value } }) => (
                                    <TextInput
                                        dense
                                        label="Soyisim"
                                        mode="outlined"
                                        value={value}
                                        onChangeText={onChange}
                                        onBlur={onBlur}
                                        textColor="white"
                                        error={!!errors.lastName}
                                        outlineColor={errors.lastName ? "#b00020" : "#444"}
                                        theme={{
                                            roundness: 10,
                                            colors: { onSurfaceVariant: "gray", primary: "white" }
                                        }}
                                        style={{ backgroundColor: '#2D3748', marginBottom: 0 }}
                                    />
                                )}
                            />
                        </View>
                    </View>
                    {(errors.firstName || errors.lastName) && (
                        <View className='flex-row gap-3 mt-[-8px]'>
                            <View className='flex-1'>
                                <HelperText type="error" visible={!!errors.firstName} style={{ marginTop: 0, paddingTop: 0 }}>
                                    {errors.firstName?.message || ' '}
                                </HelperText>
                            </View>
                            <View className='flex-1'>
                                <HelperText type="error" visible={!!errors.lastName} style={{ marginTop: 0, paddingTop: 0 }}>
                                    {errors.lastName?.message || ' '}
                                </HelperText>
                            </View>
                        </View>
                    )}

                    <Controller
                        control={control}
                        name="phoneNumber"
                        render={({ field: { onChange, onBlur, value } }) => (
                            <>
                                <TextInput
                                    dense
                                    label="Telefon (10 haneli)"
                                    mode="outlined"
                                    value={value}
                                    onChangeText={onChange}
                                    onBlur={onBlur}
                                    keyboardType="phone-pad"
                                    textColor="white"
                                    error={!!errors.phoneNumber}
                                    outlineColor={errors.phoneNumber ? "#b00020" : "#444"}
                                    theme={{
                                        roundness: 10,
                                        colors: { onSurfaceVariant: "gray", primary: "white" }
                                    }}
                                    style={{ backgroundColor: '#2D3748', marginBottom: 0, marginTop: 8 }}
                                />
                                {errors.phoneNumber && (
                                    <HelperText type="error" visible={true} style={{ marginTop: 0, paddingTop: 0 }}>
                                        {errors.phoneNumber?.message}
                                    </HelperText>
                                )}
                            </>
                        )}
                    />

                    <Button
                        mode="contained"
                        onPress={handleSubmit(onSubmit)}
                        loading={isUpdating}
                        disabled={!isDirty || isUpdating}
                        style={{ marginTop: 10, borderRadius: 10 }}
                        buttonColor="#10B981"
                    >
                        Kaydet
                    </Button>
                </View>

                {/* Ayarlar Bölümü */}
                <Text className='text-white text-lg mb-4 mt-6 font-ibm-plex-sans-semibold'>Ayarlar</Text>
                <View className='bg-[#1F2937] rounded-xl p-4 mb-6'>
                    <View className='flex-row items-center justify-between'>
                        <View className='flex-1 mr-4'>
                            <Text className='text-white text-base font-medium mb-1'>Görsel Animasyonu</Text>
                            <Text className='text-gray-400 text-sm'>Panel ve harita görsellerinde animasyon göster/gizle</Text>
                        </View>
                        <Switch
                            value={settingData?.data?.showImageAnimation ?? true}
                            onValueChange={async (value) => {
                                if (isUpdatingSettingRef.current) return;
                                isUpdatingSettingRef.current = true;
                                try {
                                    await updateSetting({
                                        showImageAnimation: value,
                                    }).unwrap();
                                    // refetchSetting çağrısını kaldırdık - RTK Query otomatik güncelliyor
                                    showSnack('Ayar güncellendi', false);
                                } catch (error: any) {
                                    showSnack(error?.data?.message || 'Ayar güncellenemedi', true);
                                } finally {
                                    isUpdatingSettingRef.current = false;
                                }
                            }}
                            disabled={isUpdatingSetting || isLoadingSetting}
                        />
                    </View>
                </View>

                <Button
                    mode='contained'
                    icon="logout"
                    onPress={handleLogout}
                    loading={isLoggingOut}
                    contentStyle={{
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                    buttonColor='red'
                    textColor="white"
                    style={{ marginTop: 0, borderRadius: 10, }}
                >
                    Çıkış Yap
                </Button>
            </View>
            <SnackbarComponent />
        </ScrollView>
    );
}

export default Index
