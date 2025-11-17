export const userTypeItems = [
    { label: "Müşteri", value: "customer" },
    { label: "Serbest Berber", value: "freeBarber" },
    { label: "Berber İşletmesi", value: "barberStore" },
];

export const catData = ['Hepsi', 'Erkek', 'Kadın', 'Güzellik merkezi'];
export const ratings = ["Hepsi", 5, 4, 3, 2, 1];

export const BUSINESS_TYPES = [
    { label: "Kadın Kuaför", value: "FemaleHairdresser" },
    { label: "Erkek Kuaför", value: "MaleHairdresser" },
    { label: "Güzellik Salonu", value: "BeautySalon" },
];

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
export const trMoneyRegex = /^(?:\d{1,3}(?:\.\d{3})*|\d+)(?:,\d{1,2})?$/;

export const PRICING_OPTIONS = [
    { label: "Koltuk Kirala", value: "rent" },
    { label: "Yüzdelik", value: "percent" },
] as const;

export const DAYS_TR = [
    { label: "Pzt", full: "Pazartesi", day: 1 },
    { label: "Sal", full: "Salı", day: 2 },
    { label: "Çar", full: "Çarşamba", day: 3 },
    { label: "Per", full: "Perşembe", day: 4 },
    { label: "Cum", full: "Cuma", day: 5 },
    { label: "Cmt", full: "Cumartesi", day: 6 },
    { label: "Paz", full: "Pazar", day: 0 },
];
export const IST = { latitude: 41.015137, longitude: 28.97953 };





