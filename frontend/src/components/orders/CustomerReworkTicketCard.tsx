import React from 'react';
import { 
  Wrench, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Truck, 
  CreditCard, 
  Check, 
  X, 
  Loader2
} from 'lucide-react';
import { ReworkTicketItem } from '../../services/api_quality';

interface CustomerReworkTicketCardProps {
  ticket: ReworkTicketItem;
  onApproveQuotation?: (ticketId: number) => void;
  onDeclineQuotation?: (ticketId: number) => void;
  onPayQuotation?: (ticket: ReworkTicketItem) => void;
  actionLoading?: boolean;
}

export const CustomerReworkTicketCard: React.FC<CustomerReworkTicketCardProps> = ({
  ticket,
  onApproveQuotation,
  onDeclineQuotation,
  onPayQuotation,
  actionLoading = false
}) => {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
      case 'UNDER_ASSESSMENT':
        return { label: 'Under Assessment', bg: 'bg-amber-50 text-amber-800 border-amber-200' };
      case 'AWAITING_CUSTOMER_DECISION':
        return { label: 'Awaiting Your Approval', bg: 'bg-purple-50 text-purple-800 border-purple-200' };
      case 'AWAITING_PICKUP':
        return { label: 'Awaiting Pickup / Receipt', bg: 'bg-blue-50 text-blue-800 border-blue-200' };
      case 'RECEIVED_AT_STORE':
        return { label: 'Received at Workshop', bg: 'bg-indigo-50 text-indigo-800 border-indigo-200' };
      case 'REWORK_IN_PROGRESS':
        return { label: 'Artisan Rework In Progress', bg: 'bg-amber-50 text-amber-800 border-amber-200' };
      case 'REWORK_COMPLETED':
      case 'QC_PENDING':
        return { label: 'Repeat QC Inspection Pending', bg: 'bg-blue-50 text-blue-800 border-blue-200' };
      case 'QC_PASSED':
      case 'READY_FOR_DISPATCH':
        return { label: 'Repeat QC Passed ✓ Ready', bg: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
      case 'DISPATCHED':
        return { label: 'Dispatched for Redelivery', bg: 'bg-teal-50 text-teal-800 border-teal-200' };
      case 'CLOSED':
        return { label: 'Resolved & Closed', bg: 'bg-slate-50 text-slate-700 border-slate-200' };
      default:
        return { label: status, bg: 'bg-stone-50 text-stone-800 border-stone-200' };
    }
  };

  const statusBadge = getStatusBadge(ticket.status);

  return (
    <div className="bg-[#FAF7F2] border-2 border-amber-300 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4 animate-fadeIn">
      {/* Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2D7CB] pb-3">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="p-1.5 rounded-lg bg-amber-500 text-white shadow-xs">
            <Wrench className="w-4 h-4" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-black text-xs text-[#2C241D] tracking-wider">
                {ticket.ticket_code}
              </span>
              <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${statusBadge.bg}`}>
                {statusBadge.label}
              </span>
            </div>
            <p className="text-[10px] text-[#7A6350] font-medium mt-0.5">
              Quality Rework Ticket • Initiated: {ticket.created_at ? new Date(ticket.created_at).toLocaleDateString() : 'Recent'}
            </p>
          </div>
        </div>

        {/* Issue Category Tag */}
        {ticket.issue_category && (
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-xl bg-white border border-[#E2D7CB] text-[#2C241D]">
            Category: {ticket.issue_category}
          </span>
        )}
      </div>

      {/* Reported Defect / Modification */}
      <div className="text-xs bg-white p-3 rounded-xl border border-[#E2D7CB]/80 space-y-1">
        <span className="text-[10px] font-black uppercase text-[#7A6350] tracking-wider block">
          Reported Defect / Customer Request:
        </span>
        <p className="font-bold text-[#2C241D]">{ticket.defect_description || ticket.rework_reason}</p>
        {ticket.evidence_photo_url && (
          <div className="mt-2">
            <a 
              href={ticket.evidence_photo_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-[11px] font-bold text-amber-700 hover:underline inline-flex items-center gap-1"
            >
              📷 View Customer Evidence Photo
            </a>
          </div>
        )}
      </div>

      {/* Responsibility Assessment & Outcome */}
      {ticket.responsibility === 'RETAILSPHERE_ERROR' && (
        <div className="p-3.5 bg-emerald-50/80 border border-emerald-300 rounded-xl space-y-2">
          <div className="flex items-center gap-2 text-emerald-900 font-black text-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>RetailSphere Responsibility Verified (100% Free Warranty Rework)</span>
          </div>
          <p className="text-xs text-emerald-800 font-medium">
            Our quality engineers audited your piece against the approved specifications and confirmed a workshop production discrepancy. 
            <strong> All rework labour, materials, and pickup/redelivery are completely free of charge (₹0).</strong>
          </p>
          <div className="flex items-center gap-2 text-[11px] font-bold text-emerald-900 bg-white/70 p-2 rounded-lg border border-emerald-200">
            <Truck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Transportation: Free Internal Fleet Pickup & Redelivery Arranged</span>
          </div>
        </div>
      )}

      {ticket.responsibility === 'CUSTOMER_CHANGE' && (
        <div className="p-3.5 bg-purple-50/80 border border-purple-300 rounded-xl space-y-3">
          <div className="flex items-center gap-2 text-purple-900 font-black text-xs">
            <Wrench className="w-4 h-4 text-purple-600" />
            <span>Customer-Requested Modification</span>
          </div>
          <p className="text-xs text-purple-800 font-medium">
            The originally delivered item matched the approved specifications. RetailSphere is happy to accommodate your requested modifications and adjustments!
          </p>

          {/* Itemized Quotation Breakdown if available */}
          {ticket.itemized_quotation && (
            <div className="bg-white p-3 rounded-xl border border-purple-200 space-y-2 text-xs">
              <span className="text-[10px] font-black uppercase text-purple-900 tracking-wider block">
                Itemized Modification Quotation
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                <div className="p-2 bg-purple-50/50 rounded-lg">
                  <span className="text-[#7A6350] block text-[10px]">Material Cost</span>
                  <span className="font-bold text-[#2C241D]">₹{ticket.itemized_quotation.material_cost?.toLocaleString() || 0}</span>
                </div>
                <div className="p-2 bg-purple-50/50 rounded-lg">
                  <span className="text-[#7A6350] block text-[10px]">Artisan Labour</span>
                  <span className="font-bold text-[#2C241D]">₹{ticket.itemized_quotation.labour_cost?.toLocaleString() || 0}</span>
                </div>
                <div className="p-2 bg-purple-50/50 rounded-lg">
                  <span className="text-[#7A6350] block text-[10px]">Machine / Tooling</span>
                  <span className="font-bold text-[#2C241D]">₹{ticket.itemized_quotation.machine_cost?.toLocaleString() || 0}</span>
                </div>
                <div className="p-2 bg-purple-50/50 rounded-lg">
                  <span className="text-[#7A6350] block text-[10px]">Transportation</span>
                  <span className="font-bold text-[#2C241D]">₹{ticket.itemized_quotation.transportation_cost?.toLocaleString() || 0}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-purple-100 flex items-center justify-between font-black text-xs">
                <span className="text-[#2C241D]">Total Modification Estimate:</span>
                <span className="text-base text-purple-800">₹{(ticket.additional_cost || 0).toLocaleString()}</span>
              </div>
            </div>
          )}

          {/* Action: Customer Decision Needed */}
          {ticket.status === 'AWAITING_CUSTOMER_DECISION' && onApproveQuotation && onDeclineQuotation && (
            <div className="bg-white p-3 rounded-xl border border-purple-200 space-y-2">
              <p className="text-xs font-bold text-[#2C241D]">
                Would you like to approve this quotation and proceed with the modification work?
              </p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => onApproveQuotation(ticket.id || ticket.rework_id)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Approve Quotation</span>
                </button>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => onDeclineQuotation(ticket.id || ticket.rework_id)}
                  className="px-4 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Decline</span>
                </button>
              </div>
            </div>
          )}

          {/* Action: Payment Required */}
          {ticket.customer_decision === 'APPROVED' && ticket.payment_status !== 'PAID' && onPayQuotation && (
            <div className="bg-white p-3 rounded-xl border border-amber-300 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black text-[#2C241D]">Quotation Approved ✓</p>
                <p className="text-[11px] text-[#7A6350]">
                  Payment of ₹{(ticket.additional_cost || 0).toLocaleString()} is required before workshop artisans can begin rework.
                </p>
              </div>
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => onPayQuotation(ticket)}
                className="px-4 py-2 bg-[#38A132] hover:bg-[#2E8529] text-white text-xs font-black rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
              >
                {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CreditCard className="w-3.5 h-3.5" />}
                <span>Pay ₹{(ticket.additional_cost || 0).toLocaleString()}</span>
              </button>
            </div>
          )}

          {ticket.payment_status === 'PAID' && (
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Payment Confirmed ({ticket.payment_reference || 'Online'}). Workshop work authorized.</span>
            </div>
          )}

          <div className="text-[11px] font-bold text-[#7A6350]">
            Transportation Arrangement: <span className="text-[#2C241D]">{ticket.pickup_dropoff_arranged || 'Store Drop-off / Carrier'}</span>
          </div>
        </div>
      )}

      {ticket.responsibility === 'UNCLEAR_DISPUTED' && (
        <div className="p-3.5 bg-amber-50/80 border border-amber-300 rounded-xl space-y-1.5">
          <div className="flex items-center gap-2 text-amber-900 font-black text-xs">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>Under Supervisor Technical Review</span>
          </div>
          <p className="text-xs text-amber-800 font-medium">
            Our quality engineering supervisor is comparing your submitted photos with the signed design blueprint and stage inspection records. 
            You will not be charged or penalized while this verification is underway.
          </p>
        </div>
      )}

      {/* Progress / Status Callout */}
      {ticket.status === 'REWORK_IN_PROGRESS' && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-2 text-xs text-blue-900 font-bold">
          <Wrench className="w-4 h-4 text-blue-600 animate-pulse" />
          <span>Assigned Artisan: {ticket.assigned_worker_name || 'Workshop Team'}. Defect rectification is underway.</span>
        </div>
      )}

      {(ticket.status === 'QC_PENDING' || ticket.status === 'REWORK_COMPLETED') && (
        <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center gap-2 text-xs text-indigo-900 font-bold">
          <Clock className="w-4 h-4 text-indigo-600" />
          <span>Rework finished on the factory floor. Awaiting Repeat Quality Inspection by Retail Staff.</span>
        </div>
      )}

      {(ticket.status === 'QC_PASSED' || ticket.status === 'READY_FOR_DISPATCH') && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center gap-2 text-xs text-emerald-900 font-black">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Repeat Quality Inspection Passed ✓! Your item is packed and ready for redelivery.</span>
        </div>
      )}

      {ticket.status === 'DISPATCHED' && (
        <div className="p-3 bg-teal-50 border border-teal-300 rounded-xl flex items-center gap-2 text-xs text-teal-900 font-bold">
          <Truck className="w-4 h-4 text-teal-600" />
          <span>Out for delivery / Redelivered to your location.</span>
        </div>
      )}
    </div>
  );
};
