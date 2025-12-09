import { BottomSheetModal } from "@gorhom/bottom-sheet";
import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import type { Control, UseFormSetValue, FieldPath } from "react-hook-form";
import { FormValues } from "./components/formstoreadd";

export type MyJwtPayload = {
  identifier: string;
  name: string;
  lastName: string;
  userType: string;
  exp: number;
  nbf: number;
  iss: string;
  aud: string;
}

export type JwtPayload = {
  identifier: string;
  name: string;
  lastName: string;
  userType: string;
};
export enum OtpPurpose {
  Register = 0,
  Login = 1,
  Reset = 2,
}
export enum ImageOwnerType {
  User = 1,
  Store = 2,
  ManuelBarber = 3,
  FreeBarber = 4
}
export enum UserType {
  Customer = 0,
  FreeBarber = 1,
  BarberStore = 2
}
export enum PricingType {
  Percent = 0,
  Rent = 1,
}


export type SearchBarProps = {
  searchQuery: string;
  setSearchQuery: (text: string) => void;
};
export type FormatListButtonProps = {
  isList: boolean;
  setIsList: (control: boolean) => void;
}

export type OnPressProps = {
  onPress?: () => void;
}
export type Options = {
  snapPoints?: (string | number)[];
  pressBehavior?: 'none' | 'close' | 'collapse';
  appearsOnIndex?: number;
  disappearsOnIndex?: number;
  preventDoubleOpen?: boolean;
  debounceOpenMs?: number;
};

export type ChairRowProps = {
  index: number;
  control: Control<FormValues>;
  setValue: UseFormSetValue<FormValues>;   // <-- doğru tip
  remove: () => void;
  barbers?: FormValues['barbers'];
  takenSet: Set<string>;
};

export type FileObject = { uri: string; name: string; type: string };

export type SheetKey = string; // örn: 'add', 'filter', 'storeEdit' ...
export type RefMap = Record<SheetKey, BottomSheetModal | null | undefined>;

export type Ctx = {
  setRef: (key: SheetKey, inst: BottomSheetModal | null) => void;
  present: (key: SheetKey) => void;
  dismiss: (key: SheetKey) => void;
  makeBackdrop: (opts?: {
    appearsOnIndex?: number;
    disappearsOnIndex?: number;
    pressBehavior?: 'close' | 'collapse' | 'none';
  }) => (p: BottomSheetBackdropProps) => React.ReactElement;
};

export type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

export type AccessTokenDto = {
  token: string;
  expiration: string;
  refreshToken: string;
  refreshTokenExpires: string;
};
export type BarberChairCreateDto = {
  barberId?: string;
  id?: string;
  name?: string;
  storeId?: string;
};
export type BarberChairUpdateDto = {
  barberId?: string;
  id: string;
  name?: string;
};
export type ServiceOfferingCreateDto = {
  price: number;
  serviceName: string;
};
export type ServiceOfferingUpdateDto = {
  id?: string;
  price: number;
  serviceName: string;
  ownerId?: string;
};
export type ManuelBarberCreateDto = {
  id?: string;
  fullName: string;
  profileImageUrl?: string;
  storeId?: string;
};
export type ManuelBarberUpdateDto = {
  id?: string;
  fullName: string;
  profileImageUrl?: string;
};
export type WorkingHourCreateDto = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isClosed: boolean;
};
export type WorkingHourUpdateDto = {
  id?: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isClosed: boolean;
  ownerId?: string;
};
export type BarberStoreCreateDto = {
  storeName: string;
  storeImageList?: CreateImageDto[];
  type: number;
  pricingType: number;
  addressDescription: string;
  latitude: number;
  longitude: number;
  pricingValue: number;
  taxDocumentFilePath: string;
  chairs: BarberChairCreateDto[];
  offerings: ServiceOfferingCreateDto[];
  manuelBarbers: ManuelBarberCreateDto[];
  workingHours: WorkingHourCreateDto[];
};
export type FreeBarberCreateDto = {
  firstName: string;
  lastName: string;
  type: BarberType;
  imageList?: CreateImageDto[];
  latitude: number;
  longitude: number;
  isAvailable: boolean;
  barberCertificate: string;
  offerings: ServiceOfferingCreateDto[];
};
export type FreeBarberUpdateDto = {
  id: string;
  firstName: string;
  lastName: string;
  type: BarberType;
  imageList?: CreateImageDto[];
  latitude: number;
  longitude: number;
  isAvailable: boolean;
  barberCertificate: string;
  offerings: ServiceOfferingCreateDto[];
};
export type BarberStoreUpdateDto = {
  id: string;
  storeName: string;
  storeImageList?: UpdateImageDto[];
  type: number;
  pricingType: number;
  addressDescription: string;
  latitude: number;
  longitude: number;
  pricingValue: number;
  taxDocumentFilePath: string;
  chairs: BarberChairUpdateDto[];
  offerings: ServiceOfferingUpdateDto[];
  manuelBarbers: ManuelBarberUpdateDto[];
  workingHours: WorkingHourUpdateDto[];
};


