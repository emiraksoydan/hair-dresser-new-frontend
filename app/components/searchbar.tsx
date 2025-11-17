import { StyleSheet, Text, View } from 'react-native'
import React, { useState } from 'react'
import { Searchbar } from 'react-native-paper'
import { SearchBarProps } from '../types';

const SearchBar: React.FC<SearchBarProps> = ({ searchQuery, setSearchQuery }) => {
    const [isFocused, setIsFocused] = useState(false);
    return (
        <Searchbar
            placeholder="İsim ara..."
            placeholderTextColor="#9a9b9d"
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={{
                borderRadius: 10,
                backgroundColor: "#202123",
                height: 38,
                borderWidth: 1.5,
                borderColor: isFocused ? "#c2a523" : "#2f3032",
            }}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            iconColor="#c2a523"
            inputStyle={{
                fontSize: 14,
                paddingVertical: 0,
                color: "white",
                minHeight: 0,
            }}
        />
    );
};

export default SearchBar;