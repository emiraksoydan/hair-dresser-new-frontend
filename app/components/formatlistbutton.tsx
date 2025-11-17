import { Text, View } from 'react-native'
import { IconButton } from 'react-native-paper'
import { FormatListButtonProps } from '../types'

const FormatListButton: React.FC<FormatListButtonProps> = ({ isList, setIsList }) => {
    return (
        <IconButton
            icon="format-list-bulleted"
            iconColor={isList ? 'white' : '#c2a523'}
            size={24}
            containerColor={isList ? '#c2a523' : '#202123'}
            style={{
                borderRadius: 10,
                height: 38,
                width: 38,
                marginRight: -5,
                borderWidth: 1,
                borderColor: '#2f3032'
            }}
            onPress={() => setIsList(!isList)}
        />
    )
}

export default FormatListButton

