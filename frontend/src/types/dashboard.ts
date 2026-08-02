export interface KpiMetric {
  id: string;
  title: string;
  value: string;
  change: string;
  isPositive: boolean;
  timeframe: string;
  iconName: 'rupee' | 'package' | 'shopping' | 'trending';
}

export interface FurnitureProduct {
  id: string;
  name: string;
  category: string;
  subcategory?: string;
  price: number;
  originalPrice?: number;
  stock: number;
  salesCount: number;
  status: 'In Stock' | 'Low Stock' | 'Out of Stock';
  imageUrl?: string;
  rating?: number;
  material?: string;
  isCustomizable?: boolean;
}

export interface RecommendationProduct extends FurnitureProduct {
  subcategory: string;
  rating: number;
  reviewCount: number;
  material: string;
  dimensions: string;
  isCustomizable: boolean;
  isTopPick?: boolean;
  badge?: string;
  additionalImages?: string[];
  detailedDescription?: string;
  warrantyInfo?: string;
}


export interface SubcategoryItem {
  id: string;
  name: string;
  count: number;
}

export interface CategoryItem {
  id: string;
  name: string;
  icon: string;
  count: number;
  subcategories: SubcategoryItem[];
}

export interface FurnitureOrder {
  id: string;
  customerName: string;
  customerEmail: string;
  productName: string;
  amount: number;
  status: 'Delivered' | 'In Transit' | 'Processing' | 'Cancelled';
  date: string;
}

export interface ChartDataPoint {
  month: string;
  revenue: number;
  orders: number;
}

export interface DashboardFilterState {
  categoryId: string;
  subcategoryId: string;
  material: string;
  maxPrice: number;
  searchQuery: string;
  sortBy: 'recommended' | 'price-low' | 'price-high' | 'rating';
}
