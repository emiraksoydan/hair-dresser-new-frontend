import React from 'react';
import { View, Text } from 'react-native';
import { TextInput, HelperText, IconButton, Icon } from 'react-native-paper';
import { Controller, Control, FieldErrors } from 'react-hook-form';
import { Dropdown } from 'react-native-element-dropdown';

type ChairItemProps = {
    control: Control<any>;
    index: number;
    chairId: string;
    mode: 'named' | 'barber';
    barberOptions: Array<{ label: string; value: string }>;
    errors: FieldErrors<any>;
    onRemove: () => void;
    onModeChange: (mode: 'named' | 'barber') => void;
};

export const ChairItem = React.memo<ChairItemProps>(({
    control,
    index,
    chairId,
    mode,
    barberOptions,
    errors,
    onRemove,
    onModeChange
}) => {
    const chairError = (errors as any)?.chairs?.[index];
    const nameError = (chairError as any)?.name?.message;
    const barberIdError = (chairError as any)?.barberId?.message;

    const disabled = mode === 'barber' && barberOptions.length === 0;

    return (
        <View className="flex-row items-center gap-3 mb-3">
            {/* Chair Icon */}
            <Icon size={24} source={'chair-rolling'} color='#c2a523' />

            {/* Mode Dropdown */}
            <View className='flex-1'>
                <Controller
                    control={control}
                    name={`chairs.${index}.mode`}
                    render={({ field: { value, onChange } }) => (
                        <Dropdown
                            data={[{ label: "İsim ata", value: "named" }, { label: "Berber ata", value: "barber" }]}
                            labelField="label"
                            valueField="value"
                            value={value ?? null}
                            onChange={(it: any) => onModeChange(it.value)}
                            style={{ height: 42, borderRadius: 10, paddingHorizontal: 12, backgroundColor: "#1F2937", borderWidth: 1, borderColor: "#444", justifyContent: "center" }}
                            placeholderStyle={{ color: "gray" }}
                            selectedTextStyle={{ color: "white" }}
                            itemTextStyle={{ color: "white" }}
                            containerStyle={{ backgroundColor: "#1F2937", borderWidth: 0, borderRadius: 10, overflow: "hidden" }}
                            activeColor="#3a3b3d"
                        />
                    )}
                />
            </View>

            {/* İsim veya Berber Seçimi */}
            <View className='flex-1'>
                {mode === 'named' ? (
                    <Controller
                        control={control}
                        name={`chairs.${index}.name`}
                        render={({ field: { value, onChange, onBlur } }) => (
                            <TextInput
                                label="Koltuk adı"
                                mode="outlined"
                                dense
                                value={value ?? ''}
                                onChangeText={onChange}
                                onBlur={onBlur}
                                textColor="white"
                                outlineColor="#444"
                                theme={{ roundness: 10, colors: { onSurfaceVariant: "gray", primary: "white" } }}
                                style={{ backgroundColor: "#1F2937", borderWidth: 0, marginTop: -5 }}
                            />
                        )}
                    />
                ) : (
                    <Controller
                        control={control}
                        name={`chairs.${index}.barberId`}
                        render={({ field: { value, onChange } }) => (
                            <Dropdown
                                data={barberOptions}
                                labelField="label"
                                valueField="value"
                                value={value ?? null}
                                onChange={(item: any) => onChange(item.value)}
                                placeholder={disabled ? "Önce isimli berber ekleyin" : "Berber seç"}
                                disable={disabled}
                                style={{ height: 42, borderRadius: 10, paddingHorizontal: 12, backgroundColor: "#1F2937", borderWidth: 1, borderColor: "#444", justifyContent: "center" }}
                                containerStyle={{ backgroundColor: "#1F2937", borderWidth: 0, borderRadius: 10, overflow: "hidden" }}
                                placeholderStyle={{ color: "gray" }}
                                selectedTextStyle={{ color: "white" }}
                                itemTextStyle={{ color: "white" }}
                                activeColor="#0f766e"
                            />
                        )}
                    />
                )}
            </View>

            {/* Delete Button */}
            <IconButton icon="delete" iconColor="#ef4444" onPress={onRemove} />
        </View>
    );
}, (prev, next) => {
    // Custom comparison for optimal re-render prevention
    const prevChairError = (prev.errors as any)?.chairs?.[prev.index];
    const nextChairError = (next.errors as any)?.chairs?.[next.index];
    return (
        prev.index === next.index &&
        prev.chairId === next.chairId &&
        prev.mode === next.mode &&
        prev.barberOptions.length === next.barberOptions.length &&
        JSON.stringify(prevChairError) === JSON.stringify(nextChairError)
    );
});

ChairItem.displayName = 'ChairItem';
