import React, { useState } from 'react';
import { TouchableOpacity, View, Text } from 'react-native';
import { Icon } from 'react-native-paper';
import { MotiView } from 'moti';

interface MenuItem {
    icon: string;
    label: string;
    onPress: () => void;
}

interface HeaderDropdownMenuProps {
    items: MenuItem[];
    iconColor?: string;
    iconSize?: number;
}

export const HeaderDropdownMenu: React.FC<HeaderDropdownMenuProps> = ({
    items,
    iconColor = 'white',
    iconSize = 20,
}) => {
    const [isOpen, setIsOpen] = useState(false);

    const toggleMenu = () => {
        setIsOpen((prev) => !prev);
    };

    const handleItemPress = (onPress: () => void) => {
        onPress();
        setIsOpen(false);
    };

    return (
        <View className="relative">
            <TouchableOpacity
                onPress={toggleMenu}
                className="items-center justify-center"

            >
                <Icon source="menu" size={iconSize} color={iconColor} />
            </TouchableOpacity>

            <MotiView
                from={{ opacity: 0, scale: 0.8, translateY: -10 }}
                animate={{
                    opacity: isOpen ? 1 : 0,
                    scale: isOpen ? 1 : 0.8,
                    translateY: isOpen ? 0 : -10,
                }}
                transition={{
                    type: 'timing',
                    duration: 200,
                }}
                style={{
                    position: 'absolute',
                    top: 25,
                    right: 0,
                    backgroundColor: '#1F2937',
                    borderRadius: 12,
                    paddingVertical: 8,
                    paddingHorizontal: 4,
                    minWidth: 180,
                    zIndex: 1000,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                    elevation: 8,
                }}
                pointerEvents={isOpen ? 'auto' : 'none'}
            >
                {items.map((item, index) => (
                    <TouchableOpacity
                        key={index}
                        onPress={() => handleItemPress(item.onPress)}
                        className="flex-row items-center px-4 py-3 rounded-lg active:bg-[#2D3748]"
                    >
                        <View style={{ marginRight: 12 }}>
                            <Icon source={item.icon} size={20} color="white" />
                        </View>
                        <Text className="text-white text-base font-medium">{item.label}</Text>
                    </TouchableOpacity>
                ))}
            </MotiView>

            {/* Backdrop */}
            {isOpen && (
                <TouchableOpacity
                    style={{
                        position: 'absolute',
                        top: -1000,
                        left: -1000,
                        right: -1000,
                        bottom: -1000,
                        zIndex: 999,
                    }}
                    activeOpacity={1}
                    onPress={() => setIsOpen(false)}
                />
            )}
        </View>
    );
};

