import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import React, { useEffect, useMemo, useState } from 'react'
import { z } from "zod";
import { BUSINESS_TYPES, DAYS_TR, PRICING_OPTIONS, SERVICE_BY_TYPE, trMoneyRegex } from '../../constants';
import { parseTR } from '../../utils/form/money-helper';
import { fmtHHmm, fromHHmm, HOLIDAY_OPTIONS, normalizeTime, timeHHmmRegex, toMinutes } from '../../utils/time/time-helper';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSheet } from '../../context/bottomsheet';
import { Avatar, Divider, HelperText, Icon, IconButton, TextInput, Button } from 'react-native-paper';
import { Dropdown, MultiSelect } from 'react-native-element-dropdown';
import {
    useDeleteImageMutation,
    useDeleteManuelBarberMutation,
    useDeleteStoreChairMutation,
    useGetParentCategoriesQuery,
    useLazyGetChildCategoriesQuery,
    useLazyGetStoreByIdQuery,
    useUpdateBarberStoreMutation,
    useUploadMultipleImagesMutation,
    useUploadImageMutation,
} from '../../store/api';
import { CrudSkeletonComponent } from '../common/crudskeleton';
import { pickImageAndSet, handlePickMultipleImages, handlePickImage, truncateFileName } from '../../utils/form/pick-document';
import { LegendList } from '@legendapp/list';
import DateTimePicker from "@react-native-community/datetimepicker";
import { MapPicker } from '../common/mappicker';
import { createStoreLocationHelpers } from '../../utils/store/store-location-helper';
import { getCurrentLocationSafe } from '../../utils/location/location-helper';
import { BarberEditModal } from './barbereditmodal';
import { BarberFormValues, BarberStoreUpdateDto, ChairFormInitial, ImageOwnerType, ServiceOfferingUpdateDto } from '../../types';
import { resolveApiErrorMessage } from '../../utils/common/error';
import { ChairEditModal } from './chaireditmodal';
import { safeCoord } from '../../utils/location/geo';
import { useSnackbar } from '../../hook/useSnackbar';
import { mapBarberType, mapPricingType, mapTypeToDisplayName } from '../../utils/form/form-mappers';



const ChairPricingSchema = z.object({
    mode: z.enum(["rent", "percent"]),
    rent: z.string().optional().nullable(),
    percent: z.coerce.number().optional().nullable()
}).superRefine((val, ctx) => {
    if (val.mode === "rent") {
        // Rent modunda sadece rent validasyonu
        if (!val.rent || val.rent.trim() === '') {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["rent"], message: "Saatlik kira fiyatı gerekli" });
            return;
        }
        if (!trMoneyRegex.test(val.rent)) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["rent"], message: "Lütfen fiyatı türkiye standartlarında girin" });
            return;
        }
        const n = parseTR(val.rent);
        if (n == undefined || n <= 0) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["rent"], message: "Saatlik kira fiyatı pozitif olmalı" });
        }
    }
    else if (val.mode === "percent") {
        // Percent modunda sadece percent validasyonu
        if (val.percent == null || val.percent === undefined) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["percent"], message: "Yüzde oranı gerekli" });
            return;
        }
        if (!Number.isInteger(val.percent)) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["percent"], message: "Tam sayı olmalı" });
            return;
        }
        if (val.percent < 10) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["percent"], message: "En az %10" });
            return;
        }
        if (val.percent > 90) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["percent"], message: "En fazla %90" });
            return;
        }
        if (val.percent % 10 !== 0) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["percent"], message: "10'un katı olmalı" });
        }
    }
});
const BarberSchema = z.object({
    id: z.string().uuid(),
    name: z.string().trim().min(1, 'Berber adı zorunlu'),
    avatar: z
        .object({
            uri: z.string(),
            name: z.string(),
            type: z.string().optional(),
        })
        .nullable()
        .optional(),
});
const LocationSchema = z.object({
    latitude: z.number(),
    longitude: z.number(),
    addressDescription: z.string({ required_error: 'Lütfen adres açıklamasını giriniz' }).min(1, "En az 1 karakter girin "),
}).superRefine((v, ctx) => {
    if (v.latitude == null || v.longitude == null) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["latitude"], message: "Konum seçmelisiniz" });
        return;
    }
});
const WorkingDaySchema = z.object({
    id: z.string().uuid().optional(),
    ownerId: z.string().uuid().optional(),
    dayOfWeek: z.number().int().min(0).max(6),
    isClosed: z.boolean(),
    startTime: z.string().regex(timeHHmmRegex, "HH:mm"),
    endTime: z.string().regex(timeHHmmRegex, "HH:mm"),
}).superRefine((v, ctx) => {
    if (v.isClosed) return;
    if (!v.startTime) { ctx.addIssue({ code: 'custom', path: ['startTime'], message: 'Başlangıç saati gerekli' }); return; }
    if (!v.endTime) { ctx.addIssue({ code: 'custom', path: ['endTime'], message: 'Bitiş saati gerekli' }); return; }
    if (v.startTime === "00:00") {
        ctx.addIssue({ code: 'custom', path: ['startTime'], message: 'Başlangıç 00:00 olamaz' });
    }
    const s = toMinutes(v.startTime);
    const e = toMinutes(v.endTime);
    if (s >= e) {
        ctx.addIssue({ code: 'custom', path: ['endTime'], message: 'Bitiş, başlangıçtan büyük olmalı' });
        return;
    }
    const diffMin = e - s;
    if (diffMin < 360) ctx.addIssue({ code: 'custom', path: ['endTime'], message: 'Çalışma süresi en az 6 saat olmalı' });
    if (diffMin > 1080) ctx.addIssue({ code: 'custom', path: ['endTime'], message: 'Çalışma süresi en fazla 18 saat olmalı' });
});
const ChairSchema = z.object({
    id: z.string().uuid(),
    name: z.string().trim().optional(),
    barberId: z.string().uuid().optional(),
}).superRefine((v, ctx) => {
    if (!v.name && !v.barberId) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["name"],
            message: "Koltuk adı veya berber atanmalı",
        });
    }
    if (v.name && v.barberId) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["barberId"],
            message: "Koltuk ya isimli ya berber atanmış olmalı, ikisi birden değil",
        });
    }
});

const ImageAssetSchema = z.object({
    uri: z.string().min(1),
    name: z.string().min(1),
    type: z.string().optional(),
});

const TaxDocumentImageField = z
    .custom<{ uri: string; name: string; type?: string }>(
        (v) =>
            !!v &&
            typeof v === "object" &&
            "uri" in (v as any) && (v as any).uri,
        { message: "Lütfen vergi levhası resmi seçiniz." }
    )
    .pipe(ImageAssetSchema);

