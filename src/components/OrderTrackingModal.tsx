import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Package,
  Truck,
  CheckCircle2,
  MapPin,
  Clock,
  ShieldCheck,
  ArrowRight,
  Copy,
  Check,
  Navigation,
  Box,
  AlertCircle,
} from 'lucide-react';
import { formatLKR } from '../data/catalog';

export type OrderStatusValue =
  | 'processing'
  | 'preparing'
  | 'dispatched'
  | 'in_transit'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export type OrderTrackingStageKey = 'preparing' | 'dispatched' | 'in_transit' | 'delivered';

export interface TrackableOrder {
  id: string;
  userId: string;
  orderNumber: string;
  summaryTitle: string;
  itemCount: number;
  totalAmount: number;
  paymentMethod: 'cod' | 'card_express';
  pickupHubName: string;
  status: OrderStatusValue;
  createdAtMs?: number;
  isDemoOrder?: boolean;
}

interface TimelineStageDefinition {
  key: OrderTrackingStageKey;
  stepNumber: number;
  label: 'Preparing' | 'Dispatched' | 'In Transit' | 'Delivered';
  shortSubtitle: string;
  description: string;
  facilityLocation: string;
  courierNote: string;
  progressPercent: number;
  offsetMinutes: number;
  icon: React.ComponentType<{ className?: string }>;
}

export const ORDER_TRACKING_STAGES: TimelineStageDefinition[] = [
  {
    key: 'preparing',
    stepNumber: 1,
    label: 'Preparing',
    shortSubtitle: 'Quality Check & Protective Packaging',
    description:
      'Your order has been verified. Items are undergoing multi-point quality inspection, shock-resistant bubble wrapping, and barcode labeling at the BuyKit Fulfillment Center.',
    facilityLocation: 'BuyKit Central Fulfillment Warehouse · Colombo 03',
    courierNote: 'Packing slip generated & assigned to express dispatch bay',
    progressPercent: 25,
    offsetMinutes: 0,
    icon: Box,
  },
  {
    key: 'dispatched',
    stepNumber: 2,
    label: 'Dispatched',
    shortSubtitle: 'Handed Over to BuyKit Express Logistics',
    description:
      'Your parcel has been scanned out of the primary fulfillment center and loaded onto the BuyKit Express linehaul fleet heading toward your regional hub.',
    facilityLocation: 'Colombo Primary Sorting & Dispatch Terminal',
    courierNote: 'Manifest scanned · Departed origin sorting hub',
    progressPercent: 50,
    offsetMinutes: 195,
    icon: Navigation,
  },
  {
    key: 'in_transit',
    stepNumber: 3,
    label: 'In Transit',
    shortSubtitle: 'Moving Toward Destination Hub',
    description:
      'Shipment is actively in transit along the inter-city express route and arriving at your designated regional hub for final last-mile courier dispatch.',
    facilityLocation: 'Sri Lanka Express Linehaul Corridor',
    courierNote: 'Live GPS courier telemetry active · On schedule',
    progressPercent: 75,
    offsetMinutes: 640,
    icon: Truck,
  },
  {
    key: 'delivered',
    stepNumber: 4,
    label: 'Delivered',
    shortSubtitle: 'Handed Over & Verified at Destination',
    description:
      'Package has arrived safely and been delivered to the recipient / pickup hub with digital proof of delivery confirmed.',
    facilityLocation: 'Verified Customer Destination / Pickup Hub',
    courierNote: 'Signed & verified · Eligible for 5-Star Product Review',
    progressPercent: 100,
    offsetMinutes: 1440,
    icon: CheckCircle2,
  },
];

export function mapOrderStatusToStageIndex(status: OrderStatusValue): number {
  switch (status) {
    case 'processing':
    case 'preparing':
      return 0; // Preparing
    case 'dispatched':
      return 1; // Dispatched
    case 'in_transit':
    case 'shipped':
      return 2; // In Transit
    case 'delivered':
      return 3; // Delivered
    case 'cancelled':
      return -1;
    default:
      return 0;
  }
}

