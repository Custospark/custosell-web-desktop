import { axiosInstance } from '../../../app/api/axiosConfig';
import { STOREFRONT } from '../../../shared/api/endpoints/endpoints';

function unwrapEntity<T>(payload: unknown): T {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as { data: T }).data;
  }
  return payload as T;
}

/** B2C buyer - sale receipt for a completed storefront order. */
export async function fetchMyStorefrontOrderSale(orderId: number) {
  const { data } = await axiosInstance.get(STOREFRONT.MY_ORDER_SALE(orderId));
  return unwrapEntity(data);
}

/** B2C buyer - invoice (+ payments) when the shop invoiced the sale. */
export async function fetchMyStorefrontOrderInvoice(orderId: number) {
  const { data } = await axiosInstance.get(STOREFRONT.MY_ORDER_INVOICE(orderId));
  return unwrapEntity(data);
}
