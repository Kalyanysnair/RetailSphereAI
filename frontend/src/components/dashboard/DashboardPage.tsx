import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, X, Mic, MicOff, ArrowLeft } from 'lucide-react';
import { Header } from './Header';
import { CategoryFilterSection } from './CategoryFilterSection';
import { RecommendationSection } from './RecommendationSection';
import { CustomerContactSection } from './CustomerContactSection';
import { CustomizationModal } from './CustomizationModal';
import { CustomOrderTracker } from './CustomOrderTracker';
import { FabricationTab } from '../customer/FabricationTab';
import { ServicesTab } from '../customer/ServicesTab';
import { MyActivityTab } from '../customer/MyActivityTab';
import { CustomerAssistantTab } from '../customer/CustomerAssistantTab';
import { QuickActionsFab } from './QuickActionsFab';
import { DashboardFilterState, RecommendationProduct } from '../../types/dashboard';

import { getCartCount } from '../../utils/cartStorage';
import { getWishlistCount } from '../../utils/wishlistStorage';
import { fetchInventoryFromDB, getCurrentUser } from '../../services/api';
import { fetchRetailOrdersFromDB } from '../../utils/retailOrdersStorage';
import { fetchCustomOrders } from '../../services/api_production';

export const DEFAULT_CATALOG_PRODUCTS: RecommendationProduct[] = [
  {
    id: 'inv-1',
    productCode: 'SKU-RS-001',
    name: 'Emerald Green Velvet Lounge Sofa',
    category: 'living-room',
    subcategory: 'sofas',
    price: 49500,
    originalPrice: 56900,
    stock: 12,
    salesCount: 45,
    status: 'In Stock',
    imageUrl: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80',
    rating: 4.9,
    reviewCount: 38,
    material: 'Italian Velvet & Solid Wood',
    color: 'Emerald Green',
    dimensions: '220cm x 95cm x 85cm',
    isCustomizable: true,
    isTopPick: true,
    badge: 'SKU-RS-001',
  },
  {
    id: 'inv-2',
    productCode: 'SKU-RS-002',
    name: 'Nordic Minimalist Modular Sofa',
    category: 'living-room',
    subcategory: 'sofas',
    price: 54000,
    originalPrice: 62100,
    stock: 5,
    salesCount: 30,
    status: 'In Stock',
    imageUrl: 'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?auto=format&fit=crop&w=800&q=80',
    rating: 4.9,
    reviewCount: 24,
    material: 'Woven Linen & Oak Wood',
    color: 'Warm Beige',
    dimensions: '280cm x 160cm x 82cm',
    isCustomizable: true,
    isTopPick: true,
    badge: 'SKU-RS-002',
  },
  {
    id: 'inv-3',
    productCode: 'SKU-RS-003',
    name: 'Calacatta Italian Marble Coffee Table',
    category: 'living-room',
    subcategory: 'coffee-tables',
    price: 42500,
    originalPrice: 48875,
    stock: 18,
    salesCount: 60,
    status: 'In Stock',
    imageUrl: 'https://images.unsplash.com/photo-1533090161767-e6ffed986c88?auto=format&fit=crop&w=800&q=80',
    rating: 4.8,
    reviewCount: 42,
    material: 'Italian Marble & Brushed Brass',
    color: 'White Calacatta / Antique Brass',
    dimensions: '120cm x 70cm x 45cm',
    isCustomizable: true,
    isTopPick: true,
    badge: 'SKU-RS-003',
  },
  {
    id: 'inv-4',
    productCode: 'SKU-RS-004',
    name: 'Minimalist Teak Wood Side Table',
    category: 'living-room',
    subcategory: 'coffee-tables',
    price: 18500,
    originalPrice: 21275,
    stock: 15,
    salesCount: 50,
    status: 'In Stock',
    imageUrl: 'https://images.unsplash.com/photo-1538688525198-9b88f6f53126?auto=format&fit=crop&w=800&q=80',
    rating: 4.7,
    reviewCount: 19,
    material: 'Solid Teak Wood',
    color: 'Natural Smoked Oak',
    dimensions: '55cm x 55cm x 50cm',
    isCustomizable: true,
    isTopPick: true,
    badge: 'SKU-RS-004',
  },
  {
    id: 'inv-5',
    productCode: 'SKU-RS-005',
    name: 'Minimalist Teak Wood 6-Seater Dining Set',
    category: 'dining-room',
    subcategory: 'dining-tables',
    price: 58000,
    originalPrice: 66700,
    stock: 8,
    salesCount: 35,
    status: 'In Stock',
    imageUrl: 'https://images.unsplash.com/photo-1617806118233-18e1de247200?auto=format&fit=crop&w=800&q=80',
    rating: 4.9,
    reviewCount: 52,
    material: 'Solid Teak Wood',
    color: 'Warm Honey Teak',
    dimensions: '200cm x 90cm x 76cm',
    isCustomizable: true,
    isTopPick: true,
    badge: 'SKU-RS-005',
  },
  {
    id: 'inv-6',
    productCode: 'SKU-RS-006',
    name: 'Smoked Walnut Solid Wood Dining Table',
    category: 'dining-room',
    subcategory: 'dining-tables',
    price: 46000,
    originalPrice: 52900,
    stock: 4,
    salesCount: 22,
    status: 'Low Stock',
    imageUrl: 'https://images.unsplash.com/photo-1615066390971-03e4e1c36ddf?auto=format&fit=crop&w=800&q=80',
    rating: 4.8,
    reviewCount: 29,
    material: 'American Walnut & Brass',
    color: 'Smoked Dark Walnut',
    dimensions: '220cm x 100cm x 76cm',
    isCustomizable: true,
    isTopPick: true,
    badge: 'SKU-RS-006',
  },
  {
    id: 'inv-7',
    productCode: 'SKU-RS-007',
    name: 'Artisan Upholstered Oak Dining Chair (Set of 2)',
    category: 'dining-room',
    subcategory: 'dining-chairs',
    price: 34000,
    originalPrice: 39100,
    stock: 14,
    salesCount: 40,
    status: 'In Stock',
    imageUrl: 'https://images.unsplash.com/photo-1503602642458-232111445657?auto=format&fit=crop&w=800&q=80',
    rating: 4.9,
    reviewCount: 31,
    material: 'FSC Oak & Natural Linen',
    color: 'Natural Oak / Oatmeal',
    dimensions: '50cm x 55cm x 88cm',
    isCustomizable: true,
    isTopPick: true,
    badge: 'SKU-RS-007',
  },
  {
    id: 'inv-8',
    productCode: 'SKU-RS-008',
    name: 'Japanese Oak Minimalist Bed Frame',
    category: 'bedroom',
    subcategory: 'king-beds',
    price: 52000,
    originalPrice: 59800,
    stock: 6,
    salesCount: 28,
    status: 'In Stock',
    imageUrl: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=800&q=80',
    rating: 4.9,
    reviewCount: 48,
    material: 'FSC-Certified Solid Oak',
    color: 'Natural Japanese Oak',
    dimensions: '210cm x 195cm x 115cm',
    isCustomizable: true,
    isTopPick: true,
    badge: 'SKU-RS-008',
  },
  {
    id: 'inv-9',
    productCode: 'SKU-RS-009',
    name: 'Scandi Solid Teak Platform Bed',
    category: 'bedroom',
    subcategory: 'king-beds',
    price: 44000,
    originalPrice: 50600,
    stock: 10,
    salesCount: 33,
    status: 'In Stock',
    imageUrl: 'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=800&q=80',
    rating: 4.8,
    reviewCount: 36,
    material: 'Solid Teak Wood & Natural Rattan',
    color: 'Natural Blonde Teak',
    dimensions: '205cm x 185cm x 110cm',
    isCustomizable: true,
    isTopPick: true,
    badge: 'SKU-RS-009',
  },
  {
    id: 'inv-10',
    productCode: 'SKU-RS-010',
    name: 'Contemporary Walnut 3-Drawer Dresser',
    category: 'bedroom',
    subcategory: 'wardrobes',
    price: 48000,
    originalPrice: 55200,
    stock: 9,
    salesCount: 26,
    status: 'In Stock',
    imageUrl: 'https://images.unsplash.com/photo-1595428774223-ef52624120d2?auto=format&fit=crop&w=800&q=80',
    rating: 4.7,
    reviewCount: 21,
    material: 'Walnut Veneer & Brushed Brass',
    color: 'Smoked Walnut / Gold',
    dimensions: '110cm x 50cm x 85cm',
    isCustomizable: true,
    isTopPick: true,
    badge: 'SKU-RS-010',
  },
  {
    id: 'inv-11',
    productCode: 'SKU-RS-011',
    name: 'Executive Smoked Walnut Writing Desk',
    category: 'office',
    subcategory: 'desks',
    price: 56000,
    originalPrice: 64400,
    stock: 7,
    salesCount: 19,
    status: 'In Stock',
    imageUrl: 'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?auto=format&fit=crop&w=800&q=80',
    rating: 4.9,
    reviewCount: 27,
    material: 'Smoked Walnut & Black Steel',
    color: 'Dark Walnut / Matte Black',
    dimensions: '160cm x 75cm x 76cm',
    isCustomizable: true,
    isTopPick: true,
    badge: 'SKU-RS-011',
  },
  {
    id: 'inv-12',
    productCode: 'SKU-RS-012',
    name: 'Ergonomic Executive Genuine Leather Chair',
    category: 'office',
    subcategory: 'ergonomic',
    price: 36500,
    originalPrice: 41975,
    stock: 12,
    salesCount: 41,
    status: 'In Stock',
    imageUrl: 'https://images.unsplash.com/photo-1505797149-43b0069ec26b?auto=format&fit=crop&w=800&q=80',
    rating: 4.8,
    reviewCount: 33,
    material: 'Top-Grain Leather & Aluminium',
    color: 'Cognac Brown / Chrome',
    dimensions: '65cm x 65cm x 115cm',
    isCustomizable: true,
    isTopPick: true,
    badge: 'SKU-RS-012',
  },
  {
    id: 'inv-13',
    productCode: 'SKU-RS-013',
    name: 'Bespoke Curved Architectural Lounge Chair',
    category: 'living-room',
    subcategory: 'accent-chairs',
    price: 38000,
    originalPrice: 43700,
    stock: 3,
    salesCount: 15,
    status: 'Low Stock',
    imageUrl: 'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?auto=format&fit=crop&w=800&q=80',
    rating: 4.9,
    reviewCount: 17,
    material: 'Black Ash & Steel',
    color: 'Charcoal Black',
    dimensions: '90cm x 85cm x 80cm',
    isCustomizable: true,
    isTopPick: true,
    badge: 'SKU-RS-013',
  },
];

