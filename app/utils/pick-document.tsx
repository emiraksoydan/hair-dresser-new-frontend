import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from 'expo-image-picker';
import { FileObject } from "../types";


export const pickPdf = async () => {
    const res = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "com.adobe.pdf"],
        multiple: false,
        copyToCacheDirectory: true,
    });
    if (res.canceled) return null;

    const f = res.assets[0];
    return {
        uri: f.uri,
        name: f.name ?? "document.pdf",
        size: f.size ?? undefined,
        mimeType: f.mimeType ?? undefined,
    };
};
export const handlePickImage = async (): Promise<FileObject | null> => {
    const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
    });
    if (!result.canceled) {
        const file = result.assets[0];
        return {
            uri: file.uri,
            name: file.fileName ?? 'photo.jpg',
            type: file.type ?? 'image/jpeg',
        };
    }
    return null;
};

export const truncateFileName = (name: string, max = 40) =>
    name.length > max ? name.slice(0, max - 3) + "..." : name;
