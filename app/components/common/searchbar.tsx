import React, { useState } from 'react';
import { View, TextInput } from 'react-native';
import { IconButton, Icon } from 'react-native-paper';
import { SearchBarProps } from '../../types';
import { useLanguage } from '../../hook/useLanguage';

// Tip tanımına buton fonksiyonlarını da eklediğini varsayıyorum
interface ExtendedSearchBarProps extends SearchBarProps {
    isList?: boolean;
    setIsList?: (val: boolean) => void;
    onFilterPress?: () => void;
    showButtons?: boolean;
}

const SearchBar: React.FC<ExtendedSearchBarProps> = ({
    searchQuery,
    setSearchQuery,
    isList = true,
    setIsList,
    onFilterPress,
    showButtons = true,
}) => {
    const { t } = useLanguage();
    const [isFocused, setIsFocused] = useState(false);

    // Butonları gösterip göstermeyeceğimizi belirle
    const shouldShowButtons = showButtons && setIsList && onFilterPress;

    return (
        <View
            className={`flex-row items-center px-3 rounded-xl bg-[#1a1b25] h-14`}
            style={{
                borderWidth: 1.5,
                borderColor: isFocused ? "#ffb900" : "#1a1b25",
            }}
        >
            <Icon source="magnify" size={22} color="#9aa1ae" />

            <TextInput
                placeholder={t('common.searchPlaceholder')}
                placeholderTextColor="#474b5a"
                onChangeText={setSearchQuery}
                value={searchQuery}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                className="flex-1 ml-2 text-white text-[15px]"
                style={{ fontFamily: 'CenturyGothic' }}
            />

            {shouldShowButtons && (
                <View className="flex-row items-center">
                    <IconButton
                        icon={isList ? "format-list-bulleted" : "view-grid-outline"}
                        iconColor={'#9aa1ae'}
                        size={22}
                        onPress={() => setIsList(!isList)}
                        style={{ margin: 0 }}
                    />
                    <IconButton
                        icon="filter-variant"
                        iconColor="#9aa1ae"
                        size={22}
                        onPress={onFilterPress}
                        style={{ margin: 0 }}
                    />
                </View>
            )}
        </View>
    );
};

export default SearchBar;