const schema = z.object({
    storeImages: z
        .array(
            z.object({
                uri: z.string().min(1),
                name: z.string().min(1),
                type: z.string().min(1),
            })
        )
        .max(3, "En fazla 3 resim ekleyebilirsiniz")
        .optional(),
    storeName: z.string({ required_error: 'İşletme adı zorunlu' }).trim(),
    type: z.string({ required_error: 'İşletme türü zorunlu' }),
    selectedCategories: z.array(z.string()).min(1, 'En az bir hizmet seçiniz'),
    prices: z.record(
        z.string(),
        z.string({ required_error: 'Fiyat zorunlu' }).min(1, 'Fiyat zorunlu').regex(trMoneyRegex, 'Lütfen fiyatı türkiye standartlarında girin')
    ),
    pricingType: ChairPricingSchema,
    workingHours: z.array(WorkingDaySchema).length(7, "7 gün olmalı"),
    holidayDays: z.array(z.number().int().min(0).max(6)).default([]),
    location: LocationSchema,
    taxDocumentImage: TaxDocumentImageField,
    barbers: z.array(BarberSchema).default([]),
    chairs: z.array(ChairSchema).min(1, "En az 1 koltuk olmalı").default([]),
})
export type FormUpdateValues = z.input<typeof schema>;

