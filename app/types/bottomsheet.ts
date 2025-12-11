/**
 * Bottom Sheet-related types
 */

import { BottomSheetModal } from "@gorhom/bottom-sheet";
import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';

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

export type Options = {
  snapPoints?: (string | number)[];
  pressBehavior?: 'none' | 'close' | 'collapse';
  appearsOnIndex?: number;
  disappearsOnIndex?: number;
  preventDoubleOpen?: boolean;
  debounceOpenMs?: number;
};

