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
    const profileImageUrl = watch('profileImageUrl');
    const handlePickAvatar = async () => {
        const file = await handlePickImage();
        if (file?.uri) {
            setValue('profileImageUrl', file.uri, {
                shouldDirty: true,
                shouldValidate: true,
            });
        }
    };
    useEffect(() => {
        if (visible) {
            reset({
                id: initialValues?.id ?? undefined,
                name: initialValues?.name ?? undefined,
                profileImageUrl: initialValues?.profileImageUrl ?? undefined,

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
                        profileImageUrl: values.profileImageUrl,
                        storeId: storeId,
                    },
                }).unwrap();

            } else {
                result = await updateBarber({
                    dto: {
                        id: values.id!,
                        fullName: values.name!,
                        profileImageUrl: values.profileImageUrl,

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
                        <TouchableOpacity
                            onPress={handlePickAvatar}
                            className="w-full bg-gray-800 rounded-xl overflow-hidden"
                            style={{ aspectRatio: 2 / 1 }}
                            activeOpacity={0.85}
                        >
                            {profileImageUrl ? (
                                <Image
                                    className='h-full w-full object-cover'
                                    source={{ uri: profileImageUrl }}
                                />
                            ) : (
                                <View className="flex-1 items-center justify-center">
                                    <Icon source="image" size={40} color="#888" />
                                </View>
                            )}
                        </TouchableOpacity>
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
