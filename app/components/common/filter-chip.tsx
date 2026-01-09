import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { Text } from './Text';

interface FilterChipProps {
    itemKey: any
    selected?: boolean;
    bgColor?: string;
    className?: string;
    fontSize?: number;
    isDisabled?: boolean
    onPress?: () => void;
    children: React.ReactNode;
    icon?: React.ReactNode;
}

const FilterChip: React.FC<FilterChipProps> = ({ itemKey, selected, className = 'rounded-3xl border-[1.5px] border-[#fb9400] px-3 py-2 flex-row flex-1', fontSize = 12, isDisabled = false, onPress, children, icon }) => {
    return (
        <TouchableOpacity
            key={itemKey}
            disabled={isDisabled}
            onPress={onPress}
            className={`items-center justify-center   ${className}  ${selected ? 'bg-green-500' : ''
                }`}
        >
            {icon && <View className="mr-1">{icon}</View>}
            {typeof children === 'string' || typeof children === 'number' ? (
                <Text
                    style={{
                        color: selected ? 'white' : '#d1d5db',
                        fontSize: fontSize,
                    }}
                >
                    {children}
                </Text>
            ) : (
                children
            )}
        </TouchableOpacity>
    );
};

export default FilterChip;