import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Icon } from 'react-native-paper';
import { useGetAllNotificationsQuery, useStoreDecisionMutation, useCancelAppointmentMutation, useCompleteAppointmentMutation } from '../../store/api';
import { NotificationType, AppointmentStatus, DecisionStatus, NotificationPayload } from '../../types';
import { LottieViewComponent } from '../../components/common/lottieview';
import { SkeletonComponent } from '../../components/common/skeleton';
import { fmtDateOnly } from '../../utils/time/time-helper';
import { getAppointmentStatusColor, getAppointmentStatusText, canCancelAppointment, canCompleteAppointment } from '../../utils/appointment/appointment-helpers';
import { COLORS } from '../../constants/colors';
import { MESSAGES } from '../../constants/messages';
import FilterChip from '../../components/common/filter-chip';
import SharedAppointmentScreen from '../../components/appointment/sharedappointment';


const BarberStoreAppointmentPage = () => {
    return (
        <SharedAppointmentScreen />
    );
};

export default BarberStoreAppointmentPage;