export type CreateImageDto = {
  imageUrl: string;
  ownerType: ImageOwnerType;
  imageOwnerId?: string;
}
export type UpdateImageDto = {
  id: string;
  imageUrl: string;
  imageOwnerId: string;
  ownerType?: number;
}


export enum BarberType {
  MaleHairdresser = 0,
  FemaleHairdresser = 1,
  BeautySalon = 2,
}
export interface ServiceOfferingGetDto {
  id: string;
  price: number;
  serviceName: string;
}

export interface ImageGetDto {
  id: string;
  imageUrl: string;
}
export type BarberFormValues = {
  id?: string;
  name?: string;
  profileImageUrl?: string;
};

export type ChairFormInitial = {
  id?: string;
  name?: string;
  barberId?: string;
  mode?: 'named' | 'barber';
};

export type BarberStoreGetDto = {
  id: string;
  storeName: string;
  pricingType: string;
  pricingValue: number;
  type: BarberType;
  rating: number;
  distanceKm: number;
  favoriteCount: number;
  latitude: number;
  longitude: number;
  addressDescription: string;
  isOpenNow: boolean;
  reviewCount: number;
  serviceOfferings: ServiceOfferingGetDto[];
  imageList: ImageGetDto[];
}
export type BarberStoreMineDto = {
  id: string;
  storeName: string;
  type: BarberType;
  rating: number;
  favoriteCount: number;
  reviewCount: number;
  isOpenNow: boolean;
  addressDescription?: string;
  latitude?: number;
  longitude?: number;
  serviceOfferings: ServiceOfferingGetDto[];
  imageList: ImageGetDto[];
  pricingType?: string;
  pricingValue?: number;
}
export type BarberStoreDetail = {
  id: string;
  storeName: string;
  imageList: ImageGetDto[];
  type: string;
  pricingType: string;
  pricingValue: number;
  latitude: number;
  longitude: number;
  isOpenNow: boolean;
  addressDescription: string;
  barberStoreChairs: BarberChairDto[];
  manuelBarbers: ManuelBarberDto[];
  serviceOfferings: ServiceOfferingGetDto[];
  workingHours: WorkingHourGetDto[];
  taxDocumentFilePath: string;
}
export type ManuelBarberDto = {
  id: string;
  fullName: string;
  profileImageUrl: string;
  rating: number;
}

export type WorkingHourGetDto = {
  dayOfWeek: number;
  endTime: string;
  id: string;
  isClosed: boolean,
  ownerId: string,
  startTime: string,
}
export type BarberChairDto = {
  id: string;
  name?: string;
  manualBarberId?: string
}

export type FreeBarGetDto = {
  id: string;
  fullName: string;
  rating: number;
  favoriteCount: number;
  isAvailable: boolean;
  distanceKm: number;
  type: BarberType;
  reviewCount: number;
  latitude: number;
  longitude: number;
  offerings: ServiceOfferingGetDto[];
  imageList: ImageGetDto[];
}

