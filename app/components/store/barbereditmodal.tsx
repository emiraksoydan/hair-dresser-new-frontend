// components/BarberEditModal.tsx
import 'react-native-get-random-values';
import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity, Image } from 'react-native';
import { Button, Dialog, HelperText, Icon, Portal, Snackbar, Text, TextInput } from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { v4 as uuid } from 'uuid';
import { BarberFormValues, ImageOwnerType } from '../../types';
import { useAddManuelBarberMutation, useDeleteImageMutation, useLazyGetImagesByOwnerQuery, useUpdateManuelBarberMutation, useUploadImageMutation } from '../../store/api';
import { handlePickImage } from '../../utils/form/pick-document';
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
    const [uploadImage] = useUploadImageMutation();
    const [deleteImage] = useDeleteImageMutation();
    const [triggerGetImagesByOwner] = useLazyGetImagesByOwnerQuery();

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

    const isRemoteUri = (uri?: string) =>
        !!uri && (uri.startsWith("http://") || uri.startsWith("https://"));

    const deleteExistingImages = async (ownerId: string) => {
        const images = await triggerGetImagesByOwner({
            ownerId,
            ownerType: ImageOwnerType.ManuelBarber,
        }).unwrap();

        for (const img of images ?? []) {
            const deleteResult = await deleteImage(img.id).unwrap();
            if (!deleteResult.success) {
                throw new Error(deleteResult.message || "Resim silinemedi.");
            }
        }
    };

    const uploadProfileImage = async (ownerId: string, file: BarberFormValues["profileImage"]) => {
        if (!file || !file.uri) return;
        const formData = new FormData();
        formData.append("file", {
            uri: file.uri,
            name: file.name ?? "photo.jpg",
            type: file.type ?? "image/jpeg",
        } as any);
        formData.append("ownerType", String(ImageOwnerType.ManuelBarber));
        formData.append("ownerId", ownerId);
        const uploadResult = await uploadImage(formData).unwrap();
        if (!uploadResult.success) {
            throw new Error(uploadResult.message || "Resim yüklenemedi.");
        }
    };

    const submit = async (values: BarberFormValues) => {
        try {
            const isCreate = !values.id;
            const barberId = values.id && values.id.trim() ? values.id : uuid();
            let result: { message: string; success: boolean };
            if (isCreate) {
                result = await addBarber({
                    dto: {
                        id: barberId,
                        fullName: values.name!,
                        storeId: storeId,
                    },
                }).unwrap();

            } else {
                result = await updateBarber({
                    dto: {
                        id: barberId,
                        fullName: values.name!,
                    },
                }).unwrap();
            }

            if (!result?.success) {
                setSnackMessage(result?.message ?? 'İşlem başarısız');
                setSnackIsError(true);
                setSnackVisible(true);
                return;
            }

            let uploadError: string | null = null;
            const profileImage = values.profileImage;
            try {
                if (isCreate) {
                    if (profileImage?.uri && !isRemoteUri(profileImage.uri)) {
                        await deleteExistingImages(barberId);
                        await uploadProfileImage(barberId, profileImage);
                    }
                } else {
                    if (!profileImage?.uri) {
                        await deleteExistingImages(barberId);
                    } else if (!isRemoteUri(profileImage.uri)) {
                        await deleteExistingImages(barberId);
                        await uploadProfileImage(barberId, profileImage);
                    }
                }
            } catch (uploadErr: any) {
                uploadError = resolveApiErrorMessage(uploadErr);
            }

            if (uploadError) {
                const baseMessage = isCreate
                    ? "Berber eklendi, resim yüklenemedi."
                    : "Berber güncellendi, resim yüklenemedi.";
                setSnackMessage(`${baseMessage} ${uploadError}`);
                setSnackIsError(true);
            } else {
                setSnackMessage(result?.message ?? 'İşlem başarılı');
                setSnackIsError(false);
            }
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
