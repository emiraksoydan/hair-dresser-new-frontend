import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import {
    Button,
    Dialog,
    HelperText,
    Portal,
    Snackbar,
    TextInput,
} from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { ChairFormInitial } from '../types';
import {
    useAddStoreChairMutation,
    useUpdateStoreChairMutation,
} from '../store/api';
import { resolveApiErrorMessage } from '../utils/error';
import { Dropdown } from 'react-native-element-dropdown';

type ChairModalBarber = {
    id: string;
    name: string;
};

type Props = {
    visible: boolean;
    title?: string;
    initialValues?: Partial<ChairFormInitial>;
    barbers: ChairModalBarber[];
    onClose: () => void;
    storeId: string;
};

export const ChairEditModal: React.FC<Props> = ({
    visible,
    title = 'Koltuk',
    initialValues,
    barbers,
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
    } = useForm<ChairFormInitial>({
        defaultValues: {
            id: initialValues?.id,
            name: initialValues?.name ?? '',
            barberId: initialValues?.barberId ?? undefined,
            mode: initialValues?.barberId ? 'barber' : 'named',
        },
    });

    const mode = watch('mode');
    const [addChair, { isLoading: isAdding }] = useAddStoreChairMutation();
    const [updateChair, { isLoading: isUpdating }] = useUpdateStoreChairMutation();

    const barberOptions = barbers.map(b => ({ label: b.name, value: b.id }));
    const [snackVisible, setSnackVisible] = useState(false);
    const [snackMessage, setSnackMessage] = useState('');
    const [snackIsError, setSnackIsError] = useState(false);

    // Modal açıldığında initial değerleri tekrar yükle
    useEffect(() => {
        if (visible) {
            const startMode: 'named' | 'barber' =
                initialValues?.barberId ? 'barber' : 'named';

            reset({
                id: initialValues?.id ?? undefined,
                name: initialValues?.name ?? undefined,
                barberId: initialValues?.barberId ?? undefined,
                mode: startMode,
            });
        }
    }, [visible, initialValues, reset]);

    const handleModeChange = (nextMode: 'named' | 'barber') => {
        setValue('mode', nextMode, { shouldDirty: true });
        if (nextMode === 'named') {
            setValue('barberId', undefined, { shouldDirty: true });
        } else {
            setValue('name', undefined, { shouldDirty: true });
        }
    };

    const submit = async (values: ChairFormInitial) => {
        try {

            const payloadName =
                values.mode === 'named' ? values.name ?? null : null;
            const payloadBarberId =
                values.mode === 'barber' ? values.barberId ?? null : null;
            const isCreate = !values.id;

            let result: { message: string; success: boolean };
            if (isCreate) {
                result = await addChair({
                    dto: {
                        id: undefined,
                        storeId: storeId,
                        name: payloadName ?? undefined,
                        barberId: payloadBarberId ?? undefined,
                    },
                }).unwrap();
            } else {
                result = await updateChair({
                    dto: {
                        id: values.id!,
                        name: payloadName ?? undefined,
                        barberId: payloadBarberId ?? undefined,
                    },
                }).unwrap();
            }

            setSnackMessage(result?.message ?? 'İşlem başarılı');
            setSnackIsError(!result?.success);
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
            <Dialog
                dismissable={false}
                dismissableBackButton={false}
                visible={visible}
                onDismiss={onClose}
                style={{ backgroundColor: '#111827' }}
            >
                <Dialog.Title style={{ color: 'white' }}>{title}</Dialog.Title>
                <Dialog.Content style={{ paddingBottom: 0, marginBottom: 0 }}>
                    <View className="flex-row justify-start gap-6 mb-3">
                        <TouchableOpacity
                            onPress={() => handleModeChange('named')}
                            className="flex-row items-center gap-2"
                            activeOpacity={0.8}
                        >
                            <View
                                className={`w-4 h-4 rounded-full border ${mode === 'named'
                                    ? 'bg-emerald-500 border-emerald-500'
                                    : 'border-gray-400'
                                    }`}
                            />
                            <Text className="text-white text-sm">İsme ata</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => handleModeChange('barber')}
                            className="flex-row items-center gap-2"
                            activeOpacity={0.8}
                        >
                            <View
                                className={`w-4 h-4 rounded-full border ${mode === 'barber'
                                    ? 'bg-emerald-500 border-emerald-500'
                                    : 'border-gray-400'
                                    }`}
                            />
                            <Text className="text-white text-sm">Berbere ata</Text>
                        </TouchableOpacity>
                    </View>

                    <View className="gap-3 mt-3">
                        {mode === 'named' && (
                            <Controller
                                control={control}
                                name="name"
                                rules={
                                    mode === 'named'
                                        ? { required: 'Koltuk adı zorunlu' }
                                        : undefined
                                }
                                render={({ field: { value, onChange, onBlur } }) => (
                                    <>
                                        <TextInput
                                            label="Koltuk adı"
                                            mode="outlined"
                                            dense
                                            value={value ?? ''}
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
                                            {errors.name?.message as string}
                                        </HelperText>
                                    </>
                                )}
                            />
                        )}
                        {mode === 'barber' && (
                            <Controller
                                control={control}
                                name="barberId"
                                rules={
                                    mode === 'barber'
                                        ? { required: 'Berber seçmelisiniz' }
                                        : undefined
                                }
                                render={({ field: { value, onChange } }) => (
                                    <>
                                        <Dropdown
                                            data={barberOptions}
                                            labelField="label"
                                            valueField="value"
                                            placeholder="Berber Seçin"
                                            value={value ?? undefined}
                                            onChange={(item: { label: string; value: string }) => { onChange(item.value); }}
                                            style={{
                                                height: 42,
                                                borderRadius: 10,
                                                paddingHorizontal: 12,
                                                backgroundColor: "#1F2937",
                                                borderWidth: 1,
                                                borderColor: "#444",
                                                justifyContent: "center",
                                                marginTop: 0,

                                            }}
                                            placeholderStyle={{ color: "gray" }}
                                            selectedTextStyle={{ color: "white" }}
                                            itemTextStyle={{ color: "white" }}
                                            containerStyle={{ backgroundColor: '#1F2937', borderWidth: 0, borderRadius: 10, overflow: 'hidden', }}
                                            activeColor="#3a3b3d"
                                        />
                                        <HelperText type="error" visible={!!errors.barberId}>
                                            {errors.barberId?.message as string}
                                        </HelperText>
                                    </>
                                )}
                            />
                        )}
                    </View>
                </Dialog.Content>
                <Dialog.Actions>
                    <Button onPress={onClose} textColor="#9CA3AF">
                        Vazgeç
                    </Button>
                    <Button
                        loading={isAdding || isUpdating}
                        disabled={isAdding || isUpdating}
                        onPress={handleSubmit(submit)}
                        textColor="#10B981"
                    >
                        Kaydet
                    </Button>
                </Dialog.Actions>
            </Dialog>
            <Snackbar
                visible={snackVisible}
                onDismiss={() => setSnackVisible(false)}
                duration={3000}
                style={{
                    backgroundColor: snackIsError ? '#b91c1c' : '#16a34a',
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
