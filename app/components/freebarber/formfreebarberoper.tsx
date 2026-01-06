import React, { useEffect, useMemo, useRef } from "react";
import { ActivityIndicator, Image, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Divider, Icon, IconButton, TextInput, HelperText, Button, Switch } from "react-native-paper";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dropdown, MultiSelect } from "react-native-element-dropdown";
import { handlePickMultipleImages, handlePickImage, truncateFileName } from "../../utils/form/pick-document";
import { parseTR } from "../../utils/form/money-helper";
import { ImageOwnerType, ServiceOfferingCreateDto, ServiceOfferingUpdateDto } from "../../types";
import { resolveApiErrorMessage } from "../../utils/common/error";
import { trMoneyRegex } from "../../constants";
import { getCurrentLocationSafe } from "../../utils/location/location-helper";
import { useSnackbar } from "../../hook/useSnackbar";
import { mapBarberType, mapTypeToDisplayName } from "../../utils/form/form-mappers";
import {
    useAddFreeBarberPanelMutation,
    useDeleteImageMutation,
    useLazyGetFreeBarberMinePanelQuery,
    useLazyGetFreeBarberMinePanelDetailQuery,
    useUpdateFreeBarberPanelMutation,
    useUploadMultipleImagesMutation,
    useUploadImageMutation,
    useGetParentCategoriesQuery,
    useLazyGetChildCategoriesQuery,
} from "../../store/api";
import { useAuth } from "../../hook/useAuth";
import { CrudSkeletonComponent } from "../common/crudskeleton";

// --- Schema Definitions ---
const LocationSchema = z
    .object({
        latitude: z.number({ required_error: "Konum gerekli" }),
        longitude: z.number({ required_error: "Konum gerekli" }),
    })
    .refine((data) => data.latitude !== 0 && data.longitude !== 0, {
        message: "Konum seçmelisiniz",
        path: ["latitude"],
    });

const ImageAssetSchema = z
    .object({
        uri: z.string().min(1),
        name: z.string().min(1),
        type: z.string().optional(),
    });

const CertificateImageField = z
    .custom<{ uri: string; name: string; type?: string }>(
        (v) =>
            !!v &&
            typeof v === "object" &&
            "uri" in (v as any) && (v as any).uri,
        { message: "Lütfen sertifika resmi seçiniz." }
    )
    .pipe(ImageAssetSchema);

const schema = z.object({
    name: z.string({ required_error: 'İsim gerekli' }).trim().min(1, "En az 1 karakter gerekli"),
    surname: z.string({ required_error: 'Soyisim gerekli' }).trim().min(1, "En az 1 karakter gerekli"),
    images: z
        .array(
            z.object({
                uri: z.string().min(1),
                name: z.string().min(1),
                type: z.string().min(1),
            })
        )
        .max(3, "En fazla 3 resim ekleyebilirsiniz")
        .optional(),
    type: z.string({ required_error: "İşletme türü zorunlu" }),
    selectedCategories: z.array(z.string()).min(1, "En az bir kategori seçiniz"),
    prices: z.record(
        z.string(),
        z
            .string({ required_error: "Fiyat zorunlu" })
            .min(1, "Fiyat zorunlu")
            .regex(trMoneyRegex, "Lütfen fiyatı türkiye standartlarında girin")
    ),
    location: LocationSchema, // UI yok ama form state'de olacak
    certificateImage: CertificateImageField,
    isAvailable: z.boolean().default(true),
});

export type FormFreeBarberValues = z.input<typeof schema>;

type Props = { freeBarberId: string | null; enabled: boolean; onClose?: () => void };

