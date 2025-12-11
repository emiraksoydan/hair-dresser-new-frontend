import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { logger } from '../utils/common/logger';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

/**
 * Error Boundary component for global error handling
 * Catches JavaScript errors anywhere in the child component tree
 */
export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        logger.error('ErrorBoundary caught an error:', error, errorInfo);
        // TODO: Send to error tracking service (Sentry, etc.)
    }

    handleReset = () => {
        this.setState({ hasError: false, error: undefined });
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <View className="flex-1 bg-[#151618] items-center justify-center p-4">
                    <Text className="text-white text-xl font-bold mb-4">
                        {MESSAGES.ALERTS.ERROR}
                    </Text>
                    <Text className="text-gray-400 text-center mb-4">
                        {this.state.error?.message || MESSAGES.ERRORS.UNEXPECTED}
                    </Text>
                    <TouchableOpacity
                        onPress={this.handleReset}
                        className="bg-green-600 px-6 py-3 rounded-lg"
                    >
                        <Text className="text-white font-semibold">{MESSAGES.ACTIONS.RETRY}</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        return this.props.children;
    }
}

