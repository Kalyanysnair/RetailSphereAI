/**
 * Utility to format backend status strings into clean, user-friendly labels.
 * Maps technical keys like 'APPROVED_BY_RETAIL' to 'Under Examination'.
 */
export const formatStatusLabel = (status?: string | null): string => {
  if (!status) return 'Under Examination';
  const s = status.trim().toUpperCase();

  switch (s) {
    case 'APPROVED_BY_RETAIL':
    case 'APPROVED_BY_RETAIL_STAFF':
    case 'UNDER_ASSESSMENT':
    case 'IN_ASSESSMENT':
    case 'IN ASSESSMENT':
    case 'UNDER EXAMINATION':
    case 'ASSESSMENT_PENDING':
    case 'PENDING_EXAMINATION':
      return 'Under Examination';

    case 'QUOTED':
    case 'CUSTOMER_APPROVAL_PENDING':
    case 'QUOTE PROVIDED':
    case 'QUOTATION_READY':
      return 'Quotation Ready';

    case 'CUSTOMER_APPROVED':
    case 'APPROVED':
      return 'Quotation Approved';

    case 'PAID':
      return 'Paid ✓';

    case 'IN_PRODUCTION':
    case 'IN PRODUCTION':
      return 'In Production';

    case 'QC_PENDING':
    case 'QUALITY_CONTROL':
      return 'Quality Check';

    case 'COMPLETED':
      return 'Completed';

    case 'PENDING':
    case 'PENDING_APPROVAL':
      return 'Pending Verification';

    case 'REJECTED':
    case 'CUSTOMER_REJECTED':
      return 'Rejected';

    case 'CANCELLED':
      return 'Cancelled';

    case 'DISPATCHED':
      return 'Dispatched';

    case 'SHIPPED':
      return 'Shipped & In Transit';

    case 'OUT_FOR_DELIVERY':
    case 'OUT FOR DELIVERY':
      return 'Out for Delivery';

    case 'DELIVERED':
      return 'Delivered';

    default:
      // Format any other SNAKE_CASE into Title Case
      return status
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
  }
};

export const getStatusBadgeColor = (status?: string | null): string => {
  if (!status) return 'bg-amber-100 text-amber-800 border-amber-300';
  const s = status.trim().toUpperCase();

  if (
    s === 'APPROVED_BY_RETAIL' ||
    s === 'APPROVED_BY_RETAIL_STAFF' ||
    s === 'UNDER_ASSESSMENT' ||
    s === 'IN_ASSESSMENT' ||
    s === 'PENDING' ||
    s === 'PENDING_APPROVAL'
  ) {
    return 'bg-amber-100 text-amber-800 border-amber-300';
  }

  if (s === 'QUOTED' || s === 'CUSTOMER_APPROVAL_PENDING' || s === 'QUOTE PROVIDED' || s === 'QUOTATION_READY') {
    return 'bg-blue-100 text-blue-800 border-blue-300';
  }

  if (s === 'CUSTOMER_APPROVED' || s === 'APPROVED' || s === 'PAID' || s === 'COMPLETED' || s === 'DELIVERED') {
    return 'bg-emerald-100 text-emerald-800 border-emerald-300';
  }

  if (s === 'IN_PRODUCTION' || s === 'IN PRODUCTION') {
    return 'bg-purple-100 text-purple-800 border-purple-300';
  }

  if (s === 'REJECTED' || s === 'CUSTOMER_REJECTED' || s === 'CANCELLED') {
    return 'bg-rose-100 text-rose-800 border-rose-300';
  }

  return 'bg-amber-100 text-amber-800 border-amber-300';
};
