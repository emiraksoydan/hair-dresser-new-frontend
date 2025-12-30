import React, { useEffect, useMemo, useRef, useState } from "react";
import { Image, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Divider, Icon, IconButton, TextInput, HelperText, Button, Switch } from "react-native-paper";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dropdown, MultiSelect } from "react-native-element-dropdown";
import { handlePickImage, handlePickMultipleImages, pickPdf, truncateFileName } from "../../utils/form/pick-document";
import { parseTR } from "../../utils/form/money-helper";
import { ImageOwnerType, ServiceOfferingCreateDto, ServiceOfferingUpdateDto } from "../../types";
import { useSheet } from "../../context/bottomsheet";
import { resolveApiErrorMessage } from "../../utils/common/error";
import { BUSINESS_TYPES, SERVICE_BY_TYPE, trMoneyRegex } from "../../constants";
import { getCurrentLocationSafe } from "../../utils/location/location-helper";
import { useSnackbar } from "../../hook/useSnackbar";
import { mapBarberType, mapTypeToDisplayName } from "../../utils/form/form-mappers";
import {
    useAddFreeBarberPanelMutation,
    useLazyGetFreeBarberMinePanelDetailQuery,
    useUpdateFreeBarberPanelMutation,
    useGetParentCategoriesQuery,
    useLazyGetChildCategoriesQuery,
} from "../../store/api";
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

const PdfAssetSchema = z
    .object({
        uri: z.string().min(1),
        name: z.string().min(1).regex(/\.pdf$/i, "PDF uzantılı olmalı"),
        mimeType: z.string().optional(),
        size: z.number().optional(),
    })
    .refine((v) => !v.size || v.size <= 5 * 1024 * 1024, {
        message: "En fazla 5 MB",
        path: ["size"],
    });

const FreeBarberFileField = z
    .custom<{ uri: string; name: string; mimeType?: string; size?: number }>(
        (v) =>
            !!v &&
            typeof v === "object" &&
            (("uri" in (v as any) && (v as any).uri) || ("name" in (v as any) && (v as any).name)),
        { message: "Lütfen PDF seçiniz." }
    )
    .pipe(PdfAssetSchema);

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
    freeBarberFile: FreeBarberFileField,
    isAvailable: z.boolean().default(true),
});

export type FormFreeBarberValues = z.input<typeof schema>;

type Props = { freeBarberId: string | null; enabled: boolean };

