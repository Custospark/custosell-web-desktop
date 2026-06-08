import { useCallback, useMemo } from 'react';
import { useAppSelector } from '../../app/store/hooks/useApp';
import { useConfirm } from '../../shared/components/Feedback/ConfirmContext';
import { useLogoutAction } from '../../app/contexts/LogoutContext';
import { formatCurrency } from '../../shared/utils/formatCurrency';
import { getUserFirstName } from '../../shared/utils/userDisplayName';
import { cashHandover, netSales } from '../../shared/utils/accounting';
import { grossSaleAmount, netSaleAmount, refundedAmount, toAmount } from '../sales/utils/saleAmounts';
import { useActiveShift, useClockOut, useShiftExpenses, useShiftSales } from './ShiftQueries';

function buildEndShiftConfirmMessage(
  firstName: string,
  transactionCount: number,
  netShiftTotal: number,
  handoverAmount: number,
): string {
  return `${firstName}, end your shift with ${transactionCount} transaction(s), ${formatCurrency(netShiftTotal)} net sales, and ${formatCurrency(handoverAmount)} cash at handover?\n\nPlease print your shift report before ending your shift.`;
}

export function useEndShiftAction() {
  const authUser = useAppSelector((s) => s.auth.user);
  const { data: shift } = useActiveShift();
  const clockOut = useClockOut();
  const { confirm } = useConfirm();
  const { logout } = useLogoutAction();

  const shiftId = shift?.id || authUser?.shift_id || null;
  const hasActiveShift = !!(shift?.status === 'active') || !!authUser?.shift_id;
  const { data: shiftSales = [] } = useShiftSales(shiftId);
  const { data: shiftExpenses = [] } = useShiftExpenses(shiftId);

  const totals = useMemo(() => {
    const shiftGrossTotal = shiftSales.reduce((sum, sale) => sum + grossSaleAmount(sale), 0);
    const shiftRefundsTotal = shiftSales.reduce((sum, sale) => sum + refundedAmount(sale), 0);
    const shiftExpenseTotal = shiftExpenses.reduce((sum, expense) => sum + toAmount(expense.amount), 0);
    const netShiftTotal = netSales(shiftGrossTotal, shiftRefundsTotal, shiftExpenseTotal);
    const cashTotal = shiftSales
      .filter((s) => s.payment_method === 'cash')
      .reduce((sum, sale) => sum + netSaleAmount(sale), 0);
    const mobileTotal = shiftSales
      .filter((s) => s.payment_method === 'mobile_money')
      .reduce((sum, sale) => sum + netSaleAmount(sale), 0);
    const cardTotal = shiftSales
      .filter((s) => s.payment_method === 'card' || s.payment_method === 'other')
      .reduce((sum, sale) => sum + netSaleAmount(sale), 0);
    const handoverAmount = cashHandover(cashTotal, shiftExpenseTotal);

    return {
      netShiftTotal,
      cashTotal,
      mobileTotal,
      cardTotal,
      handoverAmount,
      transactionCount: shiftSales.length,
    };
  }, [shiftSales, shiftExpenses]);

  const requestEndShift = useCallback(async () => {
    if (!shiftId) return false;

    const firstName = getUserFirstName(authUser?.name);
    const confirmed = await confirm({
      title: 'End Shift',
      message: buildEndShiftConfirmMessage(
        firstName,
        totals.transactionCount,
        totals.netShiftTotal,
        totals.handoverAmount,
      ),
      confirmText: 'End Shift',
      cancelText: 'Cancel',
      variant: 'warning',
    });
    if (!confirmed) return false;

    try {
      await clockOut.mutateAsync({
        id: shiftId,
        totals: {
          total_sales: totals.netShiftTotal,
          cash: totals.cashTotal,
          mobile_money: totals.mobileTotal,
          card: totals.cardTotal,
        },
      });

      void logout();
      return true;
    } catch (error) {
      console.error('Failed to end shift:', error);
      return false;
    }
  }, [authUser?.name, clockOut, confirm, logout, shiftId, totals]);

  return {
    requestEndShift,
    isEnding: clockOut.isPending,
    hasActiveShift,
    shiftId,
  };
}
