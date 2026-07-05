import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { AccountingPeriod } from '../api/AccountingTypes';
import { useAccountingPeriods } from '../api/AccountingQueries';
import {
  loadStoredPeriodFilter,
  parsePeriodFilter,
  periodFilterToReportParams,
  persistPeriodFilter,
  reportingYearBounds,
  selectionLabel,
  type ReportPeriodParams,
} from '../utils/periodSelectionUtils';

type AccountingPeriodSelectionContextValue = {
  periodFilter: string;
  setPeriodFilter: (value: string) => void;
  reportParams: ReportPeriodParams | undefined;
  periodIds: number[];
  selectionLabel: string;
  startYear: number;
  endYear: number;
  periods: AccountingPeriod[] | undefined;
};

const AccountingPeriodSelectionContext = createContext<AccountingPeriodSelectionContextValue | null>(null);

export function AccountingPeriodSelectionProvider({ children }: { children: ReactNode }) {
  const [periodFilter, setPeriodFilterState] = useState(loadStoredPeriodFilter);
  const { data: periods } = useAccountingPeriods();

  const setPeriodFilter = useCallback((value: string) => {
    setPeriodFilterState(value);
    persistPeriodFilter(value);
  }, []);

  const { startYear, endYear } = useMemo(() => reportingYearBounds(periods), [periods]);
  const reportParams = useMemo(
    () => periodFilterToReportParams(periodFilter, periods),
    [periodFilter, periods],
  );
  const periodIds = useMemo(() => parsePeriodFilter(periodFilter), [periodFilter]);
  const label = useMemo(() => selectionLabel(periodFilter, periods), [periodFilter, periods]);

  const value = useMemo(
    () => ({
      periodFilter,
      setPeriodFilter,
      reportParams,
      periodIds,
      selectionLabel: label,
      startYear,
      endYear,
      periods,
    }),
    [periodFilter, setPeriodFilter, reportParams, periodIds, label, startYear, endYear, periods],
  );

  return (
    <AccountingPeriodSelectionContext.Provider value={value}>
      {children}
    </AccountingPeriodSelectionContext.Provider>
  );
}

export function useAccountingPeriodSelection(): AccountingPeriodSelectionContextValue {
  const ctx = useContext(AccountingPeriodSelectionContext);
  if (!ctx) {
    throw new Error('useAccountingPeriodSelection must be used within AccountingPeriodSelectionProvider');
  }
  return ctx;
}