export const FormFreeBarberOperation = React.memo(({ freeBarberId, enabled }: Props) => {
    const isEdit = freeBarberId != null;

    const { showSnack, SnackbarComponent } = useSnackbar();

    const [triggerGetFreeBarberPanel, { data }] = useLazyGetFreeBarberMinePanelDetailQuery();
    const [addFreeBarber, { isLoading: addFreeBarberLoad }] = useAddFreeBarberPanelMutation();
    const [updateFreeBarber, { isLoading: updateFreeBarberLoad }] = useUpdateFreeBarberPanelMutation();

    const { dismiss } = useSheet("freeBarberMinePanel");

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
    React.useEffect(() => {
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
        const files = await handlePickMultipleImages(3);
        if (files && files.length > 0) {
            const currentImages = getValues("images") || [];
            const newImages = [...currentImages, ...files].slice(0, 3);
            setValue("images", newImages, { shouldDirty: true, shouldValidate: true });
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

    // ✅ Create modunda: form açılınca 1 kere konumu al ve set et
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

        const taxPath = (data as any).barberCertificate as string | undefined;
        let pdfName = "tax-document.pdf"; // Varsayılan isim
        if (taxPath) {
            const extractedName = taxPath.split("/").pop();
            if (extractedName) {
                // Eğer çekilen isim .pdf ile bitmiyorsa, biz ekleyelim ki Zod hata vermesin
                pdfName = extractedName.toLowerCase().endsWith('.pdf')
                    ? extractedName
                    : `${extractedName}.pdf`;
            }
        }
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
            freeBarberFile: taxPath
                ? {
                    uri: taxPath,
                    name: pdfName, // Düzeltilmiş ismi buraya veriyoruz
                    mimeType: "application/pdf",
                }
                : undefined,
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

        if (changed) setValue("prices", next, { shouldDirty: true, shouldValidate: true });
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

        const existingImages = data?.imageList ?? [];
        const existingOfferings = data?.offerings ?? [];

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

        const imageControl = !isEdit
            ? (form.images ?? []).map((img) => ({
                imageUrl: img.uri,
                ownerType: ImageOwnerType.FreeBarber,
            }))
            : (form.images ?? []).map((img, index) => {
                const existingImage = existingImages[index];
                return {
                    id: existingImage?.id,
                    imageUrl: img.uri,
                    imageOwnerId: freeBarberId!,
                    ownerType: ImageOwnerType.FreeBarber,
                };
            });

        const offerings = !isEdit
            ? (offeringsMapped as ServiceOfferingCreateDto[])
            : (offeringsMapped as ServiceOfferingUpdateDto[]);

        const payload: any = {
            ...(isEdit ? { id: data?.id } : {}),
            firstName: form.name.trim(),
            lastName: form.surname.trim(),
            imageList: imageControl,
            type: mapBarberType(form.type),
            latitude: form.location.latitude,
            longitude: form.location.longitude,
            offerings,
            barberCertificate: form.freeBarberFile.uri,
            isAvailable: isEdit ? form.isAvailable : true,
        };
        // Payload validation passed, proceed with submission

        try {
            const result = !isEdit ? await addFreeBarber(payload).unwrap() : await updateFreeBarber(payload).unwrap();
            if (result.success) {
                showSnack(result.message, false);
                dismiss();
            } else {
                showSnack(result.message, true);
            }
        } catch (error: any) {
            showSnack(resolveApiErrorMessage(error), true);
        }
    }, [isEdit, data, freeBarberId, childCategories, addFreeBarber, updateFreeBarber, showSnack, dismiss, getValues, setLocationNow]);

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
                <IconButton onPress={dismiss} icon="close" iconColor="white" />
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
                                <View className="px-4 mt-4">
                                    <View className="flex-row flex-wrap gap-2">
                                        {(images ?? []).map((img, index) => (
                                            <View key={index} className="relative" style={{ width: '48%', aspectRatio: 16/9 }}>
                                                <Image
                                                    className="w-full h-full rounded-xl"
                                                    source={{ uri: img.uri }}
                                                    resizeMode="cover"
                                                />
                                                <TouchableOpacity
                                                    onPress={() => removeImage(index)}
                                                    className="absolute top-1 right-1 bg-red-500 rounded-full p-1"
                                                    activeOpacity={0.85}
                                                >
                                                    <Icon source="close" size={16} color="white" />
                                                </TouchableOpacity>
                                            </View>
                                        ))}
                                        {(!images || images.length < 3) && (
                                            <TouchableOpacity
                                                onPress={pickMultipleImages}
                                                className="bg-gray-800 rounded-xl border border-gray-700 items-center justify-center"
                                                style={{ width: '48%', aspectRatio: 16/9 }}
                                                activeOpacity={0.85}
                                            >
                                                <Icon source="image-plus" size={40} color="#888" />
                                                <Text className="text-gray-500 mt-2">Resim Ekle</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                    {errors.images && (
                                        <HelperText type="error" visible={!!errors.images}>
                                            {errors.images.message as string}
                                        </HelperText>
                                    )}
                                </View>
                            )}
                        />

                        <Text className="text-white text-xl mt-6 px-4">Panel Bilgileri</Text>

                        {/* PDF */}
                        <View className="px-4 mt-2">
                            <Controller
                                control={control}
                                name="freeBarberFile"
                                render={({ field: { value, onChange } }) => (
                                    <>
                                        <TouchableOpacity
                                            activeOpacity={0.85}
                                            onPress={async () => {
                                                const file = await pickPdf();
                                                if (file) onChange(file);
                                            }}
                                        >
                                            <TextInput
                                                label="Vergi levhası (PDF)"
                                                mode="outlined"
                                                value={truncateFileName(value?.name ?? "")}
                                                editable={false}
                                                dense
                                                pointerEvents="none"
                                                textColor="white"
                                                outlineColor={errors.freeBarberFile ? "#b00020" : "#444"}
                                                right={<TextInput.Icon icon="file-pdf-box" color="white" />}
                                                theme={{ roundness: 10, colors: { onSurfaceVariant: "gray", primary: "white" } }}
                                                style={{ backgroundColor: "#1F2937" }}
                                            />
                                        </TouchableOpacity>
                                        <HelperText type="error" visible={!!errors.freeBarberFile}>
                                            {errors?.freeBarberFile?.message as string}
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
                                    // Dropdown data'sını memoize et
                                    const dropdownData = allowedParentCategories.map((cat: any) => ({ label: cat.name, value: cat.name }));
                                    // Value'nun data'da olup olmadığını kontrol et
                                    const isValueValid = value && dropdownData.some(item => item.value === value);

                                    return (
                                        <>
                                            <Dropdown
                                                data={dropdownData}
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
                                    const label = categoryOptionsWithSelected.find((i) => i.value === categoryId)?.label ?? categoryId;
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
