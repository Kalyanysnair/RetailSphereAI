import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Clock, CheckCircle2, Users, Sliders, ChevronRight, PackageCheck, AlertCircle, Plus, X, Send, Palette, Ruler, ArrowRight, ArrowLeft, Layers, MessageSquareText, Edit3, Lock, Image, Trash2, FileText, Download, ShoppingCart, UploadCloud } from 'lucide-react';
import { fetchOrderTrackingTimeline, OrderTrackingInfo, fetchCustomOrders, CustomOrderData, submitCustomOrderRequest, cancelCustomOrder, downloadPaymentReceipt, updateOrderStatus, customerRespondQuotation } from '../../services/api_production';
import { addToCart } from '../../utils/cartStorage';
import { parseReferenceImages, openImageInNewTab } from '../../utils/imageUtils';

// Category Definitions & Aspect Specs
interface CategorySpec {
  id: string;
  name: string;
  types: string[];
  materials: string[];
  fabricsOrFinishes: string[];
  aspects: {
    label: string;
    key: string;
    options: string[];
  }[];
}

const CATEGORY_SPECS: CategorySpec[] = [
  {
    id: 'sofas',
    name: 'Sofas & Seating',
    types: ['Custom 3-Seater Sofa', 'L-Shape Sectional', 'Lounge Armchair', 'Modular Sofa', 'Recliner Chair'],
    materials: ['Premium Teak Wood', 'Sheesham Rosewood', 'Dark Walnut', 'Natural Oak', 'Brushed Stainless Steel'],
    fabricsOrFinishes: ['Cream Bouclé', 'Emerald Green Velvet', 'Terracotta Microfiber', 'Tan Italian Leather', 'Charcoal Linen'],
    aspects: [
      {
        label: 'Seating Capacity',
        key: 'capacity',
        options: ['2-Seater (Compact)', '3-Seater (Standard)', '4-Seater (Spacious)', '5+ Seater L-Sectional'],
      },
      {
        label: 'Cushion Density & Comfort',
        key: 'cushionFirmness',
        options: ['Plush Cloud Soft', 'Ergonomic Medium-Firm', 'High-Density Orthopedic'],
      },
      {
        label: 'Armrest & Leg Style',
        key: 'legStyle',
        options: ['Tapered Wood Legs', 'Brushed Brass Metal', 'Matte Black Iron', 'Slanted Track Arm', 'Armless Minimalist'],
      },
    ],
  },
  {
    id: 'dining',
    name: 'Dining Tables & Chairs',
    types: ['Dining Table', 'Complete Dining Set with Chairs', 'Dining Bench', 'Kitchen Counter Island'],
    materials: ['Solid Teak Planks', 'Sheesham Wood', 'Italian Carrara Marble', 'Walnut Slab', 'Smoked Tempered Glass'],
    fabricsOrFinishes: ['Natural Matte Wax', 'High Gloss Lacquer', 'Dark Vintage Walnut Polish', 'Raw Organic Oil'],
    aspects: [
      {
        label: 'Tabletop Shape',
        key: 'tableShape',
        options: ['Rectangular', 'Oval', 'Round', 'Extendable Leaf Mechanism'],
      },
      {
        label: 'Seating Capacity',
        key: 'capacity',
        options: ['4-Seater', '6-Seater', '8-Seater', '10-Seater Grand'],
      },
      {
        label: 'Edge Profile',
        key: 'edgeProfile',
        options: ['Live Edge Natural', 'Beveled Soft Edge', 'Rounded Bullnose', 'Square Cut'],
      },
    ],
  },
  {
    id: 'beds',
    name: 'Beds & Sanctuary',
    types: ['Platform Bed Frame', 'Canopy Four-Poster Bed', 'Hydraulic Storage Bed', 'Daybed'],
    materials: ['Solid Teak Wood', 'Sheesham Rosewood', 'Dark Walnut', 'Natural Oak Frame'],
    fabricsOrFinishes: ['Cream Bouclé Upholstery', 'Emerald Velvet Headboard', 'Washed Organic Linen', 'Raw Wood Finish'],
    aspects: [
      {
        label: 'Bed Size Specifications',
        key: 'bedSize',
        options: ['King Size (72" x 78")', 'Queen Size (60" x 78")', 'Super King (78" x 84")', 'Custom Floorplan Specs'],
      },
      {
        label: 'Headboard Design',
        key: 'headboardStyle',
        options: ['Tall Tufted Fabric Panel', 'Floating Wooden Slats', 'Curved Wingback', 'Integrated LED Nightstands'],
      },
      {
        label: 'Underbed Storage Feature',
        key: 'storageFeature',
        options: ['Hydraulic Gas Lift Storage', 'Dual Side Pullout Drawers', 'Low-Profile Platform (No Storage)'],
      },
    ],
  },
  {
    id: 'storage',
    name: 'Storage & Cabinets',
    types: ['TV Media Console', 'Sideboard Credenza', 'Bookcase Display Cabinet', 'Full Modular Wardrobe'],
    materials: ['Solid Teak Wood', 'Sheesham Wood', 'Walnut & Brass', 'Oak & Tempered Glass'],
    fabricsOrFinishes: ['Natural Satin Wax', 'Smoked Espresso Stain', 'Matte Black Wood Grain', 'Clear Lacquer'],
    aspects: [
      {
        label: 'Door & Panel Style',
        key: 'doorStyle',
        options: ['Fluted Glass Sliding Doors', 'Soft-Close Push-Touch Solid Panels', 'Louvered Wooden Slats'],
      },
      {
        label: 'Interior Layout Requirement',
        key: 'internalLayout',
        options: ['Wine Bottle Rack & Bar', 'Glass Shelving with Warm LED', 'Clothes Hanging Rail & Drawers', 'Adjustable Shelves'],
      },
    ],
  },
  {
    id: 'workspace',
    name: 'Desks & Workstations',
    types: ['Executive L-Desk', 'Standing Electric Lift Desk', 'Writing Desk', 'Floating Wall Desk'],
    materials: ['Solid Teak Slab', 'Walnut & Steel', 'Oak Timber', 'Rosewood Executive'],
    fabricsOrFinishes: ['Matte Wood Finish', 'Dark Vintage Walnut', 'Natural Honey Oil'],
    aspects: [
      {
        label: 'Integrated Tech & Power Features',
        key: 'techFeature',
        options: ['Built-in Wireless Charger Pad', 'Cable Management Tray', 'Lockable Secret Drawer', 'Pop-Up Power Sockets'],
      },
    ],
  },
];
const DEFAULT_SAMPLE_ORDER: CustomOrderData = {
  custom_order_id: 101,
  customer_id: 1,
  customer_name: 'Valued Customer',
  customer_email: 'customer@example.com',
  customer_phone: '+91 9778237180',
  furniture_type: 'Custom 3–Seater Sofa',
  material: 'Premium Teak Wood',
  dimensions: '220cm L x 95cm W x 85cm H',
  color: 'Terracotta Microfiber (Cream White)',
  estimated_price: 45000,
  payment_status: 'Paid',
  order_status: 'Paid',
  current_stage: 'Material Sourcing',
  progress_percentage: 10,
  latest_remarks: 'Raw teak wood planks selected & inspected for moisture content.',
  order_date: '2026-08-15',
  assigned_workers: []
};

