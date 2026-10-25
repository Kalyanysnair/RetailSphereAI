import React, { useState } from 'react';
import { 
  X, 
  Wrench, 
  AlertCircle, 
  Truck, 
  MapPin, 
  Loader2, 
  CheckCircle2, 
  ShieldCheck 
} from 'lucide-react';
import { createCustomerReworkRequestApi } from '../../services/api_quality';

interface CustomerReworkRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderType: 'CUSTOM' | 'FABRICATION';
  orderId: number;
  itemTitle: string;
  approvedSpecs: string;
  onSubmitted: () => void;
}

export const CustomerReworkRequestModal: React.FC<CustomerReworkRequestModalProps> = ({
  isOpen,
  onClose,
  orderType,
  orderId,
  itemTitle,
  approvedSpecs,
  onSubmitted
}) => {
  const [issueCategory, setIssueCategory] = useState('Dimensions / Sizing Mismatch');
  const [defectDescription, setDefectDescription] = useState('');
  const [evidencePhotoUrl, setEvidencePhotoUrl] = useState('');
  const [transportationPreference, setTransportationPreference] = useState<'STORE_DROPOFF' | 'CARRIER_PARTNER'>('STORE_DROPOFF');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const desc = defectDescription.trim();
    if (desc.length < 10) {
      setErrorMsg('Please describe the issue or modification in detail (at least 10 characters).');
      return;
    }

    if (evidencePhotoUrl.trim() && !/^https?:\/\//i.test(evidencePhotoUrl.trim()) && !evidencePhotoUrl.startsWith('data:image/')) {
      setErrorMsg('Please enter a valid photo URL (starting with http:// or https://)');
      return;
    }

    setIsSubmitting(true);
    try {
      await createCustomerReworkRequestApi({
        order_type: orderType,
        order_id: orderId,
        defect_description: desc,
        issue_category: issueCategory,
        evidence_photo_url: evidencePhotoUrl.trim() || undefined,
        transportation_preference: transportationPreference
      });
      onSubmitted();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit rework request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg bg-white border border-[#E2D7CB] rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 text-[#2C241D] max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[#EFE7DE] pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-700 border border-amber-200">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-[#2C241D]">
                Request Quality Rework / Issue Resolution
              </h3>
              <p className="text-xs text-[#7A6C5E] font-medium">
                {orderType === 'CUSTOM' ? 'Custom Build Order' : 'Fabrication Request'} #{orderId} — {itemTitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#9E9082] hover:text-[#2C241D] hover:bg-[#FAF7F2] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Approved Specifications Reference Box */}
        <div className="bg-[#FAF7F2] p-3.5 rounded-2xl border border-[#E2D7CB] space-y-1">
          <span className="text-[10px] font-black uppercase text-[#7A6350] tracking-wider block">
            Approved Blueprint Specifications (Reference)
          </span>
          <p className="text-xs font-bold text-[#2C241D] line-clamp-3">
            {approvedSpecs || 'Standard approved factory tolerances and custom order specifications.'}
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 text-xs text-rose-800 bg-rose-50 border border-rose-300 rounded-2xl font-bold flex items-center gap-2 animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-semibold">
          {/* Issue Category */}
          <div>
            <label className="block text-[11px] font-extrabold uppercase text-[#7A6C5E] mb-1.5">
              Issue Classification
            </label>
            <select
              value={issueCategory}
              onChange={(e) => setIssueCategory(e.target.value)}
              className="w-full p-3 rounded-xl border border-[#E2D7CB] bg-[#FAF7F2] font-bold text-xs text-[#2C241D] focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value="Dimensions / Sizing Mismatch">Dimensions / Sizing Mismatch</option>
              <option value="Finish / Surface Quality Defect">Finish / Colour / Surface Quality Defect</option>
              <option value="Material Grade Discrepancy">Material Type or Grade Discrepancy</option>
              <option value="Structural Assembly / Stability Fault">Structural Assembly / Stability / Joints Fault</option>
              <option value="Customer Modification / Specification Change">Customer-Requested Modification (Design/Specs Change)</option>
              <option value="Other / Workmanship">Other / Workmanship Concern</option>
            </select>
          </div>

          {/* Defect Description */}
          <div>
            <label className="block text-[11px] font-extrabold uppercase text-[#7A6C5E] mb-1.5">
              Detailed Description of Issue or Requested Change *
            </label>
            <textarea
              rows={4}
              value={defectDescription}
              onChange={(e) => setDefectDescription(e.target.value)}
              placeholder="Explain exactly what is misaligned or what modification you require..."
              className="w-full p-3 rounded-xl border border-[#E2D7CB] bg-[#FAF7F2] font-semibold text-xs text-[#2C241D] focus:outline-none focus:ring-1 focus:ring-amber-500"
              required
            />
          </div>

          {/* Evidence Photo URL */}
          <div>
            <label className="block text-[11px] font-extrabold uppercase text-[#7A6C5E] mb-1.5">
              Photo Evidence Link (Optional but Recommended)
            </label>
            <input
              type="text"
              value={evidencePhotoUrl}
              onChange={(e) => setEvidencePhotoUrl(e.target.value)}
              placeholder="https://images.unsplash.com/... or hosted image URL"
              className="w-full p-3 rounded-xl border border-[#E2D7CB] bg-[#FAF7F2] text-xs font-medium focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          {/* Transportation Options */}
          <div>
            <label className="block text-[11px] font-extrabold uppercase text-[#7A6C5E] mb-1.5">
              Transportation Arrangement (If physical rework needed)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label 
                className={`p-3 rounded-xl border cursor-pointer flex flex-col gap-1 transition-all ${
                  transportationPreference === 'STORE_DROPOFF'
                    ? 'border-amber-500 bg-amber-50/50 text-[#2C241D]'
                    : 'border-[#E2D7CB] bg-white text-[#7A6350]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="transport_pref"
                    checked={transportationPreference === 'STORE_DROPOFF'}
                    onChange={() => setTransportationPreference('STORE_DROPOFF')}
                    className="text-amber-600 focus:ring-amber-500"
                  />
                  <span className="font-extrabold text-xs text-[#2C241D] flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-amber-600" />
                    <span>Store Drop-off</span>
                  </span>
                </div>
                <span className="text-[10px] pl-5 text-[#7A6350]">
                  Bring item directly to RetailSphere Store counter
                </span>
              </label>

              <label 
                className={`p-3 rounded-xl border cursor-pointer flex flex-col gap-1 transition-all ${
                  transportationPreference === 'CARRIER_PARTNER'
                    ? 'border-amber-500 bg-amber-50/50 text-[#2C241D]'
                    : 'border-[#E2D7CB] bg-white text-[#7A6350]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="transport_pref"
                    checked={transportationPreference === 'CARRIER_PARTNER'}
                    onChange={() => setTransportationPreference('CARRIER_PARTNER')}
                    className="text-amber-600 focus:ring-amber-500"
                  />
                  <span className="font-extrabold text-xs text-[#2C241D] flex items-center gap-1">
                    <Truck className="w-3.5 h-3.5 text-amber-600" />
                    <span>Carrier Partner Pickup</span>
                  </span>
                </div>
                <span className="text-[10px] pl-5 text-[#7A6350]">
                  Doorstep courier pickup (BlueDart / Delhivery)
                </span>
              </label>
            </div>
          </div>

          {/* Warranty & Assessment Reassurance Policy */}
          <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <p className="text-[11px] text-emerald-800 font-medium">
              <strong>Quality Guarantee:</strong> Our Retail Quality Engineering team assesses every case against the approved specs. 
              If the discrepancy is due to a RetailSphere manufacturing error, rework, pickup, and redelivery are <strong>100% free under warranty</strong>.
            </p>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 flex items-center justify-end gap-3 border-t border-[#EFE7DE]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-[#E2D7CB] text-[#7A6C5E] font-bold hover:bg-[#FAF7F2] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-extrabold rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Submitting Ticket...</span>
                </>
              ) : (
                <>
                  <Wrench className="w-3.5 h-3.5" />
                  <span>Submit Rework Request</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
