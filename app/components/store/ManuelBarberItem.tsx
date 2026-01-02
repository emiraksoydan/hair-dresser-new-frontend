import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { TextInput, IconButton, Avatar } from 'react-native-paper';
import { Controller, Control, FieldErrors } from 'react-hook-form';

type ManuelBarberItemProps = {
    control: Control<any>;
    index: number;
    barberId: string;
    avatarUri?: string;
    errors: FieldErrors<any>;
    onRemove: () => void;
    onAvatarPress: () => void;
};

/**
 * Optimized Manuel Barber Item Component
 * - Memoized to prevent unnecessary re-renders
 * - Field-level isolation for better performance
 * - Only re-renders when its own data changes
 */
export const ManuelBarberItem = React.memo<ManuelBarberItemProps>(({
    control,
    index,
    barberId,
    avatarUri,
    errors,
    onRemove,
    onAvatarPress
}) => {
    const barberError = errors.barbers?.[index];
    const nameError = (barberError as any)?.name?.message;

    return (
        <View className="flex-row items-center gap-3 mb-3">
            {/* Avatar */}
            <TouchableOpacity
                activeOpacity={0.85}
                onPress={onAvatarPress}
            >
                {avatarUri ? (
                    <Avatar.Image size={40} source={{ uri: avatarUri }} />
                ) : (
                    <Avatar.Icon size={40} icon="account-circle" />
                )}
            </TouchableOpacity>

            {/* Berber İsmi */}
            <Controller
                control={control}
                name={`barbers.${index}.name`}
                render={({ field: { value, onChange, onBlur } }) => (
                    <TextInput
                        label="Berber adı"
                        mode="outlined"
                        dense
                        value={value ?? ''}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        textColor="white"
                        outlineColor="#444"
                        error={!!nameError}
                        theme={{ roundness: 10, colors: { onSurfaceVariant: "gray", primary: "white" } }}
                        style={{ backgroundColor: "#1F2937", borderWidth: 0, flex: 1 }}
                    />
                )}
            />

            {/* Delete Button */}
            <IconButton icon="delete" iconColor="#ef4444" onPress={onRemove} />
        </View>
    );
}, (prev, next) => {
    // Custom comparison for optimal re-render prevention
    return (
        prev.index === next.index &&
        prev.barberId === next.barberId &&
        prev.avatarUri === next.avatarUri &&
        JSON.stringify(prev.errors.barbers?.[prev.index]) === JSON.stringify(next.errors.barbers?.[next.index])
    );
});

ManuelBarberItem.displayName = 'ManuelBarberItem';