export const DashboardPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [cartItemsCount, setCartItemsCount] = useState(() => getCartCount());
  const [wishlistCount, setWishlistCount] = useState(() => getWishlistCount());
  const [selectedCustomProduct, setSelectedCustomProduct] = useState<RecommendationProduct | null>(null);
  const [customModalTrigger, setCustomModalTrigger] = useState(0);
  const [dbProducts, setDbProducts] = useState<RecommendationProduct[]>(DEFAULT_CATALOG_PRODUCTS);
  const [activityStats, setActivityStats] = useState({
    activeOrders: 0,
    customRequests: 0,
    quotations: 0,
    inProduction: 0
  });

  // Verify Active Authenticated Session
  useEffect(() => {
    const verifyCustomerSession = async () => {
      const token = localStorage.getItem('access_token');
      if (!token) {
        navigate('/login', { replace: true });
        return;
      }
      try {
        const user = await getCurrentUser();
        if (!user) {
          localStorage.removeItem('access_token');
          localStorage.removeItem('user');
          navigate('/login', { replace: true });
          return;
        }
        setCurrentUser(user);
      } catch (err) {
        console.warn('Session verification failed:', err);
        navigate('/login', { replace: true });
      }
    };

    verifyCustomerSession();
    window.addEventListener('user-logged-in', verifyCustomerSession);
    window.addEventListener('storage', verifyCustomerSession);
    return () => {
      window.removeEventListener('user-logged-in', verifyCustomerSession);
      window.removeEventListener('storage', verifyCustomerSession);
    };
  }, [navigate]);

  useEffect(() => {
    const loadCustomerActivityStats = async () => {
      try {
        const retailOrders = await fetchRetailOrdersFromDB();
        const storedUser = localStorage.getItem('user');
        const parsedUser = storedUser ? JSON.parse(storedUser) : null;
        const currentEmail = parsedUser?.email?.toLowerCase().trim();

        const userRetailOrders = retailOrders.filter((o) => {
          if (!currentEmail) return true;
          return !o.email || o.email.toLowerCase().trim() === currentEmail;
        });

        const activeRetail = userRetailOrders.filter(
          (o) => o.orderStatus !== 'Delivered' && o.orderStatus !== 'Cancelled'
        ).length;

        const customOrders = await fetchCustomOrders();
        const userCustomOrders = customOrders.filter((o: any) => {
          if (!currentEmail) return true;
          return !o.email || o.email.toLowerCase().trim() === currentEmail;
        });

        const activeCustom = userCustomOrders.length;

        const quotesPending = userCustomOrders.filter(
          (o: any) => o.order_status === 'Quote Provided' || o.order_status === 'Pending Approval' || o.order_status === 'ASSESSMENT_COMPLETE'
        ).length;

        const productionActive = userCustomOrders.filter(
          (o: any) => o.order_status === 'In Production' || o.order_status === 'Approved'
        ).length;

        setActivityStats({
          activeOrders: activeRetail,
          customRequests: activeCustom,
          quotations: quotesPending,
          inProduction: productionActive
        });
      } catch (e) {
        console.warn('Error fetching activity stats:', e);
      }
    };

    loadCustomerActivityStats();
    window.addEventListener('retail-orders-updated', loadCustomerActivityStats);
    window.addEventListener('custom-orders-updated', loadCustomerActivityStats);
    window.addEventListener('storage', loadCustomerActivityStats);
    return () => {
      window.removeEventListener('retail-orders-updated', loadCustomerActivityStats);
      window.removeEventListener('custom-orders-updated', loadCustomerActivityStats);
      window.removeEventListener('storage', loadCustomerActivityStats);
    };
  }, []);

  useEffect(() => {
    const loadDBProducts = async () => {
      try {
        const dbItems = await fetchInventoryFromDB();
        if (dbItems && dbItems.length > 0) {
          const mapped: RecommendationProduct[] = dbItems.map((p: any) => {
            const rawId = p.product_id || p.id;
            const code = p.productCode || p.sku || `SKU-RS-${typeof rawId === 'number' ? String(rawId).padStart(3, '0') : rawId}`;
            
            let catId = (p.category || '').toLowerCase().trim();
            if (catId.includes('living')) catId = 'living-room';
            else if (catId.includes('dining')) catId = 'dining-room';
            else if (catId.includes('bed')) catId = 'bedroom';
            else if (catId.includes('office') || catId.includes('desk') || catId.includes('studio')) catId = 'office';
            else if (catId.includes('custom')) catId = 'custom-studio';

            return {
              id: p.id || `inv-${p.product_id}`,
              productCode: code,
              name: p.name || p.product_name,
              category: catId,
              subcategory: (p.subcategory || 'General').toLowerCase().replace(/\s+/g, '-'),
              price: typeof p.price === 'number' ? p.price : parseFloat(p.price) || 0,
              originalPrice: (typeof p.price === 'number' ? p.price : parseFloat(p.price) || 0) * 1.15,
              stock: p.stockCount || 10,
              salesCount: 45,
              status: (p.status || 'In Stock') as any,
              imageUrl: p.image_url || p.image || 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80',
              rating: 4.9,
              reviewCount: 38,
              material: p.material || 'Solid Teak Wood',
              color: p.color || 'Natural Wood',
              dimensions: '200cm x 90cm x 75cm',
              isCustomizable: true,
              isTopPick: p.stockCount > 0,
              badge: code
            };
          });
          setDbProducts(mapped);
        }
      } catch (err) {
        console.warn('Could not fetch DB products for dashboard:', err);
      }
    };
    loadDBProducts();

    const handleReset = () => handleResetFilters();
    window.addEventListener('reset-dashboard-filters', handleReset);
    return () => window.removeEventListener('reset-dashboard-filters', handleReset);
  }, []);

  const handleOpenCustomStudioModal = () => {
    setCustomModalTrigger((prev) => prev + 1);
    setTimeout(() => {
      const el = document.getElementById('custom-order-form') || document.getElementById('custom-order-section');
      if (el) {
        const yOffset = -90;
        const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    }, 100);
  };

  // Smooth Hash Scroll & Custom Order Modal Trigger
  useEffect(() => {
    if (location.hash === '#custom-order-section' || location.hash === '#custom-order-form' || location.search.includes('openCustomOrder=true')) {
      handleOpenCustomStudioModal();
    } else if (location.hash) {
      const targetId = location.hash.replace('#', '');
      const timer = setTimeout(() => {
        const el = document.getElementById(targetId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [location.hash, location.search, location.pathname]);


  // Compute highest product price in catalog dynamically
  const maxPriceLimit = useMemo(() => {
    const sourceList = dbProducts.length > 0 ? dbProducts : DEFAULT_CATALOG_PRODUCTS;
    const highest = Math.max(...sourceList.map((p) => p.price || 0), 60000);
    return Math.ceil(highest / 5000) * 5000;
  }, [dbProducts]);

  // Filter State
  const [filterState, setFilterState] = useState<DashboardFilterState>({
    categoryId: 'all',
    subcategoryId: 'all-sub',
    material: 'All Materials',
    maxPrice: 60000,
    searchQuery: '',
    sortBy: 'recommended',
  });

  // Keep initial maxPrice synced with highest catalog price
  useEffect(() => {
    if (maxPriceLimit > 0) {
      setFilterState((prev) => ({
        ...prev,
        maxPrice: prev.maxPrice === 350000 || prev.maxPrice < maxPriceLimit ? maxPriceLimit : prev.maxPrice,
      }));
    }
  }, [maxPriceLimit]);

  const handleFilterChange = (updated: Partial<DashboardFilterState>) => {
    setFilterState((prev) => ({ ...prev, ...updated }));
  };

  const handleResetFilters = () => {
    setFilterState({
      categoryId: 'all',
      subcategoryId: 'all-sub',
      material: 'All Materials',
      maxPrice: maxPriceLimit,
      searchQuery: '',
      sortBy: 'recommended',
    });
  };

  // Voice Search Functionality
  const [isListening, setIsListening] = useState(false);

  const handleVoiceSearch = useCallback(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Voice search is not supported in your browser. Please type your search query.');
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          handleFilterChange({ searchQuery: transcript });
          const el = document.getElementById('catalog-section');
          if (el) {
            const yOffset = -85;
            const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
            window.scrollTo({ top: y, behavior: 'smooth' });
          }
        }
        setIsListening(false);
      };

      recognition.onerror = (err: any) => {
        console.warn('Speech recognition error:', err);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (err) {
      console.warn('Speech recognition start failed:', err);
      setIsListening(false);
    }
  }, [isListening]);

  // Filtered Furniture Recommendations & Catalog Products
  const filteredProducts = useMemo(() => {
    const sourceList = dbProducts.length > 0 ? dbProducts : DEFAULT_CATALOG_PRODUCTS;
    return sourceList.filter((product) => {
      // Category Filter (Normalize hyphens and spaces)
      if (filterState.categoryId !== 'all') {
        const prodCatClean = (product.category || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const filterCatClean = filterState.categoryId.toLowerCase().replace(/[^a-z0-9]/g, '');
        
        const isMatch = prodCatClean === filterCatClean || 
                        prodCatClean.includes(filterCatClean) ||
                        filterCatClean.includes(prodCatClean) ||
                        (filterCatClean.includes('living') && prodCatClean.includes('living')) ||
                        (filterCatClean.includes('dining') && prodCatClean.includes('dining')) ||
                        (filterCatClean.includes('bed') && prodCatClean.includes('bed')) ||
                        (filterCatClean.includes('office') && (prodCatClean.includes('office') || prodCatClean.includes('desk'))) ||
                        (filterCatClean.includes('custom') && (prodCatClean.includes('custom') || product.isCustomizable));
        if (!isMatch) return false;
      }
      // Subcategory Filter
      if (
        filterState.subcategoryId !== 'all-sub' &&
        filterState.subcategoryId !== 'bestsellers' &&
        filterState.subcategoryId !== 'custom-ready' &&
        filterState.subcategoryId !== 'in-stock'
      ) {
        const subName = (product.subcategory || '').toLowerCase().replace(/-/g, ' ');
        const prodName = (product.name || '').toLowerCase();
        const subId = filterState.subcategoryId;

        let matchesSub = false;
        switch (subId) {
          case 'sofas':
            matchesSub = (subName.includes('sofa') || subName.includes('couch') || prodName.includes('sofa') || prodName.includes('couch') || prodName.includes('sectional') || prodName.includes('lounger') || prodName.includes('daybed')) &&
              !prodName.includes('table') && !prodName.includes('chair');
            break;
          case 'coffee-tables':
            matchesSub = (subName.includes('coffee') || subName.includes('side table') || subName.includes('coffee table') || prodName.includes('coffee') || prodName.includes('side table') || (prodName.includes('accent') && prodName.includes('table'))) &&
              !prodName.includes('chair') && !subName.includes('chair');
            break;
          case 'accent-chairs':
            matchesSub = (subName.includes('accent') || subName.includes('chair') || prodName.includes('chair') || prodName.includes('armchair') || prodName.includes('wingback') || prodName.includes('recliner')) &&
              !prodName.includes('table') && !subName.includes('table');
            break;
          case 'dining-tables':
            matchesSub = (subName.includes('dining') || prodName.includes('dining')) && (subName.includes('table') || prodName.includes('table')) &&
              !prodName.includes('chair') && !subName.includes('chair');
            break;
          case 'dining-chairs':
            matchesSub = (subName.includes('dining') || prodName.includes('dining')) && (subName.includes('chair') || prodName.includes('chair')) &&
              !prodName.includes('table') && !subName.includes('table');
            break;
          case 'king-beds':
          case 'beds':
            matchesSub = (subName.includes('bed') || prodName.includes('bed') || prodName.includes('headboard')) &&
              !prodName.includes('table') && !prodName.includes('chair') && !prodName.includes('wardrobe');
            break;
          case 'wardrobes':
            matchesSub = (subName.includes('wardrobe') || subName.includes('storage') || prodName.includes('wardrobe') || prodName.includes('storage') || prodName.includes('dresser')) &&
              !prodName.includes('bed');
            break;
          case 'desks':
            matchesSub = (subName.includes('desk') || subName.includes('workstation') || prodName.includes('desk') || prodName.includes('workstation')) &&
              !prodName.includes('chair') && !subName.includes('chair');
            break;
          case 'ergonomic':
            matchesSub = (subName.includes('ergonomic') || prodName.includes('ergonomic')) &&
              !prodName.includes('desk');
            break;
          default: {
            const filterSub = subId.toLowerCase().replace(/-/g, ' ');
            matchesSub = subName.includes(filterSub) || prodName.includes(filterSub);
            break;
          }
        }

        if (!matchesSub) {
          return false;
        }
      }
      if (filterState.subcategoryId === 'bestsellers' && !product.isTopPick) {
        return false;
      }
      if (filterState.subcategoryId === 'custom-ready' && !product.isCustomizable) {
        return false;
      }

      // Material Filter
      if (
        filterState.material !== 'All Materials' &&
        !product.material.toLowerCase().includes(filterState.material.toLowerCase())
      ) {
        return false;
      }

      // Price Range Filter
      if (product.price > filterState.maxPrice) {
        return false;
      }

      // Search Query Filter (Handles Plurals, Synonyms, Subcategories & Materials)
      if (filterState.searchQuery.trim()) {
        const rawQuery = filterState.searchQuery.toLowerCase().trim();
        const baseQuery = rawQuery.replace(/(?:es|s)$/, '');

        const searchableText = [
          product.name,
          product.category,
          product.subcategory,
          product.material,
          product.color,
          product.badge,
          product.productCode
        ].filter(Boolean).join(' ').toLowerCase();

        const matchesRaw = searchableText.includes(rawQuery);
        const matchesBase = baseQuery.length >= 3 && searchableText.includes(baseQuery);
        const isSofaSynonym = (rawQuery.includes('sofa') || rawQuery.includes('couch')) &&
          (searchableText.includes('sofa') || searchableText.includes('couch') || searchableText.includes('sectional') || searchableText.includes('lounger'));

        if (!matchesRaw && !matchesBase && !isSofaSynonym) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      if (filterState.sortBy === 'price-low') return a.price - b.price;
      if (filterState.sortBy === 'price-high') return b.price - a.price;
      if (filterState.sortBy === 'rating') return b.rating - a.rating;
      return 0;
    });
  }, [filterState, dbProducts]);

  const [activeCustomerTab, setActiveCustomerTab] = useState<string>('shop');

  // Scroll to top when switching customer tabs (Fabrication, Customization, Services, My Activity)
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeCustomerTab]);

  useEffect(() => {
    if (location.state && (location.state as any).activeTab) {
      setActiveCustomerTab((location.state as any).activeTab);
    } else {
      const params = new URLSearchParams(location.search);
      const tabParam = params.get('tab');
      if (tabParam) {
        setActiveCustomerTab(tabParam);
      }
    }
  }, [location]);

  useEffect(() => {
    const handleTabChangeEvent = (e: any) => {
      if (e.detail) {
        setActiveCustomerTab(e.detail);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    };
    window.addEventListener('change-customer-tab', handleTabChangeEvent);
    return () => window.removeEventListener('change-customer-tab', handleTabChangeEvent);
  }, []);

  const handleAddToCart = () => {
    setCartItemsCount((prev) => prev + 1);
  };

  const handleToggleWishlist = () => {
    setWishlistCount((prev) => prev + 1);
  };

  return (
    <div className="relative min-h-screen text-[#1C1814] flex flex-col selection:bg-[#387A46] selection:text-white bg-[#FAF8F5] overflow-x-hidden">
      {/* Warm Linen & Silk Ivory Luxury Studio Background (West Elm / Apple Style) */}
      <div className="fixed inset-0 z-0 bg-gradient-to-br from-[#FAF8F5] via-[#F1EDE6] to-[#E6E0D5] pointer-events-none" />
      <div className="fixed inset-0 z-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.8),_transparent_70%)] pointer-events-none" />

      {/* Foreground Interactive Content */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Floating Header Pill Navigation */}
        <Header
          cartCount={cartItemsCount}
          wishlistCount={wishlistCount}
          activeTab={activeCustomerTab}
          onSelectTab={(tab) => {
            if (tab === 'create') {
              handleOpenCustomStudioModal();
            }
            setActiveCustomerTab(tab);
          }}
          onOpenCustomOrder={handleOpenCustomStudioModal}
        />

        {/* Main Content Area placing content directly on the page layout without double-card nesting */}
        <main className="flex-1 p-3 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-8 pt-3">
          {/* TAB: SHOP (Redesigned Customer Dashboard Matching Target Image 2) */}
          {activeCustomerTab === 'shop' && (
            <div className="space-y-8 animate-fadeIn">
              {/* 1. HERO EDITORIAL BANNER & 3 VISUAL ENTRY POINTS (Matching Image 2 Top-Left) */}
              <div className="space-y-5">
                {/* Top Editorial Wood-Framed Banner */}
                <div className="relative bg-gradient-to-r from-[#D9CEBF] via-[#F4ECE1] to-[#E6DDD3] p-5 sm:p-6 rounded-3xl border border-[#D6C9B9] shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4 overflow-hidden w-full">
                  <div className="space-y-1 relative z-10 text-center sm:text-left">
                    <h1 className="font-serif text-xl sm:text-2xl font-normal text-[#2C241D] tracking-tight leading-tight">
                      Furniture, thoughtfully made for your space.
                    </h1>
                    <p className="text-xs text-[#6E6458] font-medium">
                      Discover ready-made pieces, create something unique, or bring your own design to life.
                    </p>
                  </div>

                  {/* Search Bar embedded inside the first card (Voice Search in RetailSphere Green) */}
                  <div className="relative w-full sm:w-72 lg:w-80 flex-shrink-0 z-10">
                    <Search className="w-4 h-4 text-[#48A63E] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={filterState.searchQuery}
                      onChange={(e) => handleFilterChange({ searchQuery: e.target.value })}
                      placeholder={isListening ? "Listening... Speak furniture name..." : "Search furniture..."}
                      className={`w-full pl-10 ${isListening ? 'pr-32 border-[#48A63E] ring-2 ring-[#48A63E]/40 bg-[#F4FAF4]' : 'pr-20 border-[#48A63E] focus:border-[#48A63E] focus:ring-1 focus:ring-[#48A63E] bg-white/95'} py-2 backdrop-blur-md rounded-full text-xs font-bold text-[#1C1814] placeholder-[#8A7E72] focus:outline-none shadow-sm transition-all`}
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      {filterState.searchQuery && !isListening && (
                        <button
                          type="button"
                          onClick={() => handleFilterChange({ searchQuery: '' })}
                          className="p-1 text-[#8A7E72] hover:text-[#1C1814] transition-colors cursor-pointer"
                          title="Clear search"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Voice Search Pill Button (RetailSphere Green Theme) */}
                      <button
                        type="button"
                        onClick={handleVoiceSearch}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 whitespace-nowrap ${
                          isListening
                            ? 'bg-[#48A63E] text-white animate-pulse shadow-md shadow-[#48A63E]/40 ring-2 ring-[#48A63E]/50'
                            : 'bg-[#E8F5E9] text-[#48A63E] hover:bg-[#48A63E] hover:text-white border border-[#48A63E]/30'
                        }`}
                        title={isListening ? 'Listening active. Click to stop voice input.' : 'Voice Search: Click to speak'}
                      >
                        <Mic className={`w-3.5 h-3.5 ${isListening ? 'text-white' : 'text-[#48A63E]'}`} />
                        <span>{isListening ? 'LISTENING...' : 'VOICE'}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* 3 Visual Entry Point Cards Grid (Shop Ready-Made | Create Custom | Start Fabrication) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {/* Card 1: Shop Ready-Made */}
                  <div
                    onClick={() => {
                      const el = document.getElementById('catalog-section');
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="group relative h-48 sm:h-56 rounded-3xl overflow-hidden border border-[#D6C9B9] cursor-pointer shadow-xs hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                  >
                    <img
                      src="https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80"
                      alt="Shop Ready-Made"
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#1C1814]/90 via-[#1C1814]/40 to-transparent p-5 flex flex-col justify-end">
                      <h3 className="text-base sm:text-lg font-serif font-medium text-white tracking-wide">
                        Shop Ready-Made
                      </h3>
                      <p className="text-xs text-[#E6DDD3] font-medium mt-0.5">
                        Discover ready-made pieces.
                      </p>
                    </div>
                  </div>

                  {/* Card 2: Create Custom Furniture */}
                  <div
                    onClick={() => {
                      setActiveCustomerTab('create');
                      handleOpenCustomStudioModal();
                    }}
                    className="group relative h-48 sm:h-56 rounded-3xl overflow-hidden border border-[#D6C9B9] cursor-pointer shadow-xs hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                  >
                    <img
                      src="https://images.unsplash.com/photo-1617806118233-18e1de247200?auto=format&fit=crop&w=800&q=80"
                      alt="Create Custom Furniture"
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#1C1814]/90 via-[#1C1814]/40 to-transparent p-5 flex flex-col justify-end">
                      <h3 className="text-base sm:text-lg font-serif font-medium text-white tracking-wide">
                        Create Custom Furniture
                      </h3>
                      <p className="text-xs text-[#E6DDD3] font-medium mt-0.5">
                        Integrate a premium furniture customization experience.
                      </p>
                    </div>
                  </div>

                  {/* Card 3: Start Fabrication */}
                  <div
                    onClick={() => setActiveCustomerTab('fabricate')}
                    className="group relative h-48 sm:h-56 rounded-3xl overflow-hidden border border-[#D6C9B9] cursor-pointer shadow-xs hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                  >
                    <img
                      src="https://images.unsplash.com/photo-1538688525198-9b88f6f53126?auto=format&fit=crop&w=800&q=80"
                      alt="Start Fabrication"
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#1C1814]/90 via-[#1C1814]/40 to-transparent p-5 flex flex-col justify-end">
                      <h3 className="text-base sm:text-lg font-serif font-medium text-white tracking-wide">
                        Start Fabrication
                      </h3>
                      <p className="text-xs text-[#E6DDD3] font-medium mt-0.5">
                        Start your premium furniture fabrication request.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. FURNITURE DISCOVERY CATEGORY FILTERING */}
              <CategoryFilterSection
                filterState={filterState}
                onFilterChange={handleFilterChange}
                onResetFilters={handleResetFilters}
                maxPriceLimit={maxPriceLimit}
                onOpenCustomOrder={() => {
                  setActiveCustomerTab('create');
                  handleOpenCustomStudioModal();
                }}
                allProducts={dbProducts.length > 0 ? dbProducts : DEFAULT_CATALOG_PRODUCTS}
              />

              {/* 3. PRODUCT SHOWCASE */}
              <div id="recommendations-grid" className="space-y-4 pt-1 scroll-mt-24">
                <RecommendationSection
                  products={filteredProducts}
                  onAddToCart={handleAddToCart}
                  onToggleWishlist={handleToggleWishlist}
                  onCustomizeProduct={(product) => setSelectedCustomProduct(product)}
                />
              </div>

              {/* 4. CUSTOM CREATION & CUSTOMER ACTIVITY & FABRICATION CALLOUT SECTION */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4">
                {/* Left Column: Create Something That Fits You */}
                <div className="lg:col-span-2 space-y-4">
                  <h2 className="font-serif text-xl font-medium text-[#2C241D]">
                    Create something that fits you
                  </h2>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Action 1: Customize furniture */}
                    <div
                      onClick={() => {
                        setActiveCustomerTab('create');
                        handleOpenCustomStudioModal();
                      }}
                      className="p-5 rounded-2xl bg-[#FAF8F5] border border-[#D6C9B9] hover:border-[#387A46] transition-all cursor-pointer space-y-2 shadow-2xs group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-[#E8F3E8] text-[#387A46] flex items-center justify-center font-bold text-lg group-hover:scale-110 transition-transform">
                        🛋️
                      </div>
                      <h4 className="font-extrabold text-xs text-[#1C1814] tracking-tight">Customize furniture</h4>
                      <p className="text-[11px] text-[#6E6458] font-medium leading-relaxed">
                        Modify dimensions, fabrics & wood finishes on existing models.
                      </p>
                    </div>

                    {/* Action 2: Design from scratch */}
                    <div
                      onClick={() => {
                        setActiveCustomerTab('create');
                        handleOpenCustomStudioModal();
                      }}
                      className="p-5 rounded-2xl bg-[#FAF8F5] border border-[#D6C9B9] hover:border-[#387A46] transition-all cursor-pointer space-y-2 shadow-2xs group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-[#E8F3E8] text-[#387A46] flex items-center justify-center font-bold text-lg group-hover:scale-110 transition-transform">
                        📐
                      </div>
                      <h4 className="font-extrabold text-xs text-[#1C1814] tracking-tight">Design from scratch</h4>
                      <p className="text-[11px] text-[#6E6458] font-medium leading-relaxed">
                        Build a 100% custom piece from initial sketch to delivery.
                      </p>
                    </div>

                    {/* Action 3: Upload inspiration image */}
                    <div
                      onClick={() => setActiveCustomerTab('fabricate')}
                      className="p-5 rounded-2xl bg-[#FAF8F5] border border-[#D6C9B9] hover:border-[#387A46] transition-all cursor-pointer space-y-2 shadow-2xs group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-[#E8F3E8] text-[#387A46] flex items-center justify-center font-bold text-lg group-hover:scale-110 transition-transform">
                        📷
                      </div>
                      <h4 className="font-extrabold text-xs text-[#1C1814] tracking-tight">Upload inspiration image</h4>
                      <p className="text-[11px] text-[#6E6458] font-medium leading-relaxed">
                        Provide reference photos for instant estimate & fabrication.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Right Column: Fabrication Entry Card */}
                <div className="p-6 rounded-2xl bg-gradient-to-br from-[#E6DDD3] via-[#FAF8F5] to-[#F2ECE1] border border-[#D6C9B9] flex flex-col justify-between space-y-4 shadow-xs">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#48A63E] bg-[#48A63E]/10 px-2.5 py-1 rounded-full inline-block mb-2">
                      Fabrication Requests
                    </span>
                    <h3 className="font-serif text-lg font-medium text-[#2C241D] leading-tight">
                      Have your own design or material?
                    </h3>
                    <p className="text-xs text-[#6E6458] font-medium mt-1">
                      Start a fabrication request for timber cutting, shaping, and precision board sizing.
                    </p>
                  </div>

                  <button
                    onClick={() => setActiveCustomerTab('fabricate')}
                    className="w-full py-3 rounded-full bg-[#48A63E] hover:bg-[#3D9134] text-white text-xs font-extrabold shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95"
                  >
                    <span>Start Fabrication Request</span>
                  </button>
                </div>
              </div>

              <CustomerContactSection />
            </div>
          )}

          {/* TAB: CREATE (Custom Furniture Builder) */}
          {activeCustomerTab === 'create' && (
            <div id="custom-order-section" className="scroll-mt-24">
              <CustomOrderTracker openModalTrigger={customModalTrigger} />
            </div>
          )}

          {/* TAB: FABRICATE (Wood Cutting, Shaping, Finishing & 2D Cutting Optimizer) */}
          {activeCustomerTab === 'fabricate' && <FabricationTab />}

          {/* TAB: SERVICES (On-Site Skilled Services Booking) */}
          {activeCustomerTab === 'services' && <ServicesTab />}

          {/* TAB: MY ACTIVITY (Unified Customer Hub for Orders, Requests, Materials, Quotes) */}
          {activeCustomerTab === 'my-activity' && <MyActivityTab />}

          {/* TAB: ASSISTANT (Customer Context-Aware AI Chatbot & Computer Vision Tools) */}
          {activeCustomerTab === 'assistant' && <CustomerAssistantTab />}
        </main>
      </div>

      {/* Floating Expandable Quick Actions FAB */}
      <QuickActionsFab
        onSelectTab={(tab) => {
          if (tab === 'create') {
            handleOpenCustomStudioModal();
          }
          setActiveCustomerTab(tab);
        }}
      />

      {/* Customization Studio Modal */}
      <CustomizationModal
        product={selectedCustomProduct}
        onClose={() => setSelectedCustomProduct(null)}
      />
    </div>
  );
};