export function getStageLabelFromStatus(status: OrderStatusValue): string {
  if (status === 'cancelled') return 'Cancelled';
  const idx = mapOrderStatusToStageIndex(status);
  return ORDER_TRACKING_STAGES[idx]?.label || 'Preparing';
}

interface OrderTrackingModalProps {
  isOpen: boolean;
  order: TrackableOrder | null;
  onClose: () => void;
  onUpdateOrderStage?: (
    order: TrackableOrder,
    nextStage: OrderTrackingStageKey
  ) => Promise<void>;
  onCancelOrder?: (order: TrackableOrder) => Promise<void>;
}

export const OrderTrackingModal: React.FC<OrderTrackingModalProps> = ({
  isOpen,
  order,
  onClose,
  onUpdateOrderStage,
  onCancelOrder,
}) => {
  const [selectedStageIndex, setSelectedStageIndex] = useState<number>(0);
  const [updatingStage, setUpdatingStage] = useState<boolean>(false);
  const [copiedTracking, setCopiedTracking] = useState<boolean>(false);

  useEffect(() => {
    if (!order) return;
    const mappedIdx = mapOrderStatusToStageIndex(order.status);
    setSelectedStageIndex(mappedIdx >= 0 ? mappedIdx : 0);
  }, [order?.id, order?.status]);

  if (!isOpen || !order) return null;

  const isCancelled = order.status === 'cancelled';
  const persistedStageIdx = mapOrderStatusToStageIndex(order.status);
  const activeStageIdx = isCancelled ? -1 : selectedStageIndex;
  const activeStage =
    activeStageIdx >= 0
      ? ORDER_TRACKING_STAGES[activeStageIdx]
      : ORDER_TRACKING_STAGES[0];

  const progressPercentage = isCancelled ? 0 : activeStage.progressPercent;
  const trackingCode = `BKP-LK-${order.orderNumber.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()}`;

  const baseTimestampMs = order.createdAtMs || Date.now() - 4 * 3600 * 1000;

  const formatStageTime = (offsetMinutes: number, isReached: boolean) => {
    const targetDate = new Date(baseTimestampMs + offsetMinutes * 60 * 1000);
    const formatted = targetDate.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    return isReached ? formatted : `Est. ${formatted}`;
  };

  const handleCopyTrackingCode = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(trackingCode).catch(() => {});
    }
    setCopiedTracking(true);
    window.setTimeout(() => setCopiedTracking(false), 2000);
  };

  const handleSelectOrPersistStage = async (stageIndex: number) => {
    setSelectedStageIndex(stageIndex);
    const targetStage = ORDER_TRACKING_STAGES[stageIndex];
    if (!targetStage || !onUpdateOrderStage || isCancelled) return;

    // Only write to Firestore if not a demo order and not locked in terminal state
    if (!order.isDemoOrder && order.status !== 'delivered') {
      setUpdatingStage(true);
      try {
        await onUpdateOrderStage(order, targetStage.key);
      } finally {
        setUpdatingStage(false);
      }
    }
  };

  const handleAdvanceNextStage = async () => {
    if (isCancelled) return;
    const nextIdx = Math.min(ORDER_TRACKING_STAGES.length - 1, selectedStageIndex + 1);
    await handleSelectOrPersistStage(nextIdx);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-3 backdrop-blur-xs sm:p-4"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 18 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 18 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
          className="relative max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl"
        >
          {/* Top Modal Header */}
          <div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white/95 px-6 py-4 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FFF3EB] text-[#F85606]">
                <Truck className="h-5 w-5" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span className="font-mono font-bold text-slate-900">
                    Order #{order.orderNumber}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>BuyKit Express Logistics</span>
                  {order.isDemoOrder && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="font-semibold text-[#F85606]">Interactive Demo Order</span>
                    </>
                  )}
                </div>
                <h2 className="font-display text-lg font-bold text-slate-950 sm:text-xl">
                  Real-Time Order Tracking & Delivery Timeline
                </h2>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close order tracking modal"
              className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-6 p-6">
            {/* Cancelled Banner if Order is Cancelled */}
            {isCancelled && (
              <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-800">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                <div>
                  <p className="font-bold text-red-900">
                    This Order Was Cancelled Before Dispatch
                  </p>
                  <p className="mt-0.5 text-red-700">
                    Order #{order.orderNumber} has been cancelled and no shipment is in transit.
                  </p>
                </div>
              </div>
            )}

            {/* =========================================================
                1. VISUAL PROGRESS BAR & HORIZONTAL 4-STAGE STEPPER
               ========================================================= */}
            <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 p-5 text-white shadow-sm sm:p-6">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span>Current Shipment Status</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono font-semibold text-orange-400 tabular-nums">
                      {progressPercentage}% Complete
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-2.5">
                    <h3 className="font-display text-xl font-extrabold text-white sm:text-2xl">
                      {isCancelled ? 'Order Cancelled' : activeStage.label}
                    </h3>
                    {!isCancelled && (
                      <span className="rounded-md bg-[#F85606] px-2.5 py-0.5 font-mono text-xs font-bold text-white">
                        Stage {activeStage.stepNumber} of 4
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-slate-300">
                    {isCancelled
                      ? 'Shipment halted prior to courier handover.'
                      : activeStage.shortSubtitle}
                  </p>
                </div>

                {/* Tracking Number Copy Box */}
                <div className="flex flex-col items-start rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 sm:items-end">
                  <span className="text-[11px] text-slate-400">Waybill / Tracking Number</span>
                  <div className="mt-0.5 flex items-center gap-2">
                    <span className="font-mono text-xs font-bold tracking-wider text-white tabular-nums">
                      {trackingCode}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyTrackingCode}
                      className="inline-flex items-center gap-1 rounded-md bg-white/10 px-2 py-1 text-[11px] font-medium text-slate-200 transition-colors hover:bg-white/20"
                    >
                      {copiedTracking ? (
                        <>
                          <Check className="h-3 w-3 text-emerald-400" />
                          <span className="text-emerald-300">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Animated Progress Bar Track */}
              <div className="mt-6">
                <div className="relative h-3 w-full overflow-hidden rounded-full bg-slate-800 p-0.5">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercentage}%` }}
                    transition={{ duration: 0.45, ease: 'easeOut' }}
                    className={`h-full rounded-full ${
                      isCancelled
                        ? 'bg-red-500'
                        : progressPercentage === 100
                        ? 'bg-gradient-to-r from-[#F85606] via-amber-500 to-emerald-500'
                        : 'bg-gradient-to-r from-[#F85606] to-[#FFB800]'
                    }`}
                  />
                </div>

                {/* 4 Stage Stepper Nodes Below Progress Bar */}
                <div className="mt-4 grid grid-cols-4 gap-2">
                  {ORDER_TRACKING_STAGES.map((stage, idx) => {
                    const StageIcon = stage.icon;
                    const isCompleted = !isCancelled && idx < activeStageIdx;
                    const isCurrent = !isCancelled && idx === activeStageIdx;
                    const isReached = isCompleted || isCurrent;

                    return (
                      <button
                        key={stage.key}
                        type="button"
                        disabled={isCancelled || updatingStage}
                        onClick={() => handleSelectOrPersistStage(idx)}
                        className={`group flex flex-col items-center rounded-xl border p-2.5 text-center transition-all ${
                          isCurrent
                            ? 'border-[#F85606] bg-[#F85606]/20 text-white shadow-xs'
                            : isCompleted
                            ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20'
                            : 'border-white/10 bg-white/5 text-slate-400 hover:border-white/25 hover:text-slate-200'
                        }`}
                      >
                        <div
                          className={`mb-1.5 flex h-8 w-8 items-center justify-center rounded-lg transition-transform group-hover:scale-105 ${
                            isCurrent
                              ? 'bg-[#F85606] text-white'
                              : isCompleted
                              ? 'bg-emerald-500 text-white'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {isCompleted ? (
                            <CheckCircle2 className="h-4 w-4" />
                          ) : (
                            <StageIcon className="h-4 w-4" />
                          )}
                        </div>
                        <span className="text-xs font-bold whitespace-nowrap">
                          {stage.label}
                        </span>
                        <span className="mt-0.5 font-mono text-[10px] opacity-75 tabular-nums">
                          {isReached ? `${stage.progressPercent}%` : `Step ${stage.stepNumber}`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Interactive Stage Controls Bar */}
              {!isCancelled && (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-3.5 text-xs">
                  <span className="text-slate-300">
                    Click any stage above to inspect or simulate live shipment progress:
                  </span>
                  <div className="flex items-center gap-2">
                    {selectedStageIndex < ORDER_TRACKING_STAGES.length - 1 ? (
                      <button
                        type="button"
                        disabled={updatingStage}
                        onClick={handleAdvanceNextStage}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#F85606] px-3.5 py-1.5 text-xs font-bold text-white transition-colors hover:bg-[#d94800] disabled:opacity-50"
                      >
                        <span>
                          {updatingStage
                            ? 'Updating...'
                            : `Advance to "${ORDER_TRACKING_STAGES[selectedStageIndex + 1].label}"`}
                        </span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1 font-semibold text-emerald-400">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>All 4 Delivery Stages Completed (100%)</span>
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* =========================================================
                2. VERTICAL TIMELINE COMPONENT ('Preparing' -> 'Dispatched' -> 'In Transit' -> 'Delivered')
               ========================================================= */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="font-display text-base font-bold text-slate-950">
                    Shipment Milestone Timeline
                  </h3>
                  <p className="text-xs text-slate-500">
                    Step-by-step checkpoint log from BuyKit warehouse to {order.pickupHubName}
                  </p>
                </div>
                <span className="font-mono text-xs text-slate-500 tabular-nums">
                  Destination: <strong className="text-slate-900">{order.pickupHubName}</strong>
                </span>
              </div>

              <div className="relative space-y-0">
                {ORDER_TRACKING_STAGES.map((stage, idx) => {
                  const StageIcon = stage.icon;
                  const isCompleted = !isCancelled && idx < activeStageIdx;
                  const isCurrent = !isCancelled && idx === activeStageIdx;
                  const isUpcoming = isCancelled || idx > activeStageIdx;
                  const isLast = idx === ORDER_TRACKING_STAGES.length - 1;

                  const dynamicLocation =
                    stage.key === 'in_transit'
                      ? `En Route to ${order.pickupHubName}`
                      : stage.key === 'delivered'
                      ? `${order.pickupHubName} · Customer Handover`
                      : stage.facilityLocation;

                  return (
                    <div
                      key={stage.key}
                      onClick={() => {
                        if (!isCancelled) handleSelectOrPersistStage(idx);
                      }}
                      className={`group relative flex gap-4 pb-7 ${
                        !isCancelled ? 'cursor-pointer' : ''
                      } ${isLast ? 'pb-0' : ''}`}
                    >
                      {/* Vertical Timeline Connector Line */}
                      {!isLast && (
                        <div
                          className="absolute top-10 left-5 -ml-px h-[calc(100%-2rem)] w-0.5 bg-slate-200"
                          aria-hidden="true"
                        >
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{
                              height: isCompleted ? '100%' : isCurrent ? '50%' : '0%',
                            }}
                            transition={{ duration: 0.35 }}
                            className={`w-full ${
                              isCompleted ? 'bg-emerald-500' : 'bg-[#F85606]'
                            }`}
                          />
                        </div>
                      )}

                      {/* Timeline Node Circle */}
                      <div
                        className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 transition-all ${
                          isCurrent
                            ? 'border-[#F85606] bg-[#F85606] text-white shadow-md ring-4 ring-orange-100'
                            : isCompleted
                            ? 'border-emerald-600 bg-emerald-600 text-white'
                            : 'border-slate-200 bg-slate-50 text-slate-400'
                        }`}
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="h-5 w-5" />
                        ) : (
                          <StageIcon className="h-5 w-5" />
                        )}
                      </div>

                      {/* Timeline Card Body */}
                      <div
                        className={`min-w-0 flex-1 rounded-xl border p-4 transition-all ${
                          isCurrent
                            ? 'border-[#F85606] bg-[#FFF8F5] shadow-2xs'
                            : isCompleted
                            ? 'border-emerald-200/80 bg-emerald-50/30'
                            : 'border-slate-200 bg-slate-50/60 opacity-75'
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-slate-400 tabular-nums">
                              0{stage.stepNumber}
                            </span>
                            <h4 className="font-display text-base font-bold text-slate-950">
                              {stage.label}
                            </h4>
                            <span aria-hidden="true" className="text-slate-300">
                              ·
                            </span>
                            <span
                              className={`text-xs font-semibold ${
                                isCurrent
                                  ? 'text-[#F85606]'
                                  : isCompleted
                                  ? 'text-emerald-700'
                                  : 'text-slate-500'
                              }`}
                            >
                              {isCurrent
                                ? 'Current Active Stage'
                                : isCompleted
                                ? 'Completed'
                                : 'Pending'}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 font-mono text-xs text-slate-500 tabular-nums">
                            <Clock className="h-3.5 w-3.5 text-slate-400" />
                            <span>{formatStageTime(stage.offsetMinutes, !isUpcoming)}</span>
                          </div>
                        </div>

                        <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                          {stage.description}
                        </p>

                        <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-200/70 pt-2 text-[11px] text-slate-500">
                          <span className="inline-flex items-center gap-1 font-medium text-slate-700">
                            <MapPin className="h-3.5 w-3.5 text-[#F85606]" />
                            {dynamicLocation}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{stage.courierNote}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* =========================================================
                3. ORDER SUMMARY & DISPATCH HUB METADATA
               ========================================================= */}
            <div className="grid grid-cols-1 gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-3">
              <div className="space-y-1">
                <span className="text-[11px] font-medium text-slate-500">Ordered Package</span>
                <p className="line-clamp-2 text-xs font-bold text-slate-900">
                  {order.summaryTitle}
                </p>
                <p className="font-mono text-[11px] text-slate-500 tabular-nums">
                  {order.itemCount} {order.itemCount === 1 ? 'Item' : 'Items'} · Verified Authentic
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-medium text-slate-500">
                  Delivery / Pickup Hub
                </span>
                <p className="flex items-center gap-1 text-xs font-bold text-slate-900">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-[#F85606]" />
                  <span className="truncate">{order.pickupHubName}</span>
                </p>
                <p className="text-[11px] text-emerald-700 font-medium">
                  Islandwide Express Courier Insured
                </p>
              </div>

              <div className="flex flex-col justify-between sm:items-end">
                <div>
                  <span className="text-[11px] font-medium text-slate-500">
                    {order.paymentMethod === 'cod'
                      ? 'Cash on Delivery (LKR)'
                      : 'Online Card Paid (LKR)'}
                  </span>
                  <p className="font-mono text-base font-extrabold text-[#F85606] tabular-nums sm:text-right">
                    {formatLKR(order.totalAmount)}
                  </p>
                </div>

                {!order.isDemoOrder &&
                  (order.status === 'processing' || order.status === 'preparing') &&
                  onCancelOrder && (
                    <button
                      type="button"
                      onClick={() => onCancelOrder(order)}
                      className="mt-2 rounded-lg border border-red-200 bg-white px-3 py-1 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50"
                    >
                      Cancel Order
                    </button>
                  )}
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-6 py-3.5">
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>
                BuyKit Buyer Protection · 100% On-Time Delivery Guarantee
              </span>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-bold text-white transition-colors hover:bg-slate-800"
            >
              Done
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