const FormStoreUpdate = ({ storeId, enabled, }: {
    storeId: string; enabled: boolean
}) => {
    const { dismiss } = useSheet('updateStoreMine');
    const [triggerGetStore, { data, isLoading, isError, error }] = useLazyGetStoreByIdQuery();
    const [updateStore, { isLoading: updateLoading, isSuccess }] = useUpdateBarberStoreMutation();
    const [uploadMultipleImages] = useUploadMultipleImagesMutation();
    const [uploadImage] = useUploadImageMutation();
    const [deleteImage] = useDeleteImageMutation();
    const [isImagePickerLoading, setIsImagePickerLoading] = React.useState(false);
    const [isTaxDocumentLoading, setIsTaxDocumentLoading] = React.useState(false);
    const [loadedStoreImages, setLoadedStoreImages] = React.useState<Set<number>>(new Set());

    useEffect(() => {
        if (enabled && storeId) {
            triggerGetStore(storeId);
        }
    }, [enabled, storeId, triggerGetStore]);

    const { showSnack, SnackbarComponent } = useSnackbar();

    const errorText = resolveApiErrorMessage(error);
    useEffect(() => {
        if (isError) {
            showSnack(errorText, true);
        }
    }, [isError, errorText, showSnack])

    const pickMultipleImages = async () => {
        setIsImagePickerLoading(true);
        try {
            const files = await handlePickMultipleImages(3);
            if (files && files.length > 0) {
                const currentImages = getValues("storeImages") || [];
                const newImages = [...currentImages, ...files].slice(0, 3);
                setValue("storeImages", newImages, { shouldDirty: true, shouldValidate: true });
            }
        } finally {
            setIsImagePickerLoading(false);
        }
    };

    const removeImage = (index: number) => {
        const currentImages = getValues("storeImages") || [];
        const newImages = currentImages.filter((_, i) => i !== index);
        setValue("storeImages", newImages, { shouldDirty: true, shouldValidate: true });
    };
    const [barberModalVisible, setBarberModalVisible] = useState(false);
    const [chairModalVisible, setChairModalVisible] = useState(false);

    const [barberModalTitle, setBarberModalTitle] = useState('Berber Ekle');
    const [chairModalTitle, setChairModalTitle] = useState('Koltuk Ekle');

    const [barberInitialValues, setBarberInitialValues] = useState<Partial<BarberFormValues>>({});
    const [chairInitialValues, setChairInitialValues] = useState<Partial<ChairFormInitial>>({});
    const [chairAvailableBarbers, setChairAvailableBarbers] = useState<
        { id: string; name: string }[]
    >([]);

    const [deleteBarber, { isLoading: isDeleting }] = useDeleteManuelBarberMutation();
    const [deleteChair, { isLoading: isDeletingChair }] = useDeleteStoreChairMutation();


    const getAvailableBarbersForChair = (chairIndex: number) => {
        const currentChair = chairs[chairIndex];
        if (!currentChair) return [];

        const assignedBarberId = currentChair.barberId ?? null;

        return barbers
            .map(b => ({ id: b.id, name: b.name }))
            .filter(b => {
                const usedInAnotherChair = chairs.some((c, i) => i !== chairIndex && c.barberId === b.id);

                if (assignedBarberId && b.id === assignedBarberId) return true;
                return !usedInAnotherChair;
            });
    };
    const getAvailableBarbersForNewChair = () => {
        return barbers
            .filter(b => {
                const isUsed = chairs.some(c => c.barberId === b.id);
                return !isUsed;
            })
            .map(b => ({
                id: b.id,
                name: b.name,
            }));
    };
    const {
        control,
        handleSubmit,
        trigger,
        setValue,
        getValues,
        watch,
        reset,
        formState: { errors },
    } = useForm<FormUpdateValues>({
        resolver: zodResolver(schema),
        shouldFocusError: true,
        mode: 'onSubmit',
        defaultValues: { storeName: data?.storeName, },
    });

    useEffect(() => {
        if (!data) return;
        const imageListData = data.imageList ?? [];
        const initialImages = imageListData.map((img: any) => ({
            uri: img.imageUrl,
            name: img.imageUrl.split("/").pop() ?? `image-${img.id}.jpg`,
            type: img.imageUrl.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg",
        }));

        // Backend'den gelen serviceName aslında category name
        // Bunu ID'ye çevirmek için child kategoriler yüklenene kadar name olarak tutacağız
        const initialCategories = (data.serviceOfferings ?? []).map(s => s.serviceName);
        const initialPrices = (data.serviceOfferings ?? []).reduce((acc, s) => {
            acc[s.serviceName] = String(s.price);
            return acc;
        }, {} as Record<string, string>);
        const initialBarbers = (data.manuelBarbers ?? []).map(m => ({
            id: m.id,
            name: m.fullName ?? '',
            avatar: m.profileImageUrl
                ? {
                    uri: m.profileImageUrl,
                    name: m.profileImageUrl.split('/').pop() ?? `barber-${m.id}.jpg`,
                    type: 'image/jpeg',
                }
                : null,
        }));
        const initialChairs = (data.barberStoreChairs ?? []).map(c => ({
            id: c.id,
            name: c.name ?? undefined,
            barberId: c.manualBarberId ?? undefined,
        }));
        const initialPricing: FormUpdateValues["pricingType"] =
            data.pricingType?.toLowerCase() === "rent"
                ? {
                    mode: "rent",
                    rent: new Intl.NumberFormat("tr-TR", {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 2,
                    }).format(data.pricingValue ?? 0),
                    percent: undefined,
                }
                : {
                    mode: "percent",
                    percent: data.pricingValue ?? undefined,
                    rent: undefined,
                };

        const initialWorkingHours: FormUpdateValues["workingHours"] =
            Array.from({ length: 7 }, (_, day) => {
                const w = data.workingHours?.find(x => x.dayOfWeek === day);
                if (!w) {
                    return {
                        id: undefined,
                        ownerId: undefined,
                        dayOfWeek: day,
                        isClosed: true,
                        startTime: "09:00",
                        endTime: "18:00",
                    };
                }
                return {
                    id: w.id,
                    ownerId: w.ownerId,
                    dayOfWeek: w.dayOfWeek,
                    isClosed: w.isClosed,
                    startTime: normalizeTime(w.startTime as any),
                    endTime: normalizeTime(w.endTime as any),
                };
            });
        const initialHolidayDays = initialWorkingHours.filter(w => w.isClosed).map(w => w.dayOfWeek);
        const c0 = safeCoord(data.latitude, data.longitude);

        reset({
            storeName: data.storeName ?? "",
            // BarberStoreDetail.type backend'den string gelebilir (örn: "MaleHairdresser")
            type: mapTypeToDisplayName(data.type as any),
            storeImages: initialImages.length > 0 ? initialImages : undefined,
            taxDocumentImage: data.taxDocumentImage ? {
                uri: data.taxDocumentImage.imageUrl,
                name: data.taxDocumentImage.imageUrl.split("/").pop() ?? "tax-document.jpg",
                type: "image/jpeg",
            } : undefined,
            location: {
                latitude: c0?.lat ?? 0,
                longitude: c0?.lon ?? 0,
                addressDescription: data.addressDescription ?? "",
            },
            selectedCategories: initialCategories,
            prices: initialPrices,
            barbers: initialBarbers,
            chairs: initialChairs,
            pricingType: initialPricing,
            holidayDays: initialHolidayDays,
            workingHours: initialWorkingHours,
        });
    }, [data, reset]);

    const location = watch("location");
    const address = location?.addressDescription;
    const images = watch('storeImages');
    const barbers = watch('barbers') ?? [];
    const chairs = watch("chairs") ?? [];
    const pricingMode = watch("pricingType.mode");
    const taxDocErrorText =
        (errors.taxDocumentImage as any)?.message ||
        (errors.taxDocumentImage as any)?.name?.message ||
        (errors.taxDocumentImage as any)?.uri?.message;
    const barberErrorText = React.useMemo(() => {
        if (!errors.barbers) return "";
        const msgs: string[] = [];
        barbers.forEach((_, idx) => {
            const m = errors.barbers?.[idx]?.name?.message as string | undefined;
            if (m) msgs.push(`• ${idx + 1}. berber: ${m}`);
        });
        return msgs.join("\n");
    }, [errors.barbers, barbers]);
    const chairsErrorText = React.useMemo(() => {
        if (!errors.chairs) return "";
        const msgs: string[] = [];
        chairs.forEach((_, idx) => {
            const m1 = errors.chairs?.[idx]?.name?.message as string | undefined;
            const m2 = errors.chairs?.[idx]?.barberId?.message as string | undefined;
            if (m1 || m2) msgs.push(`• ${idx + 1}. koltuk: ${m1 ?? m2}`);
        });
        return msgs.join("\n");
    }, [errors.chairs, chairs]);

    const { fields: chairFields, append: addChair, remove: removeChair, update: updateChair } = useFieldArray({
        control,
        name: "chairs",
        keyName: "_key",

    });
    const { fields: barberFields, append: addBarber, remove: removeBarber } = useFieldArray({
        control,
        name: 'barbers',
        keyName: "_key",
    });

    const working = watch("workingHours") ?? [];
    const holidayDays = watch("holidayDays") ?? [];
    const [activeDay, setActiveDay] = useState<number>(0);
    const [activeStart, setActiveStart] = useState<Date>(() => fromHHmm(working[0]?.startTime ?? "09:00"));
    const [activeEnd, setActiveEnd] = useState<Date>(() => fromHHmm(working[0]?.endTime ?? "18:00"));
    const selectedType = watch("type");
    const currentPrices = watch("prices");
    const selectedCategories = watch("selectedCategories") ?? [];
    const effectiveType = selectedType || (data?.type ?? undefined);

    // Category API hooks
    const { data: parentCategoriesRaw = [] } = useGetParentCategoriesQuery();

    // Duplicate kategorileri filtrele (name bazında)
    const parentCategories = React.useMemo(() => {
        if (!parentCategoriesRaw || parentCategoriesRaw.length === 0) return [];
        const seen = new Set<string>();
        return parentCategoriesRaw.filter((cat: any) => {
            if (seen.has(cat.name)) return false;
            seen.add(cat.name);
            return true;
        });
    }, [parentCategoriesRaw]);
    const [triggerGetChildCategories, { data: childCategories = [] }] = useLazyGetChildCategoriesQuery();

    // Store tüm kategorileri seçebilir
    // Data yüklendiğinde de child kategorileri yükle
    React.useEffect(() => {
        // selectedType varsa onu kullan, yoksa data.type'ı display name'e çevir
        const dataTypeName = data?.type != null ? mapTypeToDisplayName(data.type as any) : undefined;
        const typeToLoad = selectedType || dataTypeName;

        if (typeToLoad && parentCategories.length > 0) {
            const parentCat = parentCategories.find((cat: any) => cat.name === typeToLoad);
            if (parentCat) {
                triggerGetChildCategories(parentCat.id);
            }
        }
    }, [selectedType, data?.type, parentCategories]);

    const categoryOptions = useMemo(
        // Form state'te selectedCategories + prices anahtarları serviceName (Category.Name) olarak tutulur.
        // Backend de ServiceOffering.ServiceName üzerinden çalıştığı için en stabil yaklaşım.
        () => childCategories.map((cat: any) => ({ label: cat.name, value: cat.name })),
        [childCategories]
    );
    console.log(categoryOptions);
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

    useEffect(() => {
        const idx = (working ?? []).findIndex(w => w.dayOfWeek === activeDay);
        if (idx < 0) return;
        const row = working[idx];
        if (!row) return;
        setActiveStart(fromHHmm(row.startTime));
        setActiveEnd(fromHHmm(row.endTime));
    }, [activeDay, working]);



    const { updateLocation, reverseAndSetAddress } = createStoreLocationHelpers<FormUpdateValues>(setValue, getValues);
    const [locBusy, setLocBusy] = useState(false);
    const pickMyCurrentLocation = async () => {
        if (locBusy) return;
        setLocBusy(true);
        try {
            const res = await getCurrentLocationSafe();
            if (!res.ok) {
                showSnack(res.message, true);
                return;
            }

            updateLocation(res.lat, res.lon);
            await reverseAndSetAddress(res.lat, res.lon);
        } finally {
            setLocBusy(false);
        }
    };

    const openEditBarberModal = (index: number) => {
        const current = barbers[index];
        if (!current) return;
        setBarberModalTitle('Berber Güncelle');
        setBarberInitialValues({
            name: current.name,
            profileImage: current.avatar ? {
                uri: current.avatar.uri,
                name: current.avatar.name ?? 'photo.jpg',
                type: current.avatar.type ?? 'image/jpeg',
            } : undefined,
            id: current.id,
        });
        setBarberModalVisible(true);
    };
    const openEditChairModal = (index: number) => {
        const current = chairs[index];
        if (!current) return;
        const availableBarbers = getAvailableBarbersForChair(index);
        setChairModalTitle('Koltuk Güncelle');
        setChairInitialValues({
            id: current.id,
            name: current.name ?? undefined,
            barberId: current.barberId ?? undefined,
        });
        setChairAvailableBarbers(availableBarbers);
        setChairModalVisible(true);
    };
    const closeBarberModal = async () => {
        setBarberModalVisible(false);
        // Modal kapandığında store data'sını yeniden yükle
        await triggerGetStore(storeId);
    };
    const closeChairModal = async () => {
        setChairModalVisible(false);
        setChairInitialValues({});
        setChairAvailableBarbers([]);
        // Modal kapandığında store data'sını yeniden yükle
        await triggerGetStore(storeId);
    };

    const openCreateBarberModal = () => {
        setBarberModalTitle('Berber Ekle');
        setBarberInitialValues({ name: '', profileImage: undefined, id: '' });
        setBarberModalVisible(true);
    };
    const openCreateChairModal = () => {
        const availableBarbers = getAvailableBarbersForNewChair();
        setChairModalTitle('Koltuk Ekle');
        setChairInitialValues({ name: undefined, id: undefined, barberId: undefined });
        setChairAvailableBarbers(availableBarbers);
        setChairModalVisible(true);
    };
    const handleDeleteBarber = (index: number) => {
        const current = barbers[index];
        if (!current) return;
        Alert.alert(
            'Berberi Sil',
            `"${current.name}" isimli berberi silmek istediğinize emin misiniz?`,
            [
                {
                    text: 'Vazgeç',
                    style: 'cancel',
                },
                {
                    text: 'Sil',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            if (current.id) {
                                var res = await deleteBarber(current.id).unwrap();
                                showSnack(res.message, !res.success);
                                if (res.success) {
                                    // Store data'sını yeniden yükle
                                    await triggerGetStore(storeId);
                                }
                            }
                        } catch (e) {
                            showSnack(resolveApiErrorMessage(e), true);
                        }
                    },
                },
            ],
            { cancelable: true }
        );
    };
    const handleChair = (index: number) => {
        const current = chairs[index];
        if (!current) return;
        Alert.alert(
            'Koltuğu Sil',
            `"${current.name}" isimli koltuğu silmek istediğinize emin misiniz?`,
            [
                {
                    text: 'Vazgeç',
                    style: 'cancel',
                },
                {
                    text: 'Sil',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            if (current.id) {
                                var res = await deleteChair(current.id).unwrap();
                                showSnack(res.message, !res.success);
                                if (res.success) {
                                    // Store data'sını yeniden yükle
                                    await triggerGetStore(storeId);
                                }
                            }
                        } catch (e) {
                            showSnack(resolveApiErrorMessage(e), true);
                        }
                    },
                },
            ],
            { cancelable: true }
        );
    };


    const prevTypeRef = React.useRef<string | undefined>(undefined);
    useEffect(() => {
        if (prevTypeRef.current === undefined) {
            prevTypeRef.current = selectedType;
            return;
        }
        if (selectedType && prevTypeRef.current && selectedType !== prevTypeRef.current) {
            setValue("selectedCategories", [], { shouldDirty: true, shouldValidate: true });
            setValue("prices", {}, { shouldDirty: true, shouldValidate: true });
        }
        prevTypeRef.current = selectedType;
    }, [selectedType, setValue]);

    useEffect(() => {
        const next: Record<string, string> = { ...(currentPrices ?? {}) };
        let changed = false;
        Object.keys(next).forEach((k) => {
            if (!selectedCategories.includes(k)) {
                delete next[k];
                changed = true;
            }
        });
        selectedCategories.forEach((k) => {
            if (!(k in next)) {
                next[k] = "";
                changed = true;
            }
        });
        if (changed) {
            setValue("prices", next, {
                shouldDirty: true,
                shouldValidate: true,
            });
        }
    }, [selectedCategories, currentPrices, setValue]);


    const OnSubmit = async (form: FormUpdateValues) => {
        const existingImages = data?.imageList ?? [];
        const formImages = form.storeImages ?? [];
        const existingImageUrls = new Set(existingImages.map((img) => img.imageUrl));
        const formImageUrls = new Set(formImages.map((img) => img.uri));
        const removedImages = existingImages.filter((img) => !formImageUrls.has(img.imageUrl));
        const newImages = formImages.filter((img) => !existingImageUrls.has(img.uri));

        // Tax document image upload (tekli resim)
        let taxDocumentImageId: string | undefined;
        if (form.taxDocumentImage) {
            try {
                const formData = new FormData();
                formData.append("file", {
                    uri: form.taxDocumentImage.uri,
                    name: form.taxDocumentImage.name ?? "tax-document.jpg",
                    type: form.taxDocumentImage.type ?? "image/jpeg",
                } as any);

                const uploadResult = await uploadImage(formData).unwrap();
                if (!uploadResult.success || !uploadResult.data) {
                    showSnack("Vergi levhası resmi yüklenemedi", true);
                    return;
                }
                taxDocumentImageId = uploadResult.data;
            } catch (err: any) {
                showSnack(resolveApiErrorMessage(err) || "Vergi levhası yüklenirken hata oluştu", true);
                return;
            }
        }

        const payload: BarberStoreUpdateDto = {
            id: storeId,
            storeName: form.storeName,
            type: mapBarberType(form.type),
            pricingType: mapPricingType(form.pricingType.mode),
            addressDescription: form.location.addressDescription,
            latitude: form.location.latitude,
            longitude: form.location.longitude,
            pricingValue: form.pricingType.mode == 'percent' ? form.pricingType.percent! : (parseTR(form.pricingType.rent ?? undefined) ?? 0),
            taxDocumentImageId: taxDocumentImageId,
            chairs: form.chairs!.map((c, index) => {
                return {
                    id: c.id,
                    barberId: c.barberId,
                    name: c.name,
                    storeId: storeId,
                };
            }),
            offerings: (form.selectedCategories ?? [])
                .map((categoryId) => {
                    const priceStr = form.prices?.[categoryId] ?? "";
                    const priceNum = parseTR(priceStr);
                    if (priceNum == null) return null;

                    // Category name'i bul
                    const categoryName = childCategories.find((cat: any) => cat.id === categoryId)?.name ?? categoryId;

                    const existingId = data?.serviceOfferings
                        ?.find(o => o.serviceName === categoryName)?.id;

                    const dto: ServiceOfferingUpdateDto = {
                        id: existingId,
                        serviceName: categoryName,
                        price: priceNum,
                        ownerId: storeId,
                    };
                    return dto;
                })
                .filter((x): x is ServiceOfferingUpdateDto => x !== null),
            manuelBarbers: (form.barbers || []).map((barber) => {
                return {
                    id: barber.id,
                    fullName: barber.name,
                }
            }),
            workingHours: form.workingHours
        }

        try {
            var result = await updateStore(payload).unwrap();
            // Result handled by RTK Query mutation
            if (result.success) {
                let uploadError: string | null = null;
                const hasImageChanges = removedImages.length > 0 || newImages.length > 0;
                if (hasImageChanges) {
                    try {
                        for (const img of removedImages) {
                            const deleteResult = await deleteImage(img.id).unwrap();
                            if (!deleteResult.success) {
                                throw new Error(deleteResult.message || "Resim silinemedi.");
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
                            formData.append("ownerType", String(ImageOwnerType.Store));
                            formData.append("ownerId", storeId);
                            const uploadResult = await uploadMultipleImages(formData).unwrap();
                            if (!uploadResult.success) {
                                throw new Error(uploadResult.message || "İşletme resimleri yüklenemedi.");
                            }
                        }
                    } catch (uploadErr: any) {
                        uploadError = resolveApiErrorMessage(uploadErr);
                    }
                }

                if (uploadError) {
                    showSnack(`İşletme güncellendi, resimler yüklenemedi. ${uploadError}`, true);
                } else {
                    showSnack(result.message, false);
                }
                dismiss();
            }
            else {
                showSnack(result.message, true);
            }
        } catch (error: any) {
            const msg = resolveApiErrorMessage(error);
            showSnack(msg, true);
        }
    };
    const c = safeCoord(location?.latitude, location?.longitude);

    return (
        <View className='h-full'>
            <View className='flex-row justify-between items-center px-4'>
                <Text className="text-white flex-1 font-ibm-plex-sans-regular text-2xl">İşletme Güncelle</Text>
                <IconButton onPress={dismiss} icon="close" iconColor="white" />
            </View>
            <Divider style={{ borderWidth: 0.1, backgroundColor: "gray" }} />
            {!data ? (
                <View className="flex-1 pt-4">
                    {Array.from({ length: 1 }).map((_, i) => (
                        <CrudSkeletonComponent key={i} />
                    ))}
                </View>
            ) : (
                <>
                    <ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled contentContainerStyle={{ flexGrow: 1 }}>
                        <Text className="text-white text-xl mt-4 px-4">İşletme Resimleri (Maks 3)</Text>
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
                                            onLoad={() => setLoadedStoreImages(prev => new Set(prev).add(index))}
                                        />
                                        {!loadedStoreImages.has(index) && (
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
                        </View>
                        <Text className="text-white text-xl mt-6 px-4">İşletme Bilgileri</Text>
                        <View className="mt-2 px-4">
                            <Controller
                                control={control}
                                name="taxDocumentImage"
                                render={({ field: { value, onChange } }) => (
                                    <>
                                        <TouchableOpacity
                                            activeOpacity={0.85}
                                            disabled={isTaxDocumentLoading}
                                            onPress={async () => {
                                                setIsTaxDocumentLoading(true);
                                                try {
                                                    const file = await handlePickImage();
                                                    if (file) onChange(file);
                                                } finally {
                                                    setIsTaxDocumentLoading(false);
                                                }
                                            }}
                                        >
                                            <TextInput
                                                label="Vergi Levhası Resmi"
                                                mode="outlined"
                                                value={value?.name ? truncateFileName(value.name) : "Resim seçilmedi"}
                                                editable={false}
                                                dense
                                                pointerEvents="none"
                                                textColor="white"
                                                outlineColor={errors.taxDocumentImage ? "#b00020" : "#444"}
                                                right={
                                                    isTaxDocumentLoading ?
                                                        <ActivityIndicator size="small" color="#888" style={{ marginRight: 12 }} /> :
                                                        <TextInput.Icon icon="image" color="white" />
                                                }
                                                theme={{
                                                    roundness: 10, colors: { onSurfaceVariant: "gray", primary: "white" }
                                                }}
                                                style={{ backgroundColor: '#1F2937', borderWidth: 0 }}
                                            />
                                        </TouchableOpacity>
                                        {value?.uri && !isTaxDocumentLoading && (
                                            <View className="mt-2 mb-2 w-full">
                                                <Image
                                                    source={{ uri: value.uri }}
                                                    style={{ width: '100%', height: 200, borderRadius: 10 }}
                                                    resizeMode="cover"
                                                />
                                            </View>
                                        )}
                                        <HelperText type="error" visible={!!errors.taxDocumentImage}>
                                            {taxDocErrorText}
                                        </HelperText>
                                    </>
                                )}
                            />
                            <View className="flex-row gap-3">
                                <View className="flex-1">
                                    <Controller
                                        control={control}
                                        name="storeName"
                                        render={({ field: { onChange, onBlur, value } }) => (
                                            <>
                                                <TextInput
                                                    label="İşletme Adı"
                                                    mode="outlined"
                                                    dense
                                                    value={value}
                                                    onChangeText={onChange}
                                                    onBlur={onBlur}
                                                    textColor="white"
                                                    outlineColor={errors.storeName ? "#b00020" : "#444"}
                                                    theme={{
                                                        roundness: 10, colors: { onSurfaceVariant: "gray", primary: "white" }
                                                    }}
                                                    style={{ backgroundColor: '#1F2937', borderWidth: 0, marginTop: -6 }}
                                                />
                                                <HelperText type="error" visible={!!errors.storeName}>
                                                    {errors.storeName?.message}
                                                </HelperText>
                                            </>
                                        )}
                                    />
                                </View>
                                <View className="flex-1">
                                    <Controller
                                        control={control}
                                        name="type"
                                        render={({ field: { value, onChange } }) => {
                                            // Dropdown data'sını memoize et
                                            const dropdownData = parentCategories.map((cat: any) => ({ label: cat.name, value: cat.name }));
                                            // Value'nun data'da olup olmadığını kontrol et
                                            const isValueValid = value && dropdownData.some(item => item.value === value);

                                            return (
                                                <>
                                                    <Dropdown
                                                        data={dropdownData}
                                                        labelField="label"
                                                        valueField="value"
                                                        placeholder="Ana Kategori Seç"
                                                        value={isValueValid ? value : null}
                                                        onChange={(item: { label: string; value: string }) => { onChange(item.value); }}
                                                        style={{
                                                            height: 42,
                                                            borderRadius: 10,
                                                            paddingHorizontal: 12,
                                                            backgroundColor: "#1F2937",
                                                            borderWidth: 1,
                                                            borderColor: errors.type ? "#b00020" : "#444",
                                                            justifyContent: "center",
                                                            marginTop: 0,

                                                        }}
                                                        placeholderStyle={{ color: "gray" }}
                                                        selectedTextStyle={{ color: "white" }}
                                                        itemTextStyle={{ color: "white" }}
                                                        containerStyle={{ backgroundColor: '#1F2937', borderWidth: 0, borderRadius: 10, overflow: 'hidden', }}
                                                        activeColor="#3a3b3d"
                                                    />
                                                    <HelperText className='text-4xl' type="error" visible={!!errors.type}>
                                                        {errors.type?.message}
                                                    </HelperText>
                                                </>
                                            );
                                        }}
                                    />
                                </View>
                            </View>
                            {selectedType && categoryOptions.length > 0 ? (
                                <View className="mt-[-10x]">
                                    <Text className="text-white text-xl mb-2">Hizmetler ({selectedType})</Text>
                                    <Controller
                                        control={control}
                                        name="selectedCategories"
                                        render={({ field: { value, onChange } }) => {
                                            return (
                                                <>
                                                    <MultiSelect
                                                        key={`cats-${selectedType ?? "x"}-${categoryOptions.length}`}
                                                        data={categoryOptionsWithSelected}
                                                        labelField="label"
                                                        valueField="value"
                                                        value={(value ?? []).filter(v => categoryOptionsWithSelected.some(o => o.value === v))}
                                                        onChange={(vals: string[]) => onChange(vals)}
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
                                            )
                                        }}
                                    />
                                </View>
                            ) : null}
                            {selectedCategories.length > 0 && (
                                <View className="mt-0 mx-0  rounded-xl" style={{ backgroundColor: '#1F2937', paddingVertical: 6, paddingHorizontal: 16 }}>
                                    {selectedCategories.map((categoryId) => {
                                        const label = categoryOptionsWithSelected.find(i => i.value === categoryId)?.label ?? categoryId;
                                        return (
                                            <View key={categoryId}>
                                                <View className="flex-row items-center gap-2 mb-0">
                                                    <Text className="text-white w-[35%]" >{label} :</Text>
                                                    <View className='w-[65%]'>
                                                        <Controller
                                                            control={control}
                                                            name={`prices.${categoryId}` as const}
                                                            render={({ field: { value, onChange, onBlur }, fieldState: { error } }) => (
                                                                <TextInput
                                                                    mode="outlined"
                                                                    dense
                                                                    keyboardType="numeric"
                                                                    label="Fiyat (₺)"
                                                                    value={value ?? ''}
                                                                    onChangeText={(t) => {
                                                                        const raw = t.replace(/[^\d.,]/g, '');
                                                                        onChange(raw);
                                                                    }}
                                                                    onBlur={() => {
                                                                        const toTR = (s: string) => {
                                                                            const n = Number(s.replace(/\./g, '').replace(',', '.'));
                                                                            if (Number.isNaN(n)) return s;
                                                                            return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n);
                                                                        };
                                                                        onChange(toTR(value ?? ''));
                                                                    }}
                                                                    textColor="white"
                                                                    outlineColor={error ? '#b00020' : '#444'}
                                                                    style={{ backgroundColor: '#1F2937', borderWidth: 0, marginTop: 20, height: 35 }}
                                                                    theme={{ roundness: 10, colors: { onSurfaceVariant: "gray", primary: "white" } }}
                                                                />
                                                            )}
                                                        />
                                                        <HelperText type="error" visible={!!errors.prices?.[categoryId]}>
                                                            {errors.prices?.[categoryId]?.message as string}
                                                        </HelperText>
                                                    </View>
                                                </View>
                                            </View>
                                        );
                                    })}
                                </View>
                            )}
                            <View className="mt-2 mx-0 flex-row items-center">
                                <Text className="text-white text-xl flex-1">Çalışan Berber Sayısı : {barberFields.length}  </Text>
                                <Button mode="text" textColor="#c2a523" onPress={openCreateBarberModal}>Berber Ekle</Button>
                            </View>
                            {barberFields.length > 0 && (
                                <View className="bg-[#1F2937] rounded-xl px-3 pt-4 ">
                                    <View style={{ height: 64 * barberFields.length }}>
                                        <LegendList
                                            data={barberFields}
                                            keyExtractor={(item) => item._key}
                                            estimatedItemSize={64}
                                            renderItem={({ item }) => {
                                                const index = barberFields.findIndex(f => f._key === item._key);
                                                return (
                                                    <View className="flex-row items-center mb-3 gap-3">
                                                        {barbers[index]?.avatar?.uri
                                                            ? <Avatar.Image size={40} source={{ uri: barbers[index]?.avatar?.uri }} />
                                                            : <Avatar.Icon size={40} icon="account-circle" />}

                                                        <Controller
                                                            control={control}
                                                            name={`barbers.${index}.name` as const}
                                                            render={({ field: { value, onChange, onBlur } }) => (
                                                                <TextInput
                                                                    label="Berber adı"
                                                                    mode="outlined"
                                                                    dense
                                                                    value={value}
                                                                    readOnly
                                                                    textColor="white"
                                                                    outlineColor="#444"
                                                                    theme={{ roundness: 10, colors: { onSurfaceVariant: "gray", primary: "white" } }}
                                                                    style={{ backgroundColor: "#1F2937", borderWidth: 0, flex: 1 }}
                                                                />
                                                            )}
                                                        />
                                                        <TouchableOpacity onPress={() => openEditBarberModal(index)}>
                                                            <Icon size={22} source="update" color="#c2a523" />
                                                        </TouchableOpacity>
                                                        <TouchableOpacity onPress={() => handleDeleteBarber(index)}>
                                                            <Icon size={22} source="delete" color="#ef4444" />
                                                        </TouchableOpacity>
                                                    </View>
                                                )
                                            }}
                                        />
                                    </View>
                                    <HelperText type="error" visible={!!barberErrorText}>
                                        {barberErrorText}
                                    </HelperText>
                                </View>
                            )}
                            <View className="mt-4 mx-0 flex-row items-center">
                                <Text className="text-white text-xl flex-1">Koltuk Sayısı : {chairFields.length}</Text>
                                <Button mode="text" textColor="#c2a523" onPress={openCreateChairModal}>Koltuk Ekle</Button>
                            </View>
                            {chairFields.length > 0 && (
                                <View className="bg-[#1F2937] rounded-xl px-3 pt-4">
                                    <View style={{ height: 64 * chairFields.length }}>
                                        <LegendList
                                            data={chairFields}
                                            keyExtractor={(item) => item._key}
                                            estimatedItemSize={64}
                                            renderItem={({ item }) => {
                                                const index = chairFields.findIndex(f => f._key === item._key);
                                                if (index === -1) return null;
                                                const chair = chairs[index];
                                                if (!chair) return null;
                                                const isBarberChair = !!chair.barberId;
                                                const modeLabel = isBarberChair ? "Berber koltuğu" : "İsimli koltuk";
                                                const barberName = isBarberChair
                                                    ? (barbers.find(b => b.id === chair.barberId)?.name ?? "Atanmamış")
                                                    : "-";
                                                return (
                                                    <View className="flex-row items-center gap-3 mt-2  mb-3">
                                                        <Icon size={24} source={'chair-rolling'} color='#c2a523'></Icon>
                                                        <View className='flex-1 bg-[#1F2937] rounded-xl items-center py-3 mt-[-5px] justify-center border-[#444] border'>
                                                            <Text className='text-gray-500 text-xs mb-1'>{modeLabel}</Text>
                                                        </View>
                                                        <View className='flex-1 items-center bg-[#1F2937] rounded-xl  py-3 mt-[-5px] justify-center border-[#444] border'>
                                                            {!isBarberChair ? (
                                                                <Text className='text-white text-xs mb-1'>{chair.name}</Text>
                                                            ) : (
                                                                <Text className='text-white text-xs mb-1'>{barberName}</Text>
                                                            )}
                                                        </View>
                                                        <TouchableOpacity onPress={() => openEditChairModal(index)}>
                                                            <Icon size={22} source="update" color="#c2a523" />
                                                        </TouchableOpacity>
                                                        <TouchableOpacity onPress={() => handleChair(index)}>
                                                            <Icon size={22} source="delete" color="#ef4444" />
                                                        </TouchableOpacity>
                                                    </View>
                                                );
                                            }}
                                        />
                                    </View>
                                    <HelperText type="error" visible={!!chairsErrorText}>
                                        {chairsErrorText}
                                    </HelperText>
                                </View>
                            )}

                            <Text className="text-white font-ibm-plex-sans-regular ml-0 pt-4 mt-4 pb-2 text-xl">Koltuk Fiyatları Belirle</Text>
                            <View className="mt-2 mx-0 bg-[#1F2937] rounded-xl px-3 py-3">
                                <Controller
                                    control={control}
                                    name="pricingType.mode"
                                    render={({ field: { value, onChange } }) => (
                                        <View className="flex-row justify-center gap-16 ">
                                            {PRICING_OPTIONS.map((opt) => (
                                                <TouchableOpacity
                                                    key={opt.value}
                                                    onPress={() => onChange(opt.value)}
                                                    className="flex-row items-center gap-2"
                                                    activeOpacity={0.85}
                                                >
                                                    <View
                                                        className={`w-4 h-4 rounded-full border ${value === opt.value ? "bg-green-500 border-green-500" : "border-gray-400"
                                                            }`}
                                                    />
                                                    <Text className="text-white">{opt.label}</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    )}
                                />
                                {pricingMode === "rent" && (
                                    <Controller
                                        control={control}
                                        name="pricingType.rent"
                                        render={({ field: { value, onChange, onBlur } }) => (
                                            <>
                                                <TextInput
                                                    dense
                                                    value={value?.toString() ?? ""}
                                                    onChangeText={(t) => {
                                                        const raw = t.replace(/[^\d.,]/g, '');
                                                        onChange(raw);
                                                    }}
                                                    onBlur={() => {
                                                        const toTR = (s: string) => {
                                                            const n = Number(s.replace(/\./g, '').replace(',', '.'));
                                                            if (Number.isNaN(n)) return s;
                                                            return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n);
                                                        };
                                                        onChange(toTR(value ?? ''));
                                                    }}
                                                    mode="outlined"
                                                    label="Kiralama Fiyatı - 1 Saatlik"
                                                    textColor="white"
                                                    outlineColor={errors.pricingType?.rent ? "#b00020" : "#444"}
                                                    theme={{ roundness: 10, colors: { onSurfaceVariant: "gray", primary: "white" } }}
                                                    style={{ backgroundColor: '#1F2937', borderWidth: 0, marginTop: 8, }}
                                                    keyboardType="numeric"
                                                />
                                                <HelperText type="error" visible={!!errors.pricingType?.rent}>
                                                    {errors.pricingType?.rent?.message as string}
                                                </HelperText>
                                            </>
                                        )}
                                    />
                                )}
                                {pricingMode === "percent" && (
                                    <Controller
                                        control={control}
                                        name="pricingType.percent"
                                        render={({ field: { value, onChange } }) => (
                                            <>
                                                <Dropdown
                                                    dropdownPosition="top"
                                                    data={[
                                                        { label: "10%", value: "10" },
                                                        { label: "20%", value: "20" },
                                                        { label: "30%", value: "30" },
                                                        { label: "40%", value: "40" },
                                                        { label: "50%", value: "50" },
                                                        { label: "60%", value: "60" },
                                                        { label: "70%", value: "70" },
                                                        { label: "80%", value: "80" },
                                                        { label: "90%", value: "90" },
                                                    ]}
                                                    labelField="label"
                                                    valueField="value"
                                                    value={value ? String(value) : undefined}
                                                    placeholder="Yüzde Seçin"
                                                    onChange={(item: { label: string; value: string }) => onChange(item.value)}
                                                    style={{
                                                        paddingHorizontal: 12,
                                                        paddingVertical: 8,
                                                        borderRadius: 10,
                                                        backgroundColor: "#1F2937",
                                                        borderWidth: 1,
                                                        borderColor: errors.pricingType?.percent ? "#b00020" : "#444",
                                                        marginTop: 12,
                                                        height: 42,
                                                    }}
                                                    placeholderStyle={{ color: "gray" }}
                                                    selectedTextStyle={{ color: "white" }}
                                                    itemTextStyle={{ color: "white" }}
                                                    containerStyle={{
                                                        backgroundColor: "#1F2937",
                                                        borderWidth: 1,
                                                        borderColor: "#444",
                                                        borderRadius: 10,
                                                        overflow: "hidden",
                                                    }}
                                                    activeColor="#0f766e"
                                                />
                                                <HelperText type="error" visible={!!errors.pricingType?.percent}>
                                                    {errors.pricingType?.percent?.message as string}
                                                </HelperText>
                                            </>
                                        )}
                                    />
                                )}
                            </View>
                            <Text className="text-white font-ibm-plex-sans-regular ml-0 pt-4 pb-2 text-xl">Çalışma Zamanını Belirle</Text>
                            <View className='mt-2 mx-0 bg-[#1F2937] rounded-xl px-2 py-3'>
                                <Text className="text-[#c2a523] font-ibm-plex-sans-regular ml-0 pt-0 pb-2 text-sm">- Seçtiğiniz zaman dilimleri müşteri tarafında 1 saat aralıklarla gözükecek 8:00-9:00 , 10:00-11:00 gibi</Text>
                                <View className="mt-2 px-0">
                                    <View className="flex-row  gap-2">
                                        {DAYS_TR.map((d) => {
                                            const isHoliday = (holidayDays ?? []).includes(d.day);
                                            const isActive = activeDay === d.day;
                                            return (
                                                <TouchableOpacity
                                                    key={d.day}
                                                    disabled={isHoliday}
                                                    onPress={() => setActiveDay(d.day)}
                                                    className={`px-3 py-2 rounded-full border ${isHoliday
                                                        ? "opacity-40 border-gray-600"
                                                        : isActive
                                                            ? "bg-emerald-500"
                                                            : "border-gray-500"
                                                        }`}
                                                    activeOpacity={0.8}
                                                >
                                                    <Text className="text-white text-xs">{d.label}</Text>
                                                </TouchableOpacity>

                                            );
                                        })}
                                    </View>
                                    {(() => {
                                        const idx = (working ?? []).findIndex((w) => w.dayOfWeek === activeDay);
                                        if (idx < 0) return null;
                                        const dayRow = working[idx];
                                        const isDisabled = dayRow?.isClosed || (holidayDays ?? []).includes(activeDay);
                                        const dayErr = errors.workingHours?.[idx];
                                        return (
                                            <View className="mt-0 bg-[#1F2937] rounded-xl p-0">
                                                <View className="flex-row items-center mt-6">
                                                    <Text className="text-white text-sm">Başlangıç saati:</Text>
                                                    <DateTimePicker
                                                        value={activeStart}
                                                        mode="time"
                                                        is24Hour
                                                        locale="tr-TR"
                                                        disabled={isDisabled}
                                                        onChange={(_, d) => {
                                                            if (!d || isDisabled) return;
                                                            setActiveStart(d);
                                                            setValue(`workingHours.${idx}.startTime`, fmtHHmm(d), {
                                                                shouldDirty: true, shouldValidate: true,
                                                            });
                                                            trigger([`workingHours.${idx}.startTime`, `workingHours.${idx}.endTime`]);
                                                        }}
                                                    />
                                                    <Text className="text-white text-sm ml-5">Bitiş saati:</Text>
                                                    <DateTimePicker
                                                        value={activeEnd}
                                                        mode="time"
                                                        is24Hour
                                                        locale="tr-TR"
                                                        disabled={isDisabled}
                                                        onChange={(_, d) => {
                                                            if (!d || isDisabled) return;
                                                            setActiveEnd(d);
                                                            setValue(`workingHours.${idx}.endTime`, fmtHHmm(d), {
                                                                shouldDirty: true, shouldValidate: true,
                                                            });
                                                            trigger([`workingHours.${idx}.startTime`, `workingHours.${idx}.endTime`]);
                                                        }}
                                                    />
                                                </View>
                                                <HelperText type="error" visible={!!(dayErr?.startTime || dayErr?.endTime)}>
                                                    {((dayErr?.startTime?.message as string) || (dayErr?.endTime?.message as string)) ?? ""}
                                                </HelperText>
                                            </View>
                                        );
                                    })()}
                                    <Text className="text-white text-xl mt-2">Tatil Günleri</Text>
                                    <Controller
                                        control={control}
                                        name="holidayDays"
                                        render={({ field: { value, onChange }, fieldState: { error } }) => (
                                            <>
                                                <MultiSelect
                                                    data={HOLIDAY_OPTIONS}
                                                    labelField="label"
                                                    valueField="value"
                                                    value={(value ?? []).map(String)}
                                                    onChange={(vals: string[]) => {
                                                        const numeric = vals.map(v => Number(v));
                                                        onChange(numeric);
                                                        const current = getValues("workingHours") ?? [];
                                                        const updated = current.map(w => ({
                                                            ...w,
                                                            isClosed: numeric.includes(w.dayOfWeek),
                                                        }));
                                                        setValue("workingHours", updated, {
                                                            shouldDirty: true,
                                                            shouldValidate: true,
                                                        });
                                                    }}
                                                    placeholder="Tatil günlerini seç"
                                                    dropdownPosition="top"
                                                    inside
                                                    alwaysRenderSelectedItem
                                                    visibleSelectedItem
                                                    style={{
                                                        backgroundColor: "#1F2937",
                                                        borderColor: error ? "#b00020" : "#444",
                                                        borderWidth: 1,
                                                        borderRadius: 10,
                                                        paddingHorizontal: 12,
                                                        paddingVertical: 8,
                                                        marginTop: 8,
                                                    }}
                                                    containerStyle={{
                                                        backgroundColor: "#1F2937",
                                                        borderWidth: 1,
                                                        borderColor: "#444",
                                                        borderRadius: 10,
                                                        overflow: "hidden",
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
                                                    }}
                                                />
                                                <HelperText type="error" visible={!!error}>
                                                    {error?.message as string}
                                                </HelperText>
                                            </>
                                        )}
                                    />
                                </View>
                            </View>
                            <Text className="text-white font-ibm-plex-sans-regular ml-0 pt-4 pb-2 text-xl">Adres Belirle</Text>
                            <View className='mt-2 mx-0 bg-[#1F2937] rounded-xl px-2 py-3'>
                                <Text className="text-[#c2a523] font-ibm-plex-sans-regular ml-0 pt-0 pb-2 text-sm">- Eğer şuanda işletmede bulunuyorsanız aşağıdaki dükkanın konumunu ala tıklayınız ama değilseniz haritadan konumunuza tıklayınız.</Text>
                                <Button loading={locBusy}
                                    disabled={locBusy} mode='contained-tonal' icon={'store'} style={{ borderRadius: 12, marginVertical: 10 }} onPress={pickMyCurrentLocation} rippleColor='#059669' buttonColor='#10B981' textColor='white'>İşletmenin konumunu al</Button>
                                <MapPicker
                                    lat={c ? c.lat : undefined}
                                    lng={c ? c.lon : undefined}
                                    address={address}
                                    onChange={async (la, ln) => { updateLocation(la, ln); await reverseAndSetAddress(la, ln); }}
                                />
                                <HelperText type="error" visible={!!(errors.location?.latitude || errors.location?.longitude)}>
                                    {(errors.location?.latitude?.message as string) || (errors.location?.longitude?.message as string) || ""}
                                </HelperText>
                                <Controller
                                    control={control}
                                    name="location.addressDescription"
                                    render={({ field: { value, onChange, onBlur } }) => (
                                        <>
                                            <TextInput
                                                label="Adres açıklaması"
                                                mode="outlined"
                                                dense
                                                value={value}
                                                onChangeText={onChange}
                                                onBlur={onBlur}
                                                multiline
                                                readOnly
                                                textColor="white"
                                                outlineColor={errors.location?.addressDescription ? "#b00020" : "#444"}
                                                theme={{ roundness: 10, colors: { onSurfaceVariant: "gray", primary: "white" } }}
                                                style={{ backgroundColor: "#1F2937", borderWidth: 0, marginTop: 0 }}
                                                placeholder="Örn: X caddesi, Y sk. Z no, dükkan girişi apartman sağında..."
                                            />
                                            <HelperText type="error" visible={!!errors.location?.addressDescription}>
                                                {errors.location?.addressDescription?.message as string}
                                            </HelperText>
                                        </>
                                    )}
                                />
                            </View>
                        </View>
                    </ScrollView>
                    <View className="px-4 my-3">
                        <Button style={{ borderRadius: 10 }} disabled={updateLoading} loading={updateLoading} mode="contained" onPress={handleSubmit(OnSubmit)} buttonColor="#1F2937">Güncelle</Button>
                    </View>
                    <BarberEditModal
                        visible={barberModalVisible}
                        title={barberModalTitle}
                        initialValues={barberInitialValues}
                        onClose={closeBarberModal}
                        storeId={storeId}
                    />
                    <ChairEditModal
                        visible={chairModalVisible}
                        title={chairModalTitle}
                        initialValues={chairInitialValues}
                        barbers={chairAvailableBarbers}
                        onClose={closeChairModal}
                        storeId={storeId}
                    />
                    <SnackbarComponent />

                </>
            )}
        </View>
    );

}

export default FormStoreUpdate

