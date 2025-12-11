/**
 * Form-related types
 */

import type { Control, UseFormSetValue } from "react-hook-form";

// FormValues is exported from formstoreadd.tsx, we import it here for type usage
export type { FormValues } from "../components/store/formstoreadd";
export type { FormUpdateValues } from "../components/store/formstoreupdate";
export type { FormFreeBarberValues } from "../components/formfreebarberoper";

export type ChairRowProps = {
  index: number;
  control: Control<import("../components/formstoreadd").FormValues>;
  setValue: UseFormSetValue<import("../components/formstoreadd").FormValues>;
  remove: () => void;
  barbers?: import("../components/formstoreadd").FormValues['barbers'];
  takenSet: Set<string>;
};

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

