/**
 * CachedImage Component
 * Provides persistent file system caching for images
 * Solves: Image reloading on component remount
 */

import React, { useState, useEffect, memo } from 'react';
import { Image, ImageProps, ActivityIndicator, View, ImageSourcePropType } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Crypto from 'expo-crypto';

interface CachedImageProps extends Omit<ImageProps, 'source'> {
    uri: string | null | undefined;
    defaultSource?: ImageSourcePropType;
    className?: string;
    resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center';
    skipLoading?: boolean; // For map markers - don't show loading indicator
}

export const CachedImage = memo<CachedImageProps>(({
    uri,
    defaultSource = require('../../../assets/images/empty.png'),
    className,
    resizeMode = 'cover',
    skipLoading = false,
    ...props
}) => {
    const [source, setSource] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        if (!uri) {
            setLoading(false);
            setError(true);
            return;
        }

        let cancelled = false;

        async function loadImage() {
            try {
                // Create cache key from URL hash
                const hash = await Crypto.digestStringAsync(
                    Crypto.CryptoDigestAlgorithm.SHA256,
                    uri
                );
                const cacheUri = `${FileSystem.cacheDirectory}img_${hash}.jpg`;

                // Check if cached
                const fileInfo = await FileSystem.getInfoAsync(cacheUri);

                if (fileInfo.exists) {
                    // ✅ Cache hit - instant load!
                    if (!cancelled) {
                        setSource(cacheUri);
                        setLoading(false);
                    }
                    return;
                }

                // Cache miss - download
                const downloadResult = await FileSystem.downloadAsync(uri, cacheUri);

                if (downloadResult.status === 200 && !cancelled) {
                    // ✅ Download successful, cached
                    setSource(downloadResult.uri);
                    setLoading(false);
                } else {
                    // ❌ Download failed, fallback to original URI
                    if (!cancelled) {
                        setSource(uri);
                        setLoading(false);
                    }
                }
            } catch (err) {
                console.warn('CachedImage error:', err);
                if (!cancelled) {
                    // On error, use original URI
                    setSource(uri);
                    setLoading(false);
                    setError(true);
                }
            }
        }

        loadImage();

        // Cleanup function
        return () => {
            cancelled = true;
        };
    }, [uri]);

    if (loading) {
        // For map markers: show default image instead of loading indicator
        if (skipLoading) {
            return (
                <Image
                    {...props}
                    source={defaultSource}
                    className={className}
                    resizeMode={resizeMode}
                />
            );
        }

        return (
            <View className={className} style={{ justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="small" color="#6b7280" />
            </View>
        );
    }

    if (error || !source) {
        return (
            <Image
                {...props}
                source={defaultSource}
                className={className}
                resizeMode={resizeMode}
            />
        );
    }

    return (
        <Image
            {...props}
            source={{ uri: source }}
            defaultSource={defaultSource}
            className={className}
            resizeMode={resizeMode}
            onError={() => setError(true)}
        />
    );
});

CachedImage.displayName = 'CachedImage';
