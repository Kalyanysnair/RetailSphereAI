export interface OrderPricingBreakdown {
  originalSubtotal: number;
  couponCode: string | null;
  discountType: string | null;
  discountAmount: number;
  shippingFee: number;
  grandTotal: number;
  descriptionText: string;
}

export function calculateOrderPricing(
  subtotal: number,
  coupon?: { code?: string; percent?: number; flatAmount?: number } | null,
  shippingFee: number = 0
): OrderPricingBreakdown {
  const originalSubtotal = Math.max(0, subtotal);
  let discountAmount = 0;
  let couponCode: string | null = null;
  let discountType: string | null = null;

  if (coupon && coupon.code) {
    couponCode = coupon.code.toUpperCase();
    if (coupon.flatAmount && coupon.flatAmount > 0) {
      discountAmount = Math.min(originalSubtotal, coupon.flatAmount);
      discountType = `₹${coupon.flatAmount} OFF`;
    } else if (coupon.percent && coupon.percent > 0) {
      discountAmount = (originalSubtotal * coupon.percent) / 100;
      discountType = `${coupon.percent}% OFF`;
    }
  }

  const netSubtotal = Math.max(0, originalSubtotal - discountAmount);
  const grandTotal = netSubtotal + shippingFee;

  const descriptionText = couponCode
    ? `Subtotal: ₹${originalSubtotal.toLocaleString('en-IN')} | Promo ${couponCode} (${discountType}: -₹${discountAmount.toLocaleString('en-IN')}) | Shipping: ${shippingFee === 0 ? 'FREE' : `₹${shippingFee}`} | Final Charged: ₹${grandTotal.toLocaleString('en-IN')}`
    : `Subtotal: ₹${originalSubtotal.toLocaleString('en-IN')} | Shipping: ${shippingFee === 0 ? 'FREE' : `₹${shippingFee}`} | Final Charged: ₹${grandTotal.toLocaleString('en-IN')}`;

  return {
    originalSubtotal,
    couponCode,
    discountType,
    discountAmount,
    shippingFee,
    grandTotal,
    descriptionText
  };
}
