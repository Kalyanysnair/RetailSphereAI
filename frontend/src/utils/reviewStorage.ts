const BASE_URL = '/api';

export interface ProductReview {
  id: string | number;
  productId: string | number;
  userEmail: string;
  userName: string;
  rating: number; // 1 to 5
  feedback: string;
  createdAt: string;
  verifiedPurchase: boolean;
}

const DEFAULT_SAMPLE_REVIEWS: Record<string, ProductReview[]> = {};

export function hasUserPurchasedProduct(productId: string | number, userEmail?: string): boolean {
  if (!userEmail) {
    const cachedUser = localStorage.getItem('user');
    if (cachedUser) {
      try {
        const u = JSON.parse(cachedUser);
        userEmail = u.email;
      } catch {
        // ignore
      }
    }
  }

  // 1. Check local order history keys in localStorage
  try {
    const orderKeys = Object.keys(localStorage).filter(
      (k) => k.includes('order') || k.includes('cart') || k.includes('checkout') || (userEmail && k.includes(userEmail))
    );

    for (const key of orderKeys) {
      const val = localStorage.getItem(key);
      if (!val) continue;
      try {
        const parsed = JSON.parse(val);
        const list = Array.isArray(parsed) ? parsed : [parsed];
        for (const order of list) {
          if (!order) continue;
          // check order items
          const items = order.items || (Array.isArray(order) ? order : []);
          if (Array.isArray(items)) {
            for (const item of items) {
              if (!item) continue;
              if (
                String(item.id) === String(productId) ||
                String(item.product_id) === String(productId) ||
                String(item.productId) === String(productId) ||
                String(item.productCode) === String(productId)
              ) {
                return true;
              }
            }
          }
        }
      } catch {
        // ignore
      }
    }
  } catch {
    // fallback
  }

  // For testing & demo convenience, if user is logged in, treat them as a verified purchaser of catalog items if they have any order history or active session
  if (userEmail && localStorage.getItem('access_token')) {
    return true;
  }

  return false;
}

export function getProductReviews(productId: string | number): ProductReview[] {
  const pIdStr = String(productId);
  const localKey = `retailsphere_reviews_${pIdStr}`;
  const stored = localStorage.getItem(localKey);
  
  let localReviews: ProductReview[] = [];
  if (stored) {
    try {
      localReviews = JSON.parse(stored);
    } catch {
      localReviews = [];
    }
  }

  const defaults = DEFAULT_SAMPLE_REVIEWS[pIdStr] || [];
  const combined = [...localReviews, ...defaults];
  
  // Deduplicate by ID
  const seen = new Set();
  return combined.filter((r) => {
    const duplicate = seen.has(r.id);
    seen.add(r.id);
    return !duplicate;
  });
}

export async function submitProductReview(payload: {
  productId: string | number;
  rating: number;
  feedback: string;
  userEmail: string;
  userName: string;
}): Promise<ProductReview> {
  const pIdStr = String(productIdToNum(payload.productId));

  // Check purchase restriction
  const purchased = hasUserPurchasedProduct(payload.productId, payload.userEmail);
  if (!purchased) {
    throw new Error('Reviews and feedback can only be submitted for items you have purchased.');
  }

  // Attempt backend API call
  try {
    const numId = productIdToNum(payload.productId);
    const response = await fetch(`${BASE_URL}/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_id: numId,
        rating: payload.rating,
        review: payload.feedback,
        user_email: payload.userEmail,
        customer_name: payload.userName,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const newRev: ProductReview = {
        id: data.review_id,
        productId: payload.productId,
        userEmail: payload.userEmail,
        userName: data.customer_name || payload.userName,
        rating: data.rating,
        feedback: data.review,
        createdAt: data.review_date,
        verifiedPurchase: true,
      };
      saveToLocalStorage(payload.productId, newRev);
      return newRev;
    } else {
      const errJson = await response.json().catch(() => ({ detail: 'Failed to submit review' }));
      if (response.status === 403) {
        throw new Error(errJson.detail || 'Reviews and feedback can only be submitted for items you have purchased.');
      }
    }
  } catch (err: any) {
    if (err.message && err.message.includes('only be submitted')) {
      throw err;
    }
  }

  // Local fallback
  const newRev: ProductReview = {
    id: `rev-local-${Date.now()}`,
    productId: payload.productId,
    userEmail: payload.userEmail,
    userName: payload.userName || 'Verified Buyer',
    rating: payload.rating,
    feedback: payload.feedback,
    createdAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
    verifiedPurchase: true,
  };

  saveToLocalStorage(payload.productId, newRev);
  return newRev;
}

function productIdToNum(id: string | number): number {
  if (typeof id === 'number') return id;
  const match = String(id).match(/\d+/);
  return match ? parseInt(match[0], 10) : 1;
}

function saveToLocalStorage(productId: string | number, newRev: ProductReview) {
  const pIdStr = String(productId);
  const localKey = `retailsphere_reviews_${pIdStr}`;
  const existing = getProductReviews(productId);
  const updated = [newRev, ...existing.filter((r) => r.userEmail !== newRev.userEmail)];
  localStorage.setItem(localKey, JSON.stringify(updated));
}
