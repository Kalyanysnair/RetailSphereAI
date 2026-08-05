export interface HeroSlide {
  id: string;
  title: string;
  subtitle: string;
  categoryTag: string;
  image: string;
  ctaText: string;
  ctaLink: string;
}

export interface CatalogItem {
  id: string;
  productCode?: string;
  name: string;
  category: string;       // e.g. 'Living Room', 'Dining Room', 'Bedroom', 'Lighting'
  subcategory: string;    // e.g. 'Sofas', 'Armchairs', 'Coffee Tables', 'Pendant Lights'
  price: number;
  rating: number;
  reviewCount: number;
  isCustomizable: boolean;
  image: string;
  isPopular?: boolean;
}

export interface CategoryTab {
  id: string;
  name: string;
  subcategories: string[];
}
