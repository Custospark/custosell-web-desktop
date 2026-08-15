import { useCallback, useMemo } from 'react';
import { useAppSelector } from '../../app/store/hooks/useApp';
import { useLogoutAction } from '../../app/contexts/useLogoutActions';
import { useActiveShift, useShiftExpenses, useShiftPayments, useShiftSales } from './ShiftQueries';
import { useClockOut } from './ShiftMutations';
import { cashAtHandover, cashCollected, netSales } from '../../shared/utils/accounting';
import { computeShiftCollections } from '../../shared/utils/shiftCollectionTotals';
import { grossSaleAmount, refundedAmount, toAmount } from '../sales/utils/saleAmounts';

export function useEndShiftAction() {
  const authUser = useAppSelector((s) => s.auth.user);
  const { data: shift } = useActiveShift();
  const clockOut = useClockOut();
  const { logout } = useLogoutAction();

  const shiftId = shift?.id || authUser?.shift_id || null;
  const hasActiveShift = !!(shift?.status === 'active') || !!authUser?.shift_id;
  const { data: shiftSales = [] } = useShiftSales(shiftId);
  const { data: shiftPayments = [] } = useShiftPayments(shiftId);
  const { data: shiftExpenses = [] } = useShiftExpenses(shiftId);

  const totals = useMemo(() => {
    const shiftGrossTotal = shiftSales.reduce((sum, sale) => sum + grossSaleAmount(sale), 0);
    const shiftRefundsTotal = shiftSales.reduce((sum, sale) => sum + refundedAmount(sale), 0);
    const shiftExpenseTotal = shiftExpenses.reduce((sum, expense) => sum + toAmount(expense.amount), 0);
    const netShiftTotal = netSales(shiftGrossTotal, shiftRefundsTotal, shiftExpenseTotal);
    const collections = computeShiftCollections(shiftPayments, shiftSales);
    const cashTotal = collections.cash;
    const mobileTotal = collections.mobile;
    const cardTotal = collections.card;
    const openingBalance = Number(shift?.opening_balance ?? 0);
    // Canonical: cash_collected = cash − expenses; cash_at_handover = opening + cash_collected.
    const cashCollectedTotal = cashCollected(cashTotal, shiftExpenseTotal);
    const handoverAmount = cashAtHandover(openingBalance, cashTotal, shiftExpenseTotal);
    const expectedCash = handoverAmount;

    return {
      netShiftTotal,
      cashTotal,
      mobileTotal,
      cardTotal,
      shiftExpenseTotal,
      cashCollected: cashCollectedTotal,
      handoverAmount,
      expectedCash,
      openingBalance,
      transactionCount: shiftSales.length,
    };
  }, [shiftSales, shiftPayments, shiftExpenses, shift?.opening_balance, shiftId]);

  const endShift = useCallback(
    async (countedCash?: number | null): Promise<boolean> => {
      if (!shiftId) return false;

      try {
        await clockOut.mutateAsync({
          id: shiftId,
          totals: {
            total_sales: totals.netShiftTotal,
            cash: totals.cashTotal,
            mobile_money: totals.mobileTotal,
            card: totals.cardTotal,
            counted_cash: countedCash ?? null,
          },
        });

        void logout();
        return true;
      } catch (error) {
        console.error('Failed to end shift:', error);
        return false;
      }
    },
    [clockOut, logout, shiftId, totals],
  );

  return {
    endShift,
    isEnding: clockOut.isPending,
    hasActiveShift,
    shiftId,
    totals,
  };
}
