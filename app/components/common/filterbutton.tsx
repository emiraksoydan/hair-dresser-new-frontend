import { IconButton } from 'react-native-paper';
import { OnPressProps } from '../types';

const FilterButton = ({ onPress }: OnPressProps) => {

    return (
        <IconButton
            icon="filter-variant"
            iconColor="#f05e23"
            size={24}
            containerColor="#202123"
            style={{
                borderRadius: 10,
                height: 38,
                width: 38,
                borderWidth: 1,
                borderColor: '#2f3032'
            }}
            onPress={onPress}
        />
    )
}
export default FilterButton

