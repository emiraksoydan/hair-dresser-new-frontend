import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native'
import { Text } from './Text'
import React, { useState } from 'react'
import { IconButton, Searchbar } from 'react-native-paper'
import { MotiView } from 'moti';


type ExpandChevronProps = {
    expanded: boolean;
    onPress: () => void;
    size?: number;
    color?: string;
    style?: StyleProp<ViewStyle>;
};


const MotiViewExpand: React.FC<ExpandChevronProps> = ({
    expanded,
    onPress,
    size = 24,
    color = 'white',
    style, }) => {
    const [isFocused, setIsFocused] = useState(false);
    return (
        <MotiView
            from={{ rotateZ: '0deg' }}
            animate={{ rotateZ: expanded ? '90deg' : '0deg' }}
            transition={{
                type: 'timing',
                duration: 200,
            }}
            style={style}
        >
            <IconButton
                icon="chevron-right"
                iconColor={color}
                size={size}
                onPress={onPress}
                style={{ margin: 0, padding: 0 }}
                rippleColor="transparent"
                animated={false}
            />
        </MotiView>
    );
};

export default MotiViewExpand;