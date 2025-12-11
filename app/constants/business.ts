/**
 * Business-related constants
 */

export const BUSINESS_TYPES = [
    { label: "Kadın Kuaför", value: "FemaleHairdresser" },
    { label: "Erkek Kuaför", value: "MaleHairdresser" },
    { label: "Güzellik Salonu", value: "BeautySalon" },
] as const;

export const SERVICE_BY_TYPE: Record<string, { label: string; value: string }[]> = {
    MaleHairdresser: [
        { label: "Saç Tıraşı", value: "haircut" },
        { label: "Sakal Tıraşı", value: "beard" },
        { label: "Saç+Sakal", value: "combo" },
    ],
    FemaleHairdresser: [
        { label: "Fön", value: "blowdry" },
        { label: "Boya", value: "color" },
        { label: "Kesim", value: "cut" },
        { label: "Kasdasesim", value: "asdacut" },
        { label: "asdasdasdasd", value: "asdasdasdasdacut" },
    ],
    BeautySalon: [
        { label: "Manikür", value: "manicure" },
        { label: "Pedikür", value: "pedicure" },
        { label: "Cilt Bakımı", value: "skincare" },
    ],
};

