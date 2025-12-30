// components/BarberEditModal.tsx
import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity, Image } from 'react-native';
import { Avatar, Button, Dialog, HelperText, Icon, Portal, Snackbar, Text, TextInput } from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { BarberFormValues } from '../../types';
import { useAddManuelBarberMutation, useUpdateManuelBarberMutation } from '../../store/api';
import { handlePickImage, pickImageAndSet } from '../../utils/form/pick-document';
import { resolveApiErrorMessage } from '../../utils/common/error';


type Props = {
    visible: boolean;
    title?: string;
    initialValues?: Partial<BarberFormValues>;
    onClose: () => void;
    storeId: string;
};

export const BarberEditModal: React.FC<Props> = ({
    visible,
    title = 'Berber',
    initialValues,
    onClose,
    storeId,
}) => {
    const {
        control,
        handleSubmit,
        reset,
        setValue,
        watch,
        formState: { errors },
    } = useForm<BarberFormValues>({
        defaultValues: {
            name: '',
            ...initialValues,
        },
    });
    const [addBarber, { isLoading: isAdding }] = useAddManuelBarberMutation();
    const [updateBarber, { isLoading: isUpdating }] = useUpdateManuelBarberMutation();

    const [snackVisible, setSnackVisible] = useState(false);
    const [snackMessage, setSnackMessage] = useState('');
    const [snackIsError, setSnackIsError] = useState(false);
    const profileImage = watch('profileImage');

    const handlePickAvatar = async () => {
        const file = await handlePickImage();
        if (file) {
            setValue('profileImage', file, {
                shouldDirty: true,
                shouldValidate: true,
            });
        }
    };

    const removeImage = () => {
        setValue('profileImage', undefined, {
            shouldDirty: true,
            shouldValidate: true,
        });
    };
    useEffect(() => {
        if (visible) {
            reset({
                id: initialValues?.id ?? undefined,
                name: initialValues?.name ?? undefined,
                profileImage: initialValues?.profileImage ?? undefined,
            });
        }
    }, [visible, initialValues, reset]);

    const submit = async (values: BarberFormValues) => {
        try {
            const isCreate = !values.id;
            let result: { message: string; success: boolean };
            if (isCreate) {
                result = await addBarber({
                    dto: {
                        id: undefined,
                        fullName: values.name!,
                        profileImageUrl: values.profileImage?.uri,
                        storeId: storeId,
                    },
                }).unwrap();

            } else {
                result = await updateBarber({
                    dto: {
                        id: values.id!,
                        fullName: values.name!,
                        profileImageUrl: values.profileImage?.uri,
                    },
                }).unwrap();
            }

            setSnackMessage(result?.message ?? 'İşlem başarılı');
            setSnackIsError(false);
            setSnackVisible(true);
            onClose();
        } catch (e: any) {
            setSnackMessage(resolveApiErrorMessage(e));
            setSnackIsError(true);
            setSnackVisible(true);
        }
    };
    return (
        <Portal>
            <Dialog dismissable={false}
                dismissableBackButton={false} visible={visible} onDismiss={onClose} style={{ backgroundColor: '#111827' }}>
                <Dialog.Title style={{ color: 'white' }}>
                    {title}
                </Dialog.Title>
                <Dialog.Content style={{ paddingBottom: 0, marginBottom: 0 }} >
                    <View className='gap-3'>
                        {profileImage ? (
                            <View className="relative">
                                <Image
                                    className='w-full rounded-xl'
                                    style={{ aspectRatio: 2 / 1 }}
                                    source={{ uri: profileImage.uri }}
                                    resizeMode="cover"
                                />
                                <TouchableOpacity
                                    onPress={removeImage}
                                    className="absolute top-2 right-2 bg-red-500 rounded-full p-2"
                                    activeOpacity={0.85}
                                >
                                    <Icon source="close" size={20} color="white" />
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <TouchableOpacity
                                onPress={handlePickAvatar}
                                className="w-full bg-gray-800 rounded-xl items-center justify-center border border-gray-700"
                                style={{ aspectRatio: 2 / 1 }}
                                activeOpacity={0.85}
                            >
                                <Icon source="image-plus" size={40} color="#888" />
                                <Text className="text-gray-500 mt-2">Resim Ekle</Text>
                            </TouchableOpacity>
                        )}
                        <Controller
                            control={control}
                            name="name"
                            rules={{ required: 'Berber adı zorunlu' }}
                            render={({ field: { value, onChange, onBlur } }) => (
                                <>
                                    <TextInput
                                        label="Berber adı"
                                        mode="outlined"
                                        dense
                                        value={value}
                                        onChangeText={onChange}
                                        onBlur={onBlur}
                                        textColor="white"
                                        outlineColor={errors.name ? '#b00020' : '#444'}
                                        theme={{
                                            roundness: 10,
                                            colors: { onSurfaceVariant: 'gray', primary: 'white' },
                                        }}
                                        style={{ backgroundColor: '#1F2937', borderWidth: 0 }}
                                    />
                                    <HelperText type="error" visible={!!errors.name}>
                                        {errors.name?.message}
                                    </HelperText>
                                </>
                            )}
                        />
                    </View>
                </Dialog.Content>
                <Dialog.Actions >
                    <Button onPress={onClose} textColor="#9CA3AF">
                        Vazgeç
                    </Button>
                    <Button
                        loading={isAdding || isUpdating}
                        disabled={isAdding || isUpdating}
                        onPress={handleSubmit(submit)} textColor="#10B981">
                        Kaydet
                    </Button>
                </Dialog.Actions>
            </Dialog>
            <Snackbar
                visible={snackVisible}
                onDismiss={() => setSnackVisible(false)}
                duration={3000}
                style={{
                    backgroundColor: snackIsError ? '#b91c1c' : '#16a34a', // kırmızı / yeşil
                }}
                action={{
                    label: 'Kapat',
                    textColor: 'white',
                    onPress: () => setSnackVisible(false),
                }}
            >
                {snackMessage}
            </Snackbar>
        </Portal>
    );
};