interface CustomOrderTrackerProps {
  openModalTrigger?: number;
}

export const CustomOrderTracker: React.FC<CustomOrderTrackerProps> = ({ openModalTrigger }) => {
  const navigate = useNavigate();
  const [userOrders, setUserOrders] = useState<CustomOrderData[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [trackingInfo, setTrackingInfo] = useState<OrderTrackingInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [cancelModalOrderId, setCancelModalOrderId] = useState<number | null>(null);

  const handleAddToCartAndPay = (order: CustomOrderData) => {
    if (!order.estimated_price) return;
    addToCart({
      id: `custom-order-${order.custom_order_id}`,
      name: `Custom ${order.furniture_type} (Order #${order.custom_order_id})`,
      material: `Material: ${order.material} | Shade: ${order.color}`,
      price: order.estimated_price,
      imageUrl: order.reference_image ? parseReferenceImages(order.reference_image)[0] || undefined : undefined
    });
    navigate('/cart');
  };

  // New & Edit Customization Order Inline Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState<number | null>(null);
  const [modalStep, setModalStep] = useState<1 | 2 | 3>(1);
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);

  useEffect(() => {
    if (openModalTrigger && openModalTrigger > 0) {
      setEditingOrderId(null);
      setIsFormOpen(true);
      setModalStep(1);
      setTimeout(() => {
        const el = document.getElementById('custom-order-form');
        if (el) {
          const yOffset = -90;
          const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
          window.scrollTo({ top: y, behavior: 'smooth' });
        }
      }, 100);
    }
  }, [openModalTrigger]);

  // Auto-scroll smoothly to top of customizer form whenever step changes
  useEffect(() => {
    if (isFormOpen) {
      const timer = setTimeout(() => {
        const el = document.getElementById('custom-order-form');
        if (el) {
          const yOffset = -90;
          const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
          window.scrollTo({ top: y, behavior: 'smooth' });
        }
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [modalStep, isFormOpen]);

  const handleStepChange = (nextStep: 1 | 2 | 3) => {
    setModalStep(nextStep);
    setTimeout(() => {
      const el = document.getElementById('custom-order-form');
      if (el) {
        const yOffset = -90;
        const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    }, 50);
  };

  // Selected Customization Options State
  const [selectedCategory, setSelectedCategory] = useState<CategorySpec>(CATEGORY_SPECS[0]);
  const [furnitureType, setFurnitureType] = useState(CATEGORY_SPECS[0].types[0]);
  const [material, setMaterial] = useState(CATEGORY_SPECS[0].materials[0]);
  const [customMaterialInput, setCustomMaterialInput] = useState('');
  const [fabricOrFinish, setFabricOrFinish] = useState(CATEGORY_SPECS[0].fabricsOrFinishes[0]);
  const [selectedColor, setSelectedColor] = useState('Cream White');
  const [customColorInput, setCustomColorInput] = useState('');
  const [customPickerHex, setCustomPickerHex] = useState('#38A132');
  const [aspectSelections, setAspectSelections] = useState<Record<string, string>>({});
  const [referenceImageUrls, setReferenceImageUrls] = useState<string[]>(['']);
  const [isDragging, setIsDragging] = useState(false);

  const processFiles = (files: FileList | File[]) => {
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (result) {
          setReferenceImageUrls((prev) => {
            const filtered = prev.filter((url) => url.trim() !== '');
            return [...filtered, result];
          });
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  // Dimensions & Specific Requirements State
  const [lengthCm, setLengthCm] = useState('220');
  const [widthCm, setWidthCm] = useState('95');
  const [heightCm, setHeightCm] = useState('85');
  const [customNotes, setCustomNotes] = useState('');

  const loadUserCustomOrders = async () => {
    setLoading(true);
    try {
      const allOrders = await fetchCustomOrders();
      // Filter out cancelled requests so they are hidden from the Build Studio section (only displayed in My Orders)
      const activeBuildOrders = allOrders.filter(o => o.order_status !== 'Cancelled');
      activeBuildOrders.sort((a, b) => b.custom_order_id - a.custom_order_id);
      if (activeBuildOrders.length > 0) {
        setUserOrders(activeBuildOrders);
        if (!selectedOrderId || !activeBuildOrders.some(o => o.custom_order_id === selectedOrderId)) {
          setSelectedOrderId(activeBuildOrders[0].custom_order_id);
        }
      } else {
        setUserOrders([]);
        setSelectedOrderId(null);
      }
    } catch (err) {
      console.error('Error loading custom order tracking:', err);
      setUserOrders([]);
      setSelectedOrderId(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUserCustomOrders();
  }, []);

  useEffect(() => {
    if (!selectedOrderId) return;
    const loadTracking = async () => {
      try {
        const info = await fetchOrderTrackingTimeline(selectedOrderId);
        setTrackingInfo(info);
      } catch (err) {
        console.error('Error fetching order tracking timeline:', err);
      }
    };
    loadTracking();
  }, [selectedOrderId]);

  // Handle Category Change
  const handleCategorySelect = (cat: CategorySpec) => {
    setSelectedCategory(cat);
    setFurnitureType(cat.types[0]);
    setMaterial(cat.materials[0]);
    setFabricOrFinish(cat.fabricsOrFinishes[0]);
    const initialAspects: Record<string, string> = {};
    cat.aspects.forEach((asp) => {
      initialAspects[asp.key] = asp.options[0];
    });
    setAspectSelections(initialAspects);
  };

  const handleAspectChange = (key: string, val: string) => {
    setAspectSelections((prev) => ({ ...prev, [key]: val }));
  };

  // Helper to parse design_description string into clean aspect pills & special notes
  const parseOrderDescription = (desc?: string) => {
    if (!desc) return { aspectPills: [], specialNotes: '' };
    
    let specialNotes = desc;
    const aspectPills: { label: string; value: string }[] = [];

    if (desc.includes('Aspects: [')) {
      const parts = desc.split(']. Special Requirements: ');
      const rawAspects = parts[0].replace('Aspects: [', '');
      specialNotes = parts[1] || '';

      const aspectPairs = rawAspects.split('; ');
      aspectPairs.forEach((pair) => {
        const [k, v] = pair.split(': ');
        if (k && v) {
          const formattedKey = k
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, (str) => str.toUpperCase())
            .replace('Capacity', 'Seating')
            .replace('Cushion Firmness', 'Comfort')
            .replace('Leg Style', 'Leg & Base');
          aspectPills.push({ label: formattedKey, value: v });
        }
      });
    }

    return { aspectPills, specialNotes };
  };

  // Start Editing Specs for a Pending Order
  const handleStartEditOrder = (order: CustomOrderData) => {
    if (order.order_status !== 'Pending' && order.order_status !== 'Pending Approval') {
      return; // Editing disabled once approved!
    }

    setEditingOrderId(order.custom_order_id);
    setFurnitureType(order.furniture_type);
    setMaterial(order.material);
    setFabricOrFinish(order.color);
    if (order.reference_image) {
      const images = parseReferenceImages(order.reference_image);
      setReferenceImageUrls(images.length > 0 ? images : ['']);
    } else {
      setReferenceImageUrls(['']);
    }

    if (order.dimensions) {
      const match = order.dimensions.match(/(\d+)cm L × (\d+)cm W × (\d+)cm H/);
      if (match) {
        setLengthCm(match[1]);
        setWidthCm(match[2]);
        setHeightCm(match[3]);
      }
    }

    const { specialNotes } = parseOrderDescription(order.design_description);
    setCustomNotes(specialNotes === 'None' ? '' : specialNotes);

    setIsFormOpen(true);
    setModalStep(1);

    setTimeout(() => {
      const el = document.getElementById('custom-order-form');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleCreateOrUpdateCustomOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingOrder) return;

    setSubmittingOrder(true);
    try {
      const formattedDimensions = `${lengthCm}cm L × ${widthCm}cm W × ${heightCm}cm H`;
      const aspectSummary = Object.entries(aspectSelections)
        .map(([k, v]) => `${k}: ${v}`)
        .join('; ');

      const finalMaterial = material === 'Other' ? (customMaterialInput.trim() || 'Custom Material') : material;
      let finalColor = selectedColor;
      if (selectedColor === 'Custom Color Picker' || selectedColor === 'Other') {
        const shadeName = customColorInput.trim() || 'Custom Shade';
        finalColor = `${shadeName} (${customPickerHex.toUpperCase()})`;
      }
      const combinedColorFinish = `${fabricOrFinish} (${finalColor})`;

      const fullNotes = `Aspects: [${aspectSummary}]. Special Requirements: ${customNotes || 'None'}`;

      const validRefImages = referenceImageUrls.map(u => u.trim()).filter(Boolean).join(', ');

      if (editingOrderId) {
        // Edit existing pending order
        setUserOrders((prev) =>
          prev.map((o) =>
            o.custom_order_id === editingOrderId
              ? {
                  ...o,
                  furniture_type: furnitureType,
                  material: finalMaterial,
                  dimensions: formattedDimensions,
                  color: combinedColorFinish,
                  design_description: fullNotes,
                  reference_image: validRefImages || o.reference_image,
                }
              : o
          )
        );
        setSelectedOrderId(editingOrderId);
      } else {
        // Create new custom order
        const created = await submitCustomOrderRequest(
          furnitureType,
          finalMaterial,
          formattedDimensions,
          combinedColorFinish,
          fullNotes,
          validRefImages || undefined
        );
        setUserOrders((prev) => [created, ...prev]);
        setSelectedOrderId(created.custom_order_id);
      }

      // Trigger backend contact email notification
      try {
        const storedUser = localStorage.getItem('user');
        const userObj = storedUser ? JSON.parse(storedUser) : null;
        const endpoint = window.location.port === '3000' 
          ? 'http://localhost:8000/api/auth/contact' 
          : '/api/auth/contact';

        await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: userObj?.full_name || userObj?.username || 'Logged Customer',
            email: userObj?.email || 'kalyanys2004@gmail.com',
            subject: `${editingOrderId ? 'Updated' : 'New'} Custom Furniture Order Request: ${furnitureType}`,
            message: `Custom Build Specifications:\n- Category: ${selectedCategory.name}\n- Product Type: ${furnitureType}\n- Primary Material: ${material}\n- Upholstery / Finish: ${fabricOrFinish}\n- Dimensions: ${formattedDimensions}\n- Aspect Specs: ${aspectSummary}\n- Additional Requirements / Notes: ${customNotes || 'None'}`,
          }),
        });
      } catch (e) {
        console.warn("Contact email dispatch notice:", e);
      }

      setOrderSuccess(true);

      setTimeout(() => {
        setOrderSuccess(false);
        setIsFormOpen(false);
        setEditingOrderId(null);
        setModalStep(1);
        setCustomNotes('');
      }, 2000);
    } catch (err) {
      console.error('Error saving custom order:', err);
    } finally {
      setSubmittingOrder(false);
    }
  };

  if (loading) {
    return (
      <div className="ultra-glass-card rounded-3xl p-8 text-center text-[#2C241D]">
        <Clock className="w-8 h-8 animate-spin mx-auto mb-2 text-[#38A132]" />
        <p className="text-xs font-bold text-[#2C241D]">Loading custom order live tracker...</p>
      </div>
    );
  }

  const activeOrder = userOrders.find(o => o.custom_order_id === selectedOrderId) || userOrders[0];

  const stages = [
    'Material Sourcing',
    'Cutting & Joinery',
    'Assembly & Upholstery',
    'Quality Control & Finishing',
    'Ready for Dispatch'
  ];

  const getStageIndex = (stageName: string) => {
    const idx = stages.findIndex(s => s.toLowerCase() === stageName.toLowerCase());
    return idx >= 0 ? idx : 0;
  };

  const currentStageIdx = activeOrder ? getStageIndex(activeOrder.current_stage || 'Material Sourcing') : 0;
  const { aspectPills, specialNotes } = activeOrder ? parseOrderDescription(activeOrder.design_description) : { aspectPills: [], specialNotes: '' };

  const isEditable = activeOrder && (activeOrder.order_status === 'Pending' || activeOrder.order_status === 'Pending Approval');

  return (
    <div className="space-y-8 text-[#2C241D]">
      {/* INLINE EXPANDABLE CUSTOMIZATION FORM (PAGE DOCUMENT FLOW) */}
      {isFormOpen && (
        <div id="custom-order-form" className="bg-[#FAF7F2] border-2 border-[#E2D7CB] rounded-[2rem] p-6 sm:p-8 shadow-2xl relative overflow-hidden space-y-6 text-[#2C241D] animate-fadeIn scroll-mt-24">
          <div className="glass-sheen" aria-hidden="true" />

          {/* Form Header */}
          <div className="relative z-10 flex items-start justify-between border-b border-[#EFE7DE] pb-4">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#38A132] bg-[#38A132]/10 px-3 py-1 rounded-full border border-[#38A132]/30">
                <Sliders className="w-3.5 h-3.5 text-[#38A132]" /> Bespoke Custom Furniture Studio
              </div>
              <h2 className="text-2xl font-extrabold text-[#2C241D] mt-2">
                {editingOrderId ? `Edit Specifications for Order #${editingOrderId}` : 'Configure Your Custom Furniture Specifications'}
              </h2>
              <p className="text-xs text-[#6B5C4D] font-medium">
                Step {modalStep} of 3 • {modalStep === 1 ? 'Category & Item Type' : modalStep === 2 ? 'Materials, Fabrics & Specs' : 'Dimensions & Special Requirements'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsFormOpen(false);
                setEditingOrderId(null);
              }}
              className="p-2.5 rounded-xl text-[#9E9082] hover:text-[#2C241D] hover:bg-[#F5ECE1] border border-[#E2D7CB] transition-colors cursor-pointer"
              title="Close Form"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {orderSuccess ? (
            <div className="relative z-10 py-10 text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-[#38A132]/15 border border-[#38A132]/40 text-[#38A132] mx-auto flex items-center justify-center animate-bounce">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-extrabold text-[#2C241D]">
                {editingOrderId ? 'Specifications Updated Successfully!' : 'Custom Build Request Submitted!'}
              </h3>
              <p className="text-xs text-[#6B5C4D] max-w-sm mx-auto font-medium">
                Your custom specifications for <strong>{furnitureType}</strong> have been saved!
              </p>
            </div>
          ) : (
            <form onSubmit={handleCreateOrUpdateCustomOrder} className="relative z-10 space-y-6 text-xs">
              {/* STEP 1: CATEGORY & ITEM TYPE */}
              {modalStep === 1 && (
                <div className="space-y-5 animate-fadeIn">
                  <div>
                    <label className="block font-extrabold text-[#5C4E42] mb-2 flex items-center gap-1.5 text-xs">
                      <Layers className="w-4 h-4 text-[#38A132]" />
                      Select Furniture Category
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {CATEGORY_SPECS.map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => handleCategorySelect(cat)}
                          className={`p-3.5 rounded-2xl border font-bold text-left transition-all cursor-pointer ${
                            selectedCategory.id === cat.id
                              ? 'bg-[#38A132]/15 border-[#38A132] text-[#2C241D] shadow-xs ring-1 ring-[#38A132]'
                              : 'bg-[#FAF7F2] border-[#E2D7CB] text-[#5C4E42] hover:bg-[#F4ECE1]'
                          }`}
                        >
                          {cat.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block font-extrabold text-[#5C4E42] mb-2 text-xs">
                      Select Specific Product / Item Type
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {selectedCategory.types.map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setFurnitureType(type)}
                          className={`p-3.5 rounded-2xl border font-bold text-left transition-all cursor-pointer ${
                            furnitureType === type
                              ? 'bg-[#38A132]/15 border-[#38A132] text-[#2C241D] shadow-xs'
                              : 'bg-[#FAF7F2] border-[#E2D7CB] text-[#5C4E42] hover:bg-[#F4ECE1]'
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-3 flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleStepChange(2)}
                      className="py-3 px-6 bg-[#38A132] hover:bg-[#32922D] text-white text-xs font-extrabold rounded-xl flex items-center gap-2 shadow-md shadow-[#38A132]/20 transition-all cursor-pointer"
                    >
                      <span>Next: Materials & Specs</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: MATERIALS, FABRICS & CATEGORY ASPECTS */}
              {modalStep === 2 && (
                <div className="space-y-5 animate-fadeIn">
                  <div>
                    <label className="block font-extrabold text-[#5C4E42] mb-2 flex items-center gap-1.5 text-xs">
                      <Sliders className="w-4 h-4 text-[#38A132]" />
                      Primary Timber / Structural Material
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {[...selectedCategory.materials, 'Other'].map((mat) => (
                        <button
                          key={mat}
                          type="button"
                          onClick={() => setMaterial(mat)}
                          className={`p-3 rounded-2xl border font-bold text-left transition-all cursor-pointer ${
                            material === mat
                              ? 'bg-[#38A132]/15 border-[#38A132] text-[#2C241D] shadow-xs'
                              : 'bg-[#FAF7F2] border-[#E2D7CB] text-[#5C4E42] hover:bg-[#F4ECE1]'
                          }`}
                        >
                          {mat === 'Other' ? '✨ Other Material' : mat}
                        </button>
                      ))}
                    </div>
                    {material === 'Other' && (
                      <div className="mt-2.5 animate-fadeIn">
                        <label className="block text-[11px] font-bold text-[#7A6C5E] mb-1">
                          Specify Your Custom Structural Material:
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Italian Carrara Gold Marble, Reclaimed Oak Timber, Brass Frame..."
                          value={customMaterialInput}
                          onChange={(e) => setCustomMaterialInput(e.target.value)}
                          required={material === 'Other'}
                          className="w-full px-3.5 py-2.5 bg-white border border-[#E2D7CB] rounded-xl font-bold text-xs focus:outline-none focus:border-[#38A132] text-[#2C241D]"
                        />
                      </div>
                    )}
                  </div>

                  {/* COLOR & POLISH SELECTION WITH VISUAL PALETTE & INTERACTIVE COLOR PICKER */}
                  <div>
                    <label className="block font-extrabold text-[#5C4E42] mb-2 flex items-center gap-1.5 text-xs">
                      <Palette className="w-4 h-4 text-[#38A132]" />
                      Color & Polish Shade Selection (Visual Palette & Color Picker)
                    </label>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {[
                        { name: 'Cream White', hex: '#FDFBF7' },
                        { name: 'Emerald Green', hex: '#0B4F37' },
                        { name: 'Terracotta Orange', hex: '#C85A32' },
                        { name: 'Charcoal Grey', hex: '#2F3337' },
                        { name: 'Navy Blue', hex: '#1E293B' },
                        { name: 'Natural Teak Wax', hex: '#A87948' },
                        { name: 'Dark Walnut Polish', hex: '#4A3525' },
                        { name: 'Gold / Brass Accent', hex: '#D4AF37' },
                        { name: 'Custom Color Picker', hex: 'CUSTOM_PICKER' }
                      ].map((swatch) => {
                        const isSelected = selectedColor === swatch.name;
                        if (swatch.hex === 'CUSTOM_PICKER') {
                          return (
                            <button
                              key={swatch.name}
                              type="button"
                              onClick={() => setSelectedColor(swatch.name)}
                              className={`p-3 rounded-2xl border font-bold text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                                isSelected
                                  ? 'bg-[#38A132]/15 border-[#38A132] text-[#2C241D] shadow-xs ring-1 ring-[#38A132]'
                                  : 'bg-[#FAF7F2] border-[#E2D7CB] text-[#5C4E42] hover:bg-[#F4ECE1]'
                              }`}
                            >
                              <div className="w-5 h-5 rounded-full border border-dashed border-[#38A132] flex items-center justify-center text-[10px] shrink-0 font-mono">
                                🎨
                              </div>
                              <span className="text-xs truncate">Custom Color Picker</span>
                            </button>
                          );
                        }

                        return (
                          <button
                            key={swatch.name}
                            type="button"
                            onClick={() => setSelectedColor(swatch.name)}
                            className={`p-3 rounded-2xl border font-bold text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                              isSelected
                                ? 'bg-[#38A132]/15 border-[#38A132] text-[#2C241D] shadow-xs ring-1 ring-[#38A132]'
                                : 'bg-[#FAF7F2] border-[#E2D7CB] text-[#5C4E42] hover:bg-[#F4ECE1]'
                            }`}
                          >
                            <span
                              className="w-4 h-4 rounded-full inline-block border border-black/20 shadow-2xs shrink-0"
                              style={{ backgroundColor: swatch.hex }}
                            />
                            <span className="text-xs truncate">{swatch.name}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* INTERACTIVE COLOR PICKER & CUSTOM COLOR NAME INPUT */}
                    {(selectedColor === 'Custom Color Picker' || selectedColor === 'Other') && (
                      <div className="mt-3 p-4 bg-white border border-[#E2D7CB] rounded-2xl space-y-3 animate-fadeIn shadow-xs">
                        <div className="flex items-center gap-3 flex-wrap">
                          <div>
                            <label className="block text-[11px] font-extrabold text-[#7A6C5E] mb-1">
                              Pick Color Hex:
                            </label>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={customPickerHex}
                                onChange={(e) => setCustomPickerHex(e.target.value)}
                                className="w-10 h-10 rounded-xl border border-[#E2D7CB] cursor-pointer bg-transparent p-0.5"
                              />
                              <span className="font-mono text-xs font-extrabold text-[#2C241D] bg-[#FAF7F2] px-2.5 py-1.5 rounded-lg border border-[#E2D7CB]">
                                {customPickerHex.toUpperCase()}
                              </span>
                            </div>
                          </div>

                          <div className="flex-1 min-w-[200px]">
                            <label className="block text-[11px] font-extrabold text-[#7A6C5E] mb-1">
                              Custom Color / Shade Name:
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. Sage Green, Dusty Rose Velvet, Royal Burgundy..."
                              value={customColorInput}
                              onChange={(e) => setCustomColorInput(e.target.value)}
                              className="w-full px-3.5 py-2 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl font-bold text-xs focus:outline-none focus:border-[#38A132] text-[#2C241D]"
                            />
                          </div>
                        </div>

                        {/* Visual Live Swatch Preview */}
                        <div className="p-3 bg-[#FAF7F2] rounded-xl border border-[#E2D7CB] flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-xl border border-black/20 shadow-xs shrink-0"
                            style={{ backgroundColor: customPickerHex }}
                          />
                          <div className="text-xs space-y-0.5">
                            <span className="font-extrabold text-[#2C241D] block">
                              Selected Color Preview: {customColorInput.trim() || 'Custom Shade'}
                            </span>
                            <span className="text-[11px] text-[#48A63E] font-extrabold font-mono block">
                              HEX Code: {customPickerHex.toUpperCase()}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block font-extrabold text-[#5C4E42] mb-2 flex items-center gap-1.5 text-xs">
                      <Sliders className="w-4 h-4 text-[#38A132]" />
                      Upholstery Fabric / Texture Finish
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {selectedCategory.fabricsOrFinishes.map((fab) => (
                        <button
                          key={fab}
                          type="button"
                          onClick={() => setFabricOrFinish(fab)}
                          className={`p-3 rounded-2xl border font-bold text-left transition-all cursor-pointer ${
                            fabricOrFinish === fab
                              ? 'bg-[#38A132]/15 border-[#38A132] text-[#2C241D] shadow-xs'
                              : 'bg-[#FAF7F2] border-[#E2D7CB] text-[#5C4E42] hover:bg-[#F4ECE1]'
                          }`}
                        >
                          {fab}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* DYNAMIC CATEGORY ASPECTS */}
                  {selectedCategory.aspects.map((asp) => (
                    <div key={asp.key}>
                      <label className="block font-extrabold text-[#5C4E42] mb-2 text-xs">
                        {asp.label}
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                        {asp.options.map((opt) => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => handleAspectChange(asp.key, opt)}
                            className={`p-3 rounded-2xl border font-bold text-left transition-all cursor-pointer ${
                              aspectSelections[asp.key] === opt
                                ? 'bg-[#38A132]/15 border-[#38A132] text-[#2C241D] shadow-xs'
                                : 'bg-[#FAF7F2] border-[#E2D7CB] text-[#5C4E42] hover:bg-[#F4ECE1]'
                            }`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}

                  <div className="pt-3 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => handleStepChange(1)}
                      className="py-2.5 px-5 bg-[#FAF7F2] hover:bg-[#F4ECE1] text-[#2C241D] text-xs font-bold border border-[#E2D7CB] rounded-xl flex items-center gap-2 cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Back</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleStepChange(3)}
                      className="py-3 px-6 bg-[#38A132] hover:bg-[#32922D] text-white text-xs font-extrabold rounded-xl flex items-center gap-2 shadow-md shadow-[#38A132]/20 transition-all cursor-pointer"
                    >
                      <span>Next: Dimensions & Requirements</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: DIMENSIONS & TEXT AREA FOR SPECIAL REQUIREMENTS */}
              {modalStep === 3 && (
                <div className="space-y-5 animate-fadeIn">
                  <div>
                    <label className="block font-extrabold text-[#5C4E42] mb-2 flex items-center gap-1.5 text-xs">
                      <Ruler className="w-4 h-4 text-[#38A132]" />
                      Exact Custom Dimensions & Measurements
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-[#7A6C5E] mb-1">Length (cm)</label>
                        <input
                          type="number"
                          value={lengthCm}
                          onChange={(e) => setLengthCm(e.target.value)}
                          required
                          className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl text-[#2C241D] font-bold focus:outline-none focus:border-[#38A132]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-[#7A6C5E] mb-1">Width / Depth (cm)</label>
                        <input
                          type="number"
                          value={widthCm}
                          onChange={(e) => setWidthCm(e.target.value)}
                          required
                          className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl text-[#2C241D] font-bold focus:outline-none focus:border-[#38A132]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-[#7A6C5E] mb-1">Height (cm)</label>
                        <input
                          type="number"
                          value={heightCm}
                          onChange={(e) => setHeightCm(e.target.value)}
                          required
                          className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl text-[#2C241D] font-bold focus:outline-none focus:border-[#38A132]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* REFERENCE DESIGN IMAGES PROVISION (OPTIONAL MULTI-IMAGE & DRAG-AND-DROP) */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="font-extrabold text-[#5C4E42] flex items-center gap-1.5 text-xs">
                        <Image className="w-4 h-4 text-[#38A132]" />
                        Reference Design Images (Optional - Drag & drop photos or paste URLs)
                      </label>
                      <button
                        type="button"
                        onClick={() => setReferenceImageUrls((prev) => [...prev, ''])}
                        className="text-xs font-extrabold text-[#38A132] hover:text-[#32922D] flex items-center gap-1 cursor-pointer bg-[#38A132]/10 px-2.5 py-1 rounded-xl border border-[#38A132]/30"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add URL Link</span>
                      </button>
                    </div>

                    {/* DRAG AND DROP ZONE */}
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => document.getElementById('reference-file-input')?.click()}
                      className={`border-2 border-dashed rounded-2xl p-5 sm:p-6 text-center cursor-pointer transition-all ${
                        isDragging
                          ? 'border-[#38A132] bg-[#38A132]/15 shadow-md shadow-[#38A132]/20 scale-[1.01]'
                          : 'border-[#38A132]/40 hover:border-[#38A132] bg-[#38A132]/5 hover:bg-[#38A132]/10'
                      }`}
                    >
                      <input
                        id="reference-file-input"
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleFileInputChange}
                        className="hidden"
                      />
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <div className="w-12 h-12 rounded-2xl bg-[#38A132]/10 border border-[#38A132]/30 text-[#38A132] flex items-center justify-center">
                          <UploadCloud className="w-6 h-6 animate-pulse" />
                        </div>
                        <div>
                          <p className="text-xs font-extrabold text-[#2C241D]">
                            Drag & drop reference design images here, or <span className="text-[#38A132] underline">browse device files</span>
                          </p>
                          <p className="text-[11px] font-medium text-[#7A6C5E] mt-0.5">
                            Supports PNG, JPG, JPEG, WEBP, GIF, SVG (Select multiple files at once)
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* IMAGE URL INPUTS & PREVIEW CARDS */}
                    <div className="space-y-3">
                      {referenceImageUrls.map((url, idx) => {
                        const isBase64 = url.trim().startsWith('data:image/');
                        return (
                          <div key={idx} className="space-y-2">
                            {/* Hide text input box for uploaded Base64 files */}
                            {!isBase64 && (
                              <div className="flex items-center gap-2">
                                <input
                                  type="url"
                                  value={url}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setReferenceImageUrls((prev) => {
                                      const next = [...prev];
                                      next[idx] = val;
                                      return next;
                                    });
                                  }}
                                  placeholder={`Paste reference photo URL ${idx + 1} (Unsplash, Pinterest, Instagram, drive link)...`}
                                  className="w-full px-3.5 py-2.5 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#38A132] text-[#2C241D]"
                                />
                                {referenceImageUrls.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setReferenceImageUrls((prev) => prev.filter((_, i) => i !== idx))
                                    }
                                    className="p-2.5 text-rose-600 hover:bg-rose-50 rounded-xl border border-rose-200 transition-colors cursor-pointer"
                                    title="Remove image"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            )}

                            {/* Live Image Preview Card */}
                            {url.trim() !== '' && (
                              <div className="p-3 bg-white border border-[#E2D7CB] rounded-2xl flex items-center justify-between gap-3 animate-fadeIn shadow-xs">
                                <div className="flex items-center gap-3 overflow-hidden">
                                  <img
                                    src={url.trim()}
                                    alt={`Reference Preview ${idx + 1}`}
                                    className="w-14 h-14 rounded-xl object-cover border border-[#EFE7DE] flex-shrink-0"
                                    onError={(e) => {
                                      (e.target as HTMLElement).style.display = 'none';
                                    }}
                                  />
                                  <div className="text-xs font-semibold space-y-0.5 min-w-0 flex-1 truncate">
                                    <span className="text-[#38A132] font-extrabold flex items-center gap-1">
                                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                      {isBase64 ? `Uploaded Reference Photo #${idx + 1}` : `Reference Link #${idx + 1}`}
                                    </span>
                                    {!isBase64 && (
                                      <p className="text-[11px] text-[#7A6C5E] truncate">{url.trim()}</p>
                                    )}
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setReferenceImageUrls((prev) => prev.filter((_, i) => i !== idx))
                                  }
                                  className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl border border-rose-200 transition-colors cursor-pointer shrink-0"
                                  title="Remove reference image"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block font-extrabold text-[#5C4E42] mb-2 flex items-center gap-1.5 text-xs">
                      <MessageSquareText className="w-4 h-4 text-[#38A132]" />
                      Additional Requirements & Special Customization Details
                    </label>
                    <textarea
                      rows={4}
                      value={customNotes}
                      onChange={(e) => setCustomNotes(e.target.value)}
                      placeholder="Write all specific needs here: e.g. Stain-resistant upholstery for pets, custom carving on table legs, specific robot vacuum clearance height, or floor plan layout notes..."
                      className="w-full px-4 py-3 text-xs sm:text-sm bg-[#FAF7F2] border border-[#E2D7CB] rounded-2xl text-[#2C241D] font-bold focus:outline-none focus:border-[#38A132] focus:ring-1 focus:ring-[#38A132]"
                    />
                  </div>

                  <div className="pt-3 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => handleStepChange(2)}
                      className="py-2.5 px-5 bg-[#FAF7F2] hover:bg-[#F4ECE1] text-[#2C241D] text-xs font-bold border border-[#E2D7CB] rounded-xl flex items-center gap-2 cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Back</span>
                    </button>

                    <button
                      type="submit"
                      disabled={submittingOrder}
                      className="py-3.5 px-8 bg-[#38A132] hover:bg-[#32922D] text-white text-xs sm:text-sm font-extrabold rounded-xl shadow-md shadow-[#38A132]/20 transition-all flex items-center gap-2 disabled:opacity-60 cursor-pointer"
                    >
                      {submittingOrder ? (
                        <span>Saving Changes...</span>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span>{editingOrderId ? 'Update Specifications' : 'Submit Custom Build Order'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </form>
          )}
        </div>
      )}

      {/* SINGLE UNIFIED GLASS CARD CONTAINER FOR TRACKER (Only rendered when user has active custom orders) */}
      {userOrders.length > 0 && activeOrder && (
        <div className="ultra-glass-card bg-white/60 backdrop-blur-xl border border-white/80 rounded-[2rem] p-6 sm:p-8 shadow-xl relative overflow-hidden space-y-6">
        <div className="glass-sheen" aria-hidden="true" />

        {/* Card Header & Action Bar */}
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-[#EFE7DE]">
          <div>
            <h2 className="text-2xl font-extrabold text-[#2C241D] tracking-tight mt-1">
              Custom Orders & Build Studio
            </h2>
            <p className="text-xs text-[#6B5C4D] mt-1 font-medium">
              Configure bespoke furniture specs, customize dimensions & materials, and track artisan craftsmanship in real-time.
            </p>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={() => {
                setEditingOrderId(null);
                setIsFormOpen(true);
                setModalStep(1);
                setTimeout(() => {
                  const el = document.getElementById('custom-order-form');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }, 100);
              }}
              className="w-full sm:w-auto py-2.5 px-5 rounded-xl bg-[#38A132] hover:bg-[#32922D] text-white text-xs font-extrabold flex items-center justify-center gap-2 shadow-md shadow-[#38A132]/25 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Request Custom Order</span>
            </button>
          </div>
        </div>

        <div className="relative z-10 space-y-6">
            {/* Active Order Specs & Status Banner */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-[#EFE7DE]">
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-3 flex-wrap">

                  <span className={`text-xs font-extrabold px-3 py-1 rounded-full ${
                    activeOrder.order_status === 'Pending' || activeOrder.order_status === 'Pending Approval'
                      ? 'bg-amber-500/15 text-amber-800 border border-amber-500/30'
                      : activeOrder.order_status === 'Approved'
                      ? 'bg-blue-500/15 text-blue-800 border border-blue-500/30'
                      : activeOrder.order_status === 'In Production'
                      ? 'bg-purple-500/15 text-purple-800 border border-purple-500/30 animate-pulse'
                      : activeOrder.order_status === 'Completed'
                      ? 'bg-emerald-500/15 text-emerald-800 border border-emerald-500/30'
                      : 'bg-rose-500/15 text-rose-800 border border-rose-500/30'
                  }`}>
                    Status: {activeOrder.order_status}
                  </span>

                  {/* DOWNLOAD PAYMENT RECEIPT PROVISION */}
                  {(activeOrder.payment_status === 'Paid' || activeOrder.order_status === 'Paid') && (
                    <button
                      onClick={() => downloadPaymentReceipt(activeOrder)}
                      className="px-3.5 py-1.5 rounded-full bg-[#38A132] hover:bg-[#32922D] text-white text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer shadow-md animate-fadeIn"
                      title="Download official paid invoice & receipt"
                    >
                      <Download className="w-3.5 h-3.5 text-white" />
                      <span>Download Receipt</span>
                    </button>
                  )}

                  {/* EDIT PROVISION (Available only for Pending orders, locked once Approved!) */}
                  {isEditable ? (
                    <button
                      onClick={() => handleStartEditOrder(activeOrder)}
                      className="px-3 py-1 rounded-full bg-white/80 hover:bg-white border border-white/80 text-[#2C241D] text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                      title="Edit specifications before production approval"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-[#38A132]" />
                      <span>Edit Specifications</span>
                    </button>
                  ) : (
                    <span className="px-3 py-1 rounded-full bg-white/60 border border-white/80 text-[#8C7C6D] text-[11px] font-extrabold flex items-center gap-1.5" title="Order has been approved by production staff. Specs are locked.">
                      <Lock className="w-3.5 h-3.5 text-[#8C7C6D]" />
                      Specs Locked (Order Approved)
                    </span>
                  )}
                  {/* CANCEL REQUEST OPTION FOR UNPAID CUSTOM ORDERS */}
                  {activeOrder.order_status !== 'Cancelled' && activeOrder.order_status !== 'Completed' && activeOrder.order_status !== 'In Production' && activeOrder.order_status !== 'Paid' && (
                    <button
                      onClick={() => setCancelModalOrderId(activeOrder.custom_order_id)}
                      className="w-7 h-7 rounded-full bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 flex items-center justify-center transition-all cursor-pointer shadow-2xs shrink-0"
                      title="Cancel Order"
                    >
                      <X className="w-3.5 h-3.5 text-rose-600" />
                    </button>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  {activeOrder.reference_image && parseReferenceImages(activeOrder.reference_image).length > 0 && (
                    <div className="flex items-center gap-2.5 flex-wrap shrink-0">
                      {parseReferenceImages(activeOrder.reference_image).map((imgUrl, idx) => (
                        <div key={idx} className="relative group shrink-0">
                          <button
                            type="button"
                            onClick={() => openImageInNewTab(imgUrl)}
                            className="block cursor-pointer"
                          >
                            <img
                              src={imgUrl}
                              alt={`Design Reference ${idx + 1}`}
                              className="w-20 h-20 rounded-2xl object-cover border-2 border-[#E2D7CB] shadow-md group-hover:scale-105 transition-transform"
                              onError={(e) => {
                                const target = e.target as HTMLElement;
                                target.style.display = 'none';
                                if (target.parentElement && target.parentElement.parentElement) {
                                  target.parentElement.parentElement.style.display = 'none';
                                }
                              }}
                            />
                            <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded-md bg-[#2C241D]/80 text-white font-extrabold text-[9px] backdrop-blur-xs">
                              Ref #{idx + 1}
                            </span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="space-y-2">
                    <h3 className="text-2xl font-extrabold text-[#2C241D] tracking-tight">
                      {activeOrder.furniture_type}
                    </h3>

                    {/* ELEGANT SPECIFICATION PILLS (Formatted cleanly, no raw text strings!) */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <span className="px-3 py-1.5 rounded-xl bg-white/50 backdrop-blur-md border border-white/70 text-xs font-bold text-[#2C241D] flex items-center gap-1.5 shadow-2xs">
                        <span className="text-[#5C4E42]">Wood/Frame:</span> {activeOrder.material}
                      </span>
                      <span className="px-3 py-1.5 rounded-xl bg-white/50 backdrop-blur-md border border-white/70 text-xs font-bold text-[#2C241D] flex items-center gap-1.5 shadow-2xs">
                        <span className="text-[#5C4E42]">Upholstery/Finish:</span> {activeOrder.color}
                      </span>
                      <span className="px-3 py-1.5 rounded-xl bg-white/50 backdrop-blur-md border border-white/70 text-xs font-bold text-[#2C241D] flex items-center gap-1.5 shadow-2xs">
                        <span className="text-[#5C4E42]">Dimensions:</span> {activeOrder.dimensions}
                      </span>

                      {aspectPills.map((asp, i) => (
                        <span key={i} className="px-3 py-1.5 rounded-xl bg-[#38A132]/10 border border-[#38A132]/30 text-xs font-bold text-[#2C241D] flex items-center gap-1.5">
                          <span className="text-[#38A132]">{asp.label}:</span> {asp.value}
                        </span>
                      ))}
                    </div>

                    {/* CLEAN SPECIAL CUSTOMIZATION REQUIREMENTS */}
                    {specialNotes && specialNotes !== 'None' && (
                      <div className="mt-2 bg-white/50 backdrop-blur-md p-3.5 rounded-2xl border border-white/70 text-xs font-medium text-[#2C241D] shadow-inner">
                        <strong className="text-[#2C241D] font-extrabold flex items-center gap-1.5 mb-1">
                          📌 Special Customization Requirements:
                        </strong>
                        <span>{specialNotes}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="text-left md:text-right bg-[#FAF7F2] p-4 rounded-2xl border border-[#E2D7CB] shrink-0 space-y-2 max-w-xs">
                <span className="block text-[11px] font-bold text-[#7A6C5E] uppercase">Estimated Quotation</span>
                <span className="text-xl font-extrabold text-[#38A132] block">
                  {activeOrder.estimated_price ? `₹${activeOrder.estimated_price.toLocaleString('en-IN')}` : 'Quote Under Assessment'}
                </span>

                {activeOrder.estimated_price && activeOrder.estimated_price > 0 && !(activeOrder.payment_status === 'Paid' || activeOrder.order_status === 'Paid') && (
                  <div>
                    {activeOrder.order_status === 'Quote Provided' || activeOrder.order_status === 'QUOTATION_READY' ? (
                      <div className="space-y-2 pt-1 text-left">
                        <span className="text-[11px] font-extrabold text-amber-800 bg-amber-100 px-2.5 py-1 rounded-md block text-center">
                          Action Needed: Review & Approve Quotation
                        </span>
                        <div className="flex gap-2">
                          <button
                            onClick={async () => {
                              try {
                                await updateOrderStatus(activeOrder.custom_order_id, 'CUSTOMER_APPROVED');
                                loadUserCustomOrders();
                              } catch (e) {
                                console.error(e);
                              }
                            }}
                            className="flex-1 py-2 px-3 rounded-xl bg-[#38A132] hover:bg-[#32922D] text-white text-xs font-extrabold cursor-pointer shadow-xs text-center"
                          >
                            Approve Quote
                          </button>
                          <button
                            onClick={async () => {
                              try {
                                await updateOrderStatus(activeOrder.custom_order_id, 'CUSTOMER_REJECTED');
                                loadUserCustomOrders();
                              } catch (e) {
                                console.error(e);
                              }
                            }}
                            className="py-2 px-3 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-700 text-xs font-extrabold cursor-pointer text-center"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    ) : activeOrder.order_status === 'CUSTOMER_APPROVED' || activeOrder.order_status === 'Approved' ? (
                      <button
                        onClick={() => handleAddToCartAndPay(activeOrder)}
                        className="mt-2 w-full px-3.5 py-2 rounded-xl bg-[#38A132] hover:bg-[#32922D] text-white text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer"
                        title="Add approved custom furniture quote to cart"
                      >
                        <ShoppingCart className="w-4 h-4" />
                        <span>Add to Cart & Checkout</span>
                      </button>
                    ) : null}
                  </div>
                )}
              </div>
            </div>



            {/* Assigned Craftsmen Info */}
            {trackingInfo && trackingInfo.assigned_workers.length > 0 && (
              <div className="pt-4 border-t border-[#EFE7DE]">
                <h4 className="text-xs font-bold text-[#7A6C5E] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-[#38A132]" /> Assigned Master Craftsmen
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {trackingInfo.assigned_workers.map((w, i) => (
                    <div key={i} className="p-3 rounded-2xl bg-[#FAF7F2] border border-[#E2D7CB] flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#38A132] text-white flex items-center justify-center text-xs font-extrabold">
                        {w.worker_name.charAt(0)}
                      </div>
                      <div>
                        <div className="text-xs font-extrabold text-[#2C241D]">{w.worker_name}</div>
                        <div className="text-[10px] font-bold text-[#38A132]">{w.task_status}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CUSTOM CANCEL ORDER CONFIRMATION MODAL */}
      {cancelModalOrderId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-md bg-white border border-[#E2D7CB] rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5 text-[#2C241D]">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center mx-auto text-rose-600">
              <AlertCircle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-xl font-extrabold text-[#2C241D]">Cancel Custom Order</h3>
              <p className="text-xs text-[#7A6C5E] leading-relaxed">
                Are you sure you want to cancel this custom order request? This action will update your request status to Cancelled.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setCancelModalOrderId(null)}
                className="flex-1 py-3 px-4 rounded-xl bg-[#FAF7F2] hover:bg-[#F4ECE1] border border-[#E2D7CB] text-[#524538] font-extrabold text-xs transition-all cursor-pointer"
              >
                Keep Order
              </button>
              <button
                onClick={async () => {
                  const targetId = cancelModalOrderId;
                  setCancelModalOrderId(null);
                  if (targetId) {
                    // Instant optimistic local state update without page refresh!
                    setUserOrders(prev => prev.filter(o => o.custom_order_id !== targetId));
                    await cancelCustomOrder(targetId);
                  }
                }}
                className="flex-1 py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs transition-all shadow-md shadow-rose-600/20 cursor-pointer"
              >
                Yes, Cancel Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