export const FormFreeBarberOperation = React.memo(({ freeBarberId, enabled, onClose }: Props) => {
    const isEdit = freeBarberId != null;

    const { showSnack, SnackbarComponent } = useSnackbar();
    const { userId } = useAuth();

    const [triggerGetFreeBarberPanel, { data }] = useLazyGetFreeBarberMinePanelDetailQuery();
    const [triggerGetFreeBarberMinePanel] = useLazyGetFreeBarberMinePanelQuery();
    const [addFreeBarber, { isLoading: addFreeBarberLoad }] = useAddFreeBarberPanelMutation();
    const [updateFreeBarber, { isLoading: updateFreeBarberLoad }] = useUpdateFreeBarberPanelMutation();
    const [uploadMultipleImages] = useUploadMultipleImagesMutation();
    const [uploadImage] = useUploadImageMutation();
    const [deleteImage] = useDeleteImageMutation();
    const [isImagePickerLoading, setIsImagePickerLoading] = React.useState(false);
    const [isCertificateLoading, setIsCertificateLoading] = React.useState(false);
    const [loadedImages, setLoadedImages] = React.useState<Set<number>>(new Set());


    const {
        control,
        handleSubmit,
        setValue,
        getValues,
        watch,
        reset,
        formState: { errors },
    } = useForm<FormFreeBarberValues>({
        resolver: zodResolver(schema),
        shouldFocusError: true,
        mode: "onChange",
        defaultValues: {
            isAvailable: true,
            location: { latitude: 0, longitude: 0 },
            selectedCategories: [],
            prices: {},
        },
    });

    const images = watch("images");
    const selectedType = watch("type");
    const selectedCategories = watch("selectedCategories");
    const currentPrices = watch("prices");

    // Category API hooks
    const { data: parentCategoriesRaw = [] } = useGetParentCategoriesQuery();
    const [triggerGetChildCategories, { data: childCategories = [] }] = useLazyGetChildCategoriesQuery();

    // Duplicate kategorileri filtrele (name bazında)
    const parentCategories = React.useMemo(() => {
        const seen = new Set<string>();
        return parentCategoriesRaw.filter((cat: any) => {
            if (seen.has(cat.name)) return false;
            seen.add(cat.name);
            return true;
        });
    }, [parentCategoriesRaw]);

    // FreeBarber için sadece Erkek Berber ve Bayan Kuaför kategorilerini göster (Güzellik Salonu hariç)
    const allowedParentCategories = React.useMemo(() => {
        return parentCategories.filter((cat: any) =>
            cat.name === "Erkek Berber" || cat.name === "Bayan Kuaför"
        );
    }, [parentCategories]);

    // Seçilen parent kategoriye göre child kategorileri yükle
    // Data yüklendiğinde de child kategorileri yükle
    useEffect(() => {
        // selectedType varsa onu kullan, yoksa data.type'ı display name'e çevir
        const typeToLoad = selectedType || (data?.type != null ? mapTypeToDisplayName(data.type) : undefined);
        if (typeToLoad && allowedParentCategories.length > 0) {
            const parentCat = allowedParentCategories.find((cat: any) => cat.name === typeToLoad);
            if (parentCat) {
                triggerGetChildCategories(parentCat.id);
            }
        }
    }, [selectedType, data?.type, allowedParentCategories]);

    // Not: Form state'te selectedCategories + prices anahtarları serviceName (Category.Name) olarak tutulur.
    // Backend de ServiceOffering.ServiceName üzerinden çalıştığı için name -> id dönüşümü yapmıyoruz.


    // Edit ise panel detay çek
    useEffect(() => {
        if (!enabled) return;
        if (!isEdit) return;
        triggerGetFreeBarberPanel(freeBarberId!);
    }, [enabled, isEdit, freeBarberId, triggerGetFreeBarberPanel]);


    const pickMultipleImages = async () => {
        setIsImagePickerLoading(true);
        try {
            const files = await handlePickMultipleImages(3);
            if (files && files.length > 0) {
                const currentImages = getValues("images") || [];
                const newImages = [...currentImages, ...files].slice(0, 3);
                setValue("images", newImages, { shouldDirty: true, shouldValidate: true });
            }
        } finally {
            setIsImagePickerLoading(false);
        }
    };

    const removeImage = (index: number) => {
        const currentImages = getValues("images") || [];
        const newImages = currentImages.filter((_, i) => i !== index);
        setValue("images", newImages, { shouldDirty: true, shouldValidate: true });
    };
    const gettingLocRef = useRef(false);
    const setLocationNow = async (): Promise<boolean> => {
        if (gettingLocRef.current) return false;
        gettingLocRef.current = true;
        try {
            const res = await getCurrentLocationSafe();
            if (!res.ok) {
                showSnack(res.message ?? "Konum alınamadı", true);
                return false;
            }
            setValue(
                "location",
                { latitude: res.lat, longitude: res.lon },
                { shouldDirty: true, shouldValidate: true }
            );
            return true;
        } finally {
            gettingLocRef.current = false;
        }
    };

    // Create modunda: form açılınca 1 kere konumu al ve set et
    const didInitCreateLoc = useRef(false);
    useEffect(() => {
        if (!enabled) return;
        if (isEdit) return;
        if (didInitCreateLoc.current) return;
        didInitCreateLoc.current = true;
        setLocationNow();
    }, [enabled, isEdit]);

    useEffect(() => {
        if (!isEdit) return;
        if (!data) return;

        const imageListData = data?.imageList ?? [];
        const initialImages = imageListData.map((img: any) => ({
            uri: img.imageUrl,
            name: img.imageUrl.split("/").pop() ?? `image-${img.id}.jpg`,
            type: img.imageUrl.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg",
        }));

        // Certificate image - backend'den Guid gelecek ama biz UI'da göstermek için gerekli
        // Edit modunda sertifika resmi varsa, placeholder olarak sakla
        const certificateImageId = (data as any).barberCertificateImageId as string | undefined;
        const initialCategories = (data?.offerings ?? []).map((s: any) => s.serviceName);
        const initialPrices = (data?.offerings ?? []).reduce((acc: Record<string, string>, s: any) => {
            acc[s.serviceName] = String(s.price);
            return acc;
        }, {});

        const initialType = data?.type != null ? mapTypeToDisplayName(data.type) : "";
        reset({
            ...getValues(),
            name: data?.firstName ?? "",
            surname: data?.lastName ?? "",
            type: initialType,
            isAvailable: data?.isAvailable ?? true,
            images: initialImages.length > 0 ? initialImages : undefined,
            certificateImage: (data as any)?.barberCertificateImage ? {
                uri: (data as any).barberCertificateImage.imageUrl,
                name: (data as any).barberCertificateImage.imageUrl.split("/").pop() ?? "certificate.jpg",
                type: "image/jpeg",
            } : undefined,
            location: {
                latitude: (data as any)?.latitude ?? 0,
                longitude: (data as any)?.longitude ?? 0
            },
            selectedCategories: initialCategories,
            prices: initialPrices,
        });
        if (!data?.latitude || data.latitude === 0)
            setLocationNow();

    }, [data, isEdit, reset, getValues]);

    const effectiveType = selectedType ? selectedType : data?.type != null ? mapTypeToDisplayName(data.type) : undefined;

    const categoryOptions = useMemo(
        () => childCategories.map((cat: any) => ({ label: cat.name, value: cat.name })),
        [childCategories]
    );
    const categoryOptionsWithSelected = useMemo(() => {
        const base = [...categoryOptions];
        const seen = new Set(base.map((o) => o.value));
        (selectedCategories ?? []).forEach((v) => {
            if (!seen.has(v)) {
                base.push({ label: v, value: v });
                seen.add(v);
            }
        });
        return base;
    }, [categoryOptions, selectedCategories]);

    // Memoized category label lookup map to avoid O(n²) operations
    const categoryLabelMap = useMemo(() => {
        const map = new Map<string, string>();
        categoryOptionsWithSelected.forEach(opt => {
            map.set(opt.value, opt.label);
        });
        return map;
    }, [categoryOptionsWithSelected]);

    // Memoized category value set for O(1) validation
    const categoryValueSet = useMemo(() =>
        new Set(categoryOptionsWithSelected.map(opt => opt.value)),
        [categoryOptionsWithSelected]
    );

    // Memoized parent categories dropdown data
    const parentCategoriesDropdownData = useMemo(() =>
        allowedParentCategories.map((cat: any) => ({ label: cat.name, value: cat.name })),
        [allowedParentCategories]
    );

    // Memoized parent categories value set for validation
    const parentCategoriesValueSet = useMemo(() =>
        new Set(allowedParentCategories.map((cat: any) => cat.name)),
        [allowedParentCategories]
    );

    // Tip değişince category/price reset
    const prevTypeRef = useRef<string | undefined>(undefined);
    useEffect(() => {
        if (isEdit) {
            if (prevTypeRef.current === undefined) {
                prevTypeRef.current = selectedType;
                return;
            }
            if (selectedType && prevTypeRef.current && selectedType !== prevTypeRef.current) {
                setValue("selectedCategories", [], { shouldDirty: true, shouldValidate: true });
                setValue("prices", {}, { shouldDirty: true, shouldValidate: true });
            }
            prevTypeRef.current = selectedType;
            return;
        }

        // create
        setValue("selectedCategories", [], { shouldDirty: true, shouldValidate: true });
        setValue("prices", {}, { shouldDirty: true, shouldValidate: true });
    }, [selectedType, setValue, isEdit]);

    // prices sync
    useEffect(() => {
        const next: Record<string, string> = { ...(currentPrices ?? {}) };
        let changed = false;

        Object.keys(next).forEach((k) => {
            if (!selectedCategories?.includes(k)) {
                delete next[k];
                changed = true;
            }
        });

        selectedCategories?.forEach((k) => {
            if (!(k in next)) {
                next[k] = "";
                changed = true;
            }
        });

        // Use shouldValidate: false to prevent validation cascade
        if (changed) setValue("prices", next, { shouldDirty: true, shouldValidate: false });
    }, [selectedCategories, currentPrices, setValue]);

    const OnSubmit = React.useCallback(async (form: FormFreeBarberValues) => {
        if (isEdit) {
            const ok = await setLocationNow();
            if (!ok) return;
            form = { ...form, location: getValues("location") };
        } else {
            if (!form.location?.latitude || !form.location?.longitude || (form.location.latitude === 0 && form.location.longitude === 0)) {
                const ok = await setLocationNow();
                if (!ok) return;
                form = { ...form, location: getValues("location") };
            }
        }

        const existingImages = isEdit ? (data?.imageList ?? []) : [];
        const existingOfferings = isEdit ? (data?.offerings ?? []) : [];
        const formImages = form.images ?? [];
        const existingImageUrls = new Set(existingImages.map((img) => img.imageUrl));
        const formImageUrls = new Set(formImages.map((img) => img.uri));
        const removedImages = existingImages.filter((img) => !formImageUrls.has(img.imageUrl));
        const newImages = formImages.filter((img) => !existingImageUrls.has(img.uri));

        const offeringsMapped = (form.selectedCategories ?? [])
            .map((categoryName) => {
                // selectedCategories artık direkt category name olarak tutuluyor (ID değil)
                const priceStr = form.prices?.[categoryName] ?? "";
                const priceNum = parseTR(priceStr);
                if (priceNum == null) return null;

                if (!isEdit) {
                    const dto: ServiceOfferingCreateDto = { serviceName: categoryName, price: priceNum };
                    return dto;
                } else {
                    const existingId = (existingOfferings as any[]).find((o) => o.serviceName === categoryName)?.id;
                    const dto: ServiceOfferingUpdateDto = {
                        id: existingId,
                        serviceName: categoryName,
                        price: priceNum,
                        ownerId: freeBarberId!,
                    };
                    return dto;
                }
            })
            .filter((x): x is NonNullable<typeof x> => x !== null);

        const offerings = !isEdit
            ? (offeringsMapped as ServiceOfferingCreateDto[])
            : (offeringsMapped as ServiceOfferingUpdateDto[]);

        // Certificate image upload (tekli resim)
        let certImageId: string | undefined;

        if (form.certificateImage) {
            if (!userId) {
                showSnack("Kullanıcı bilgisi bulunamadı", true);
                return;
            }
            try {
                const formData = new FormData();
                formData.append("file", {
                    uri: form.certificateImage.uri,
                    name: form.certificateImage.name ?? "certificate.jpg",
                    type: form.certificateImage.type ?? "image/jpeg",
                } as any);
                formData.append("ownerType", String(ImageOwnerType.User));
                formData.append("ownerId", userId);

                const uploadResult = await uploadImage(formData).unwrap();
                if (!uploadResult.success || !uploadResult.data) {
                    showSnack("Sertifika resmi yüklenemedi", true);
                    return;
                }
                certImageId = uploadResult.data;
            } catch (err: any) {
                showSnack(resolveApiErrorMessage(err) || "Sertifika resmi yüklenirken hata oluştu", true);
                return;
            }
        }

        const payload: any = {
            ...(isEdit ? { id: data?.id ?? freeBarberId ?? "" } : {}),
            firstName: form.name.trim(),
            lastName: form.surname.trim(),
            type: mapBarberType(form.type),
            latitude: form.location.latitude,
            longitude: form.location.longitude,
            offerings,
            barberCertificateImageId: certImageId,
            isAvailable: isEdit ? form.isAvailable : true,
        };
        // Payload validation passed, proceed with submission

        try {
            const result = !isEdit ? await addFreeBarber(payload).unwrap() : await updateFreeBarber(payload).unwrap();
            if (result.success) {
                let uploadError: string | null = null;
                const hasImageChanges = isEdit ? (removedImages.length > 0 || newImages.length > 0) : newImages.length > 0;

                if (hasImageChanges) {
                    try {
                        let ownerId = isEdit ? (data?.id ?? freeBarberId ?? "") : "";
                        if (!ownerId) {
                            const panel = await triggerGetFreeBarberMinePanel().unwrap();
                            ownerId = panel?.id ?? "";
                        }
                        if (!ownerId) {
                            throw new Error("Panel id'si bulunamadı.");
                        }

                        if (isEdit) {
                            for (const img of removedImages) {
                                const deleteResult = await deleteImage(img.id).unwrap();
                                if (!deleteResult.success) {
                                    throw new Error(deleteResult.message || "Resim silinemedi.");
                                }
                            }
                        }

                        if (newImages.length > 0) {
                            const formData = new FormData();
                            newImages.forEach((img) => {
                                formData.append("files", {
                                    uri: img.uri,
                                    name: img.name ?? "photo.jpg",
                                    type: img.type ?? "image/jpeg",
                                } as any);
                            });
                            formData.append("ownerType", String(ImageOwnerType.FreeBarber));
                            formData.append("ownerId", ownerId);
                            const uploadResult = await uploadMultipleImages(formData).unwrap();
                            if (!uploadResult.success) {
                                throw new Error(uploadResult.message || "Panel resimleri yüklenemedi.");
                            }
                        }
                    } catch (uploadErr: any) {
                        uploadError = resolveApiErrorMessage(uploadErr);
                    }
                }

                if (uploadError) {
                    const baseMessage = isEdit ? "Panel güncellendi, resimler yüklenemedi." : "Panel oluşturuldu, resimler yüklenemedi.";
                    showSnack(`${baseMessage} ${uploadError}`, true);
                } else {
                    showSnack(result.message, false);
                }
                // Refresh panel data to show updated images
                if (isEdit) {
                    await triggerGetFreeBarberPanel(freeBarberId!);
                } else {
                    await triggerGetFreeBarberMinePanel();
                }
                onClose?.();
            } else {
                showSnack(result.message, true);
            }
        } catch (error: any) {
            showSnack(resolveApiErrorMessage(error), true);
        }
    }, [isEdit, data, freeBarberId, childCategories, addFreeBarber, updateFreeBarber, showSnack, onClose, getValues, setLocationNow, triggerGetFreeBarberMinePanel, deleteImage, uploadMultipleImages]);

    const onErrors = React.useCallback((errors: any) => {
        // Validation errors are displayed to user via form state
    }, []);

    // Skeleton sadece edit + data gelene kadar
    const showSkeleton = isEdit && !data;

    return (
        <View className="h-full">
            <View className="flex-row justify-between items-center px-4 py-2">
                <Text className="text-white flex-1 font-ibm-plex-sans-regular text-2xl">
                    {!isEdit ? "Panel Oluştur" : "Panel Düzenleme"}
                </Text>
                <IconButton onPress={() => onClose?.()} icon="close" iconColor="white" />
            </View>

            <Divider style={{ borderWidth: 0.1, backgroundColor: "gray" }} />

            {showSkeleton ? (
                <View className="flex-1 pt-4">
                    <CrudSkeletonComponent />
                </View>
            ) : (
                <>
                    <ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled contentContainerStyle={{ flexGrow: 1, paddingBottom: 50 }}>
                        <Text className="text-white text-xl mt-4 px-4">Panel Resimleri (Maks 3)</Text>

                        <Controller
                            control={control}
                            name="images"
                            render={() => (
                                <View className="mt-4">
                                    <ScrollView
                                        horizontal
                                        showsHorizontalScrollIndicator={false}
                                        contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
                                    >
                                        {(images ?? []).map((img, index) => (
                                            <View key={index} className="relative" style={{ width: 200, height: 150 }}>
                                                <Image
                                                    className="w-full h-full rounded-xl"
                                                    source={{ uri: img.uri }}
                                                    resizeMode="cover"
                                                    onLoad={() => setLoadedImages(prev => new Set(prev).add(index))}
                                                />
                                                {!loadedImages.has(index) && (
                                                    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1F2937', borderRadius: 10 }}>
                                                        <ActivityIndicator size="large" color="#888" />
                                                    </View>
                                                )}
                                                <TouchableOpacity
                                                    onPress={() => removeImage(index)}
                                                    className="absolute top-2 right-2 bg-red-500 rounded-full p-1.5"
                                                    activeOpacity={0.85}
                                                >
                                                    <Icon source="close" size={18} color="white" />
                                                </TouchableOpacity>
                                            </View>
                                        ))}
                                        {(!images || images.length < 3) && (
                                            <TouchableOpacity
                                                onPress={pickMultipleImages}
                                                disabled={isImagePickerLoading}
                                                className="bg-gray-800 rounded-xl border border-gray-700 items-center justify-center"
                                                style={{ width: 200, height: 150 }}
                                                activeOpacity={0.85}
                                            >
                                                {isImagePickerLoading ? (
                                                    <ActivityIndicator size="large" color="#888" />
                                                ) : (
                                                    <>
                                                        <Icon source="image-plus" size={40} color="#888" />
                                                        <Text className="text-gray-500 mt-2">Resim Ekle</Text>
                                                    </>
                                                )}
                                            </TouchableOpacity>
                                        )}
                                    </ScrollView>
                                    {errors.images && (
                                        <View className="px-4">
                                            <HelperText type="error" visible={!!errors.images}>
                                                {errors.images.message as string}
                                            </HelperText>
                                        </View>
                                    )}
                                </View>
                            )}
                        />

                        <Text className="text-white text-xl mt-6 px-4">Panel Bilgileri</Text>

                        {/* Certificate Image */}
                        <View className="px-4 mt-2">
                            <Controller
                                control={control}
                                name="certificateImage"
                                render={({ field: { value, onChange } }) => (
                                    <>
                                        <TouchableOpacity
                                            activeOpacity={0.85}
                                            disabled={isCertificateLoading}
                                            onPress={async () => {
                                                setIsCertificateLoading(true);
                                                try {
                                                    const file = await handlePickImage();
                                                    if (file) onChange(file);
                                                } finally {
                                                    setIsCertificateLoading(false);
                                                }
                                            }}
                                        >
                                            <TextInput
                                                label="Sertifika Resmi"
                                                mode="outlined"
                                                value={value?.name ? truncateFileName(value.name) : "Resim seçilmedi"}
                                                editable={false}
                                                dense
                                                pointerEvents="none"
                                                textColor="white"
                                                outlineColor={errors.certificateImage ? "#b00020" : "#444"}
                                                right={
                                                    isCertificateLoading ?
                                                        <ActivityIndicator size="small" color="#888" style={{ marginRight: 12 }} /> :
                                                        <TextInput.Icon icon="image" color="white" />
                                                }
                                                theme={{ roundness: 10, colors: { onSurfaceVariant: "gray", primary: "white" } }}
                                                style={{ backgroundColor: "#1F2937" }}
                                            />
                                        </TouchableOpacity>
                                        {value?.uri && !isCertificateLoading && (
                                            <View className="mt-2 mb-2 w-full">
                                                <Image
                                                    source={{ uri: value.uri }}
                                                    style={{ width: '100%', height: 200, borderRadius: 10 }}
                                                    resizeMode="cover"
                                                />
                                            </View>
                                        )}
                                        <HelperText type="error" visible={!!errors.certificateImage}>
                                            {errors?.certificateImage?.message as string}
                                        </HelperText>
                                    </>
                                )}
                            />
                        </View>

                        {/* Name / Surname */}
                        <View className="px-4 mt-0 flex-row gap-3">
                            <View className="flex-1">
                                <Controller
                                    control={control}
                                    name="name"
                                    render={({ field: { onChange, onBlur, value } }) => (
                                        <>
                                            <TextInput
                                                label="İsim"
                                                mode="outlined"
                                                dense
                                                value={value}
                                                onChangeText={onChange}
                                                onBlur={onBlur}
                                                textColor="white"
                                                outlineColor={errors.name ? "#b00020" : "#444"}
                                                theme={{ roundness: 10, colors: { onSurfaceVariant: "gray", primary: "white" } }}
                                                style={{ backgroundColor: "#1F2937" }}
                                            />
                                            <HelperText type="error" visible={!!errors.name}>
                                                {errors?.name?.message as string}
                                            </HelperText>
                                        </>
                                    )}
                                />
                            </View>
                            <View className="flex-1">
                                <Controller
                                    control={control}
                                    name="surname"
                                    render={({ field: { onChange, onBlur, value } }) => (
                                        <>
                                            <TextInput
                                                label="Soyisim"
                                                mode="outlined"
                                                dense
                                                value={value}
                                                onChangeText={onChange}
                                                onBlur={onBlur}
                                                textColor="white"
                                                outlineColor={errors.surname ? "#b00020" : "#444"}
                                                theme={{ roundness: 10, colors: { onSurfaceVariant: "gray", primary: "white" } }}
                                                style={{ backgroundColor: "#1F2937" }}
                                            />
                                            <HelperText type="error" visible={!!errors.surname}>
                                                {errors?.surname?.message as string}
                                            </HelperText>
                                        </>
                                    )}
                                />
                            </View>
                        </View>

                        {/* Type - Ana Kategori Seçimi */}
                        <View className="px-4 mt-1">
                            <Controller
                                control={control}
                                name="type"
                                render={({ field: { value, onChange }, fieldState: { error } }) => {
                                    // Use memoized dropdown data and validation set
                                    const isValueValid = value && parentCategoriesValueSet.has(value);

                                    return (
                                        <>
                                            <Dropdown
                                                data={parentCategoriesDropdownData}
                                                labelField="label"
                                                valueField="value"
                                                placeholder="Ana kategori seç (Erkek Berber / Bayan Kuaför)"
                                                value={isValueValid ? value : null}
                                                onChange={(item: any) => onChange(item.value)}
                                                style={{
                                                    height: 50,
                                                    borderRadius: 10,
                                                    paddingHorizontal: 12,
                                                    backgroundColor: "#1F2937",
                                                    borderWidth: 1,
                                                    borderColor: error ? "#b00020" : "#444",
                                                    marginTop: 6,
                                                }}
                                                placeholderStyle={{ color: "gray" }}
                                                selectedTextStyle={{ color: "white" }}
                                                itemTextStyle={{ color: "white" }}
                                                containerStyle={{ backgroundColor: "#1F2937", borderWidth: 0, borderRadius: 10 }}
                                                activeColor="#374151"
                                            />
                                            <HelperText type="error" visible={!!error}>
                                                {errors?.type?.message as string}
                                            </HelperText>
                                        </>
                                    );
                                }}
                            />
                        </View>

                        {/* Kategoriler - Alt Kategori Seçimi */}
                        {selectedType && categoryOptions.length > 0 ? (
                            <View className="px-4 mt-1">
                                <Text className="text-white text-xl mb-2">
                                    Hizmetler ({selectedType})
                                </Text>
                                <Controller
                                    control={control}
                                    name="selectedCategories"
                                    render={({ field: { value, onChange } }) => (
                                        <>
                                            <MultiSelect
                                                data={categoryOptionsWithSelected}
                                                labelField="label"
                                                valueField="value"
                                                value={(value ?? []) as string[]}
                                                onChange={onChange}
                                                placeholder="Hizmet seçin"
                                                dropdownPosition="top"
                                                inside
                                                alwaysRenderSelectedItem
                                                visibleSelectedItem
                                                flatListProps={{
                                                    initialNumToRender: 10,
                                                    maxToRenderPerBatch: 10,
                                                    windowSize: 5,
                                                }}
                                                style={{
                                                    backgroundColor: "#1F2937",
                                                    borderColor: errors.selectedCategories ? "#b00020" : "#444",
                                                    borderWidth: 1,
                                                    borderRadius: 10,
                                                    paddingHorizontal: 12,
                                                    paddingVertical: 8,
                                                }}
                                                containerStyle={{
                                                    backgroundColor: "#1F2937",
                                                    borderWidth: 1,
                                                    borderColor: '#444',
                                                    borderRadius: 10,
                                                    overflow: 'hidden',
                                                }}
                                                placeholderStyle={{ color: "gray" }}
                                                selectedTextStyle={{ color: "white" }}
                                                itemTextStyle={{ color: "white" }}
                                                activeColor="#0f766e"
                                                selectedStyle={{
                                                    borderRadius: 10,
                                                    backgroundColor: "#374151",
                                                    borderColor: "#0f766e",
                                                    paddingHorizontal: 10,
                                                    paddingVertical: 6,
                                                    margin: 0,
                                                }}
                                                selectedTextProps={{ numberOfLines: 1 }}
                                            />
                                            <HelperText type="error" visible={!!errors.selectedCategories}>
                                                {errors.selectedCategories?.message}
                                            </HelperText>
                                        </>
                                    )}
                                />
                            </View>
                        ) : null}

                        {/* Prices */}
                        {(selectedCategories ?? []).length > 0 && (
                            <View className="mt-3 mx-4 rounded-xl bg-gray-800 p-4">
                                {(selectedCategories ?? []).map((categoryId) => {
                                    const label = categoryLabelMap.get(categoryId) ?? categoryId;
                                    return (
                                        <View key={categoryId} className="flex-row items-center justify-between mb-2">
                                            <Text className="text-white w-[40%]" numberOfLines={1}>
                                                {label}
                                            </Text>
                                            <View className="w-[55%]">
                                                <Controller
                                                    control={control}
                                                    name={`prices.${categoryId}` as const}
                                                    render={({ field: { value, onChange }, fieldState: { error } }) => (
                                                        <TextInput
                                                            mode="outlined"
                                                            dense
                                                            keyboardType="numeric"
                                                            label="Fiyat (₺)"
                                                            value={value ?? ""}
                                                            onChangeText={(t) => onChange(t.replace(/[^\d.,]/g, ""))}
                                                            onBlur={() => {
                                                                const n = Number(value?.replace(/\./g, "").replace(",", "."));
                                                                if (!Number.isNaN(n)) {
                                                                    onChange(
                                                                        new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n)
                                                                    );
                                                                }
                                                            }}
                                                            textColor="white"
                                                            outlineColor={error ? "#b00020" : "#444"}
                                                            style={{ backgroundColor: "#1F2937", height: 40 }}
                                                            theme={{ roundness: 10, colors: { onSurfaceVariant: "gray", primary: "white" } }}
                                                        />
                                                    )}
                                                />
                                            </View>
                                        </View>
                                    );
                                })}
                            </View>
                        )}

                        {/* Availability (sadece edit) */}
                        {isEdit && (
                            <View className="px-4 mt-6">
                                <View className="bg-gray-800 rounded-xl p-4 flex-row items-center justify-between border border-gray-700">
                                    <Text className="text-white text-lg font-bold">Müsaitlik Durumu</Text>
                                    <Controller
                                        control={control}
                                        name="isAvailable"
                                        render={({ field: { value, onChange } }) => (
                                            <Switch value={value} onValueChange={onChange} color="#0f766e" />
                                        )}
                                    />
                                </View>
                            </View>
                        )}
                    </ScrollView>

                    <View className="px-4 my-4">
                        <Button
                            style={{ borderRadius: 10, paddingVertical: 4 }}
                            disabled={addFreeBarberLoad || updateFreeBarberLoad}
                            loading={addFreeBarberLoad || updateFreeBarberLoad}
                            mode="contained"
                            onPress={handleSubmit(OnSubmit, onErrors)}
                            buttonColor="#1F2937"
                            labelStyle={{ fontSize: 16 }}
                        >
                            {!isEdit ? "Ekle" : "Güncelle"}
                        </Button>
                    </View>
                </>
            )}

            <SnackbarComponent />
        </View>
    );
});