export type FreeBarberPanelDto = {
  id: string;
  fullName: string;
  rating: number;
  favoriteCount: number;
  isAvailable: boolean;
  type: BarberType;
  reviewCount: number;
  latitude: number;
  longitude: number;
  offerings: ServiceOfferingGetDto[];
  imageList: ImageGetDto[];
}
export type UpdateLocationDto = {
  id: string;
  latitude: number;
  longitude: number;
};
export type FreeBarberMinePanelDetailDto = {
  id: string;
  firstName: string;
  lastName: string;
  type: BarberType;
  isAvailable: boolean;
  offerings: ServiceOfferingGetDto[];
  imageList: ImageGetDto[];
  latitude?: number;
  longitude?: number;
}


export interface VerifyOtpRequest {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  certificateFilePath: string;
  code: string;
  device: string | null;
  userType: number;
  mode: string;
  password?: string;
}

export type NearbyRequest = {
  lat: number;
  lon: number;
  radiusKm?: number;
};


export type EmptyStateProps = {
  loading: boolean;
  locationStatus: LocationStatus;
  hasLocation: boolean;
  fetchedOnce: boolean;
  hasData: boolean;
  noResultText: string;
  needLocationText?: string;
  deniedText?: string;
  onRetry?: () => void;
};

export type SlotDto = {
  slotId: string;
  start: string;
  end: string;
  isBooked: boolean;
  isPast: boolean;
};
export type ChairSlotDto = {
  chairId: string;
  chairName?: string;
  barberId?: string | null;
  barberName?: string | null;
  barberRating?: number | null;
  slots: SlotDto[];
};
export type BadgeCount = {
  unreadNotifications: number;
  unreadMessages: number;
}
export type NotificationDto = {
  id: string;
  type: NotificationType;
  appointmentId?: string | null;
  title: string;
  body?: string | null;
  payloadJson: string;
  createdAt: string;
  isRead: boolean;
}
export enum NotificationType {
  AppointmentCreated = 1,
  AppointmentApproved = 2,
  AppointmentRejected = 3,
  AppointmentCancelled = 4,
  AppointmentCompleted = 5,
  AppointmentUnanswered = 6,
  AppointmentDecisionUpdated = 7,
}

export interface NotificationPayload {
  appointmentId: string;
  eventKey: string;
  recipientRole: string;
  date: string;
  startTime: string;
  endTime: string;
  actorUserId?: string;

  store?: {
    storeId: string;
    StoreOwnerUserId: string;
    storeName: string;
    imageUrl?: string;
  };
  customer?: {
    userId: string;
    displayName?: string;
    avatarUrl?: string;
    roleHint: string;
  };
  freeBarber?: {
    userId: string;
    displayName: string;
    avatarUrl?: string;
    roleHint: string;
  };
  chair?: {
    chairId: string;
    chairName: string;
    manuelBarberId?: string;
    manuelBarberName?: string;
  };
}

// types/location.ts
export type Pos = { lat: number; lon: number };

export type LocationStatus = "unknown" | "granted" | "denied";

export type LocationGateReason = "permission" | "services" | "unknown";

export type LocationGateResult =
  | { ok: true }
  | { ok: false; reason: LocationGateReason; message?: string };

export type LocationResult =
  | { ok: true; lat: number; lon: number }
  | { ok: false; message: string; reason?: LocationGateReason };

export type LocationStatusHelper = "idle" | "loading" | "ok" | "error";

export type HasLocation = {
  location: {
    latitude: number;
    longitude: number;
    addressDescription?: string;
  };
};

export type UseNearbyControlParams = {
  enabled: boolean;
  moveThresholdM?: number;
  staleMs?: number;
  hardRefreshMs?: number;
  onFetch: (lat: number, lon: number) => Promise<void>;
};


