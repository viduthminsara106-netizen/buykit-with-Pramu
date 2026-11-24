import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bell,
  X,
  Truck,
  Ticket,
  MessageSquare,
  CheckCheck,
  Trash2,
  Package,
  Heart,
  Sparkles,
  ChevronRight,
  Clock,
  ShoppingBag,
  AlertCircle,
} from 'lucide-react';
import {
  UserNotificationRecord,
  UserNotificationCategory,
} from '../firebase';
import { resolveAssetUrl } from '../utils/assetResolver';

interface DarazAliNotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: UserNotificationRecord[];
  isSignedIn: boolean;
  onSignIn: () => void;
  onMarkAsRead: (notification: UserNotificationRecord) => void;
  onMarkAllAsRead: () => void;
  onDeleteNotification: (notification: UserNotificationRecord) => void;
  onClearReadNotifications: () => void;
  onNotificationAction: (notification: UserNotificationRecord) => void;
}

type FilterTab = 'all' | 'orders' | 'promos' | 'activity';

function formatRelativeTime(timestampMs: number): string {
  const diffSec = Math.max(0, Math.floor((Date.now() - timestampMs) / 1000));
  if (diffSec < 45) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(timestampMs).toLocaleDateString('en-LK', {
    month: 'short',
    day: 'numeric',
  });
}

function getActionLabel(actionType: UserNotificationRecord['actionType']): string | null {
  switch (actionType) {
    case 'open_order':
      return 'Track Order';
    case 'open_product':
      return 'View Product';
    case 'open_coupons':
      return 'View Vouchers';
    case 'open_deals':
      return 'Explore Deals';
    case 'open_cart':
      return 'Open Cart';
    default:
      return null;
  }
}

export const DarazAliNotificationCenter: React.FC<DarazAliNotificationCenterProps> = ({
  isOpen,
  onClose,
  notifications,
  isSignedIn,
  onSignIn,
  onMarkAsRead,
  onMarkAllAsRead,
  onDeleteNotification,
  onClearReadNotifications,
  onNotificationAction,
}) => {
  const [activeTab, setActiveTab] = useState<FilterTab>('all');

  const counts = useMemo(() => {
    const unreadAll = notifications.filter((n) => !n.read).length;
    const unreadOrders = notifications.filter((n) => !n.read && n.category === 'orders').length;
    const unreadPromos = notifications.filter((n) => !n.read && n.category === 'promos').length;
    const unreadActivity = notifications.filter(
      (n) => !n.read && (n.category === 'activity' || n.category === 'system')
    ).length;
    const readCount = notifications.filter((n) => n.read).length;
    return { unreadAll, unreadOrders, unreadPromos, unreadActivity, readCount };
  }, [notifications]);

  const visibleNotifications = useMemo(() => {
    if (activeTab === 'all') return notifications;
    if (activeTab === 'orders') return notifications.filter((n) => n.category === 'orders');
    if (activeTab === 'promos') return notifications.filter((n) => n.category === 'promos');
    return notifications.filter((n) => n.category === 'activity' || n.category === 'system');
  }, [notifications, activeTab]);

  const renderEventIcon = (notif: UserNotificationRecord) => {
    if (notif.imageUrl) {
      return (
        <img
          src={resolveAssetUrl(notif.imageUrl)}
          alt={notif.title}
          referrerPolicy="no-referrer"
          className="h-12 w-12 shrink-0 rounded-xl border border-slate-200 bg-slate-50 object-cover"
        />
      );
    }

    switch (notif.eventType) {
      case 'order_placed':
      case 'order_preparing':
        return (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#FFF3EB] text-[#F85606]">
            <Package className="h-5 w-5" />
          </div>
        );
      case 'order_dispatched':
      case 'order_in_transit':
      case 'order_shipped':
        return (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <Truck className="h-5 w-5" />
          </div>
        );
      case 'order_delivered':
        return (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <CheckCheck className="h-5 w-5" />
          </div>
        );
      case 'order_cancelled':
        return (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
            <AlertCircle className="h-5 w-5" />
          </div>
        );
      case 'voucher_claimed':
      case 'flash_sale':
        return (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <Ticket className="h-5 w-5" />
          </div>
        );
      case 'wishlist_saved':
        return (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-500">
            <Heart className="h-5 w-5" />
          </div>
        );
      case 'question_answered':
      case 'review_posted':
        return (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <MessageSquare className="h-5 w-5" />
          </div>
        );
      default:
        return (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-[#F85606]">
            <Sparkles className="h-5 w-5" />
          </div>
        );
    }
  };

  const getCategoryLabel = (cat: UserNotificationCategory) => {
    switch (cat) {
      case 'orders':
        return 'Orders & Logistics';
      case 'promos':
        return 'Promos & Vouchers';
      case 'activity':
        return 'Activity';
      default:
        return 'BuyKit Updates';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Notification Center"
          className="fixed inset-0 z-[125] flex justify-end bg-slate-950/50 backdrop-blur-[2px]"
          onClick={onClose}
        >
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="flex h-full w-full max-w-md flex-col bg-[#F5F5F7] shadow-2xl"
          >
            {/* 1. DARAZ / ALIEXPRESS ORANGE NOTIFICATION HEADER */}
            <div className="shrink-0 bg-gradient-to-r from-[#F85606] via-[#ff6a00] to-[#e64600] px-4 py-4 text-white">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15">
                    <Bell className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="font-display text-base font-extrabold tracking-tight text-white">
                      Notifications
                    </h2>
                    <p className="text-[11px] text-orange-100">
                      {counts.unreadAll > 0
                        ? `${counts.unreadAll} unread ${counts.unreadAll === 1 ? 'message' : 'messages'}`
                        : 'You are all caught up'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {counts.unreadAll > 0 && (
                    <button
                      type="button"
                      onClick={onMarkAllAsRead}
                      title="Mark all as read"
                      className="inline-flex items-center gap-1 rounded-lg bg-white/15 px-2.5 py-1.5 text-[11px] font-bold text-white transition-colors hover:bg-white/25 whitespace-nowrap"
                    >
                      <CheckCheck className="h-3.5 w-3.5" />
                      <span>Read All</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close notifications"
                    className="rounded-lg bg-black/15 p-1.5 text-white transition-colors hover:bg-black/30"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* 2. DARAZ / ALIEXPRESS 4-CATEGORY CHANNEL STRIP */}
              <div className="mt-3.5 grid grid-cols-4 gap-1.5">
                {(
                  [
                    { id: 'all', label: 'All', icon: Bell, unread: counts.unreadAll },
                    { id: 'orders', label: 'Orders', icon: Truck, unread: counts.unreadOrders },
                    { id: 'promos', label: 'Promos', icon: Ticket, unread: counts.unreadPromos },
                    { id: 'activity', label: 'Activity', icon: MessageSquare, unread: counts.unreadActivity },
                  ] as const
                ).map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`relative flex flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-center transition-colors ${
                        isActive
                          ? 'bg-white text-[#F85606] shadow-xs'
                          : 'bg-black/15 text-white hover:bg-black/25'
                      }`}
                    >
                      <div className="relative">
                        <Icon className="h-4 w-4" />
                        {tab.unread > 0 && (
                          <span
                            className={`absolute -top-1.5 -right-2.5 flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 font-mono text-[9px] font-extrabold tabular-nums ${
                              isActive
                                ? 'bg-[#F85606] text-white'
                                : 'bg-amber-300 text-slate-950'
                            }`}
                          >
                            {tab.unread > 99 ? '99+' : tab.unread}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] font-bold">{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Guest Sync Banner */}
            {!isSignedIn && (
              <div className="flex items-center justify-between gap-2 border-b border-orange-200 bg-[#FFF5F0] px-4 py-2.5 text-xs">
                <span className="text-slate-700">
                  Sign in to sync real-time order & courier alerts across devices.
                </span>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onSignIn();
                  }}
                  className="shrink-0 rounded-lg bg-[#F85606] px-2.5 py-1 text-[11px] font-bold text-white hover:bg-[#d94800] whitespace-nowrap"
                >
                  Sign In
                </button>
              </div>
            )}

            {/* Utility Bar */}
            {notifications.length > 0 && (
              <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2 text-[11px] text-slate-500">
                <span className="font-mono tabular-nums">
                  {visibleNotifications.length}{' '}
                  {visibleNotifications.length === 1 ? 'notification' : 'notifications'}
                </span>
                {counts.readCount > 0 && (
                  <button
                    type="button"
                    onClick={onClearReadNotifications}
                    className="font-semibold text-slate-600 transition-colors hover:text-red-600"
                  >
                    Clear Read ({counts.readCount})
                  </button>
                )}
              </div>
            )}

            {/* 3. SCROLLABLE NOTIFICATION FEED */}
            <div className="flex-1 overflow-y-auto p-3">
              {visibleNotifications.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center px-6 py-12 text-center">
                  <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-slate-300 shadow-2xs">
                    <Bell className="h-7 w-7" />
                  </div>
                  <p className="font-display text-sm font-bold text-slate-900">
                    No notifications in {activeTab === 'all' ? 'your inbox' : activeTab} yet
                  </p>
                  <p className="mt-1 max-w-xs text-xs leading-relaxed text-slate-500">
                    Order updates, BuyKit Express tracking alerts, voucher drops, and answers to your product questions will appear here in real time.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      onNotificationAction({
                        id: 'explore_deals',
                        notificationId: 'explore_deals',
                        userId: 'system',
                        category: 'promos',
                        eventType: 'flash_sale',
                        title: 'Explore Deals',
                        message: '',
                        actionType: 'open_deals',
                        relatedId: 'deals',
                        trackingNumber: '',
                        imageUrl: '',
                        read: true,
                        createdAtMs: Date.now(),
                      });
                    }}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[#F85606] px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-[#d94800]"
                  >
                    <ShoppingBag className="h-3.5 w-3.5" />
                    <span>Explore Hot Deals</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {visibleNotifications.map((notif) => {
                    const actionLabel = getActionLabel(notif.actionType);
                    return (
                      <div
                        key={notif.id}
                        onClick={() => {
                          if (!notif.read) {
                            onMarkAsRead(notif);
                          }
                          if (notif.actionType !== 'none') {
                            onNotificationAction(notif);
                          }
                        }}
                        className={`group relative cursor-pointer rounded-xl border p-3 transition-all ${
                          notif.read
                            ? 'border-slate-200/80 bg-white hover:border-slate-300'
                            : 'border-orange-200 bg-[#FFF9F5] shadow-2xs hover:border-[#F85606]'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {renderEventIcon(notif)}

                          <div className="min-w-0 flex-1">
                            {/* Top Meta Line (Zero-Pill Typography) */}
                            <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500">
                              <div className="flex items-center gap-1.5 truncate">
                                {!notif.read && (
                                  <span
                                    aria-label="Unread"
                                    className="h-2 w-2 shrink-0 rounded-full bg-[#F85606]"
                                  />
                                )}
                                <span className="truncate font-semibold text-slate-600">
                                  {getCategoryLabel(notif.category)}
                                </span>
                              </div>
                              <span className="inline-flex shrink-0 items-center gap-1 font-mono text-[10px] text-slate-400 tabular-nums">
                                <Clock className="h-2.5 w-2.5" />
                                {formatRelativeTime(notif.createdAtMs)}
                              </span>
                            </div>

                            {/* Headline */}
                            <h3
                              className={`mt-0.5 text-xs leading-snug sm:text-[13px] ${
                                notif.read
                                  ? 'font-semibold text-slate-800'
                                  : 'font-extrabold text-slate-950'
                              }`}
                            >
                              {notif.title}
                            </h3>

                            {/* Message Body */}
                            <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-slate-600">
                              {notif.message}
                            </p>

                            {/* Optional Waybill Tracking Reference */}
                            {notif.trackingNumber && (
                              <p className="mt-1.5 font-mono text-[11px] font-bold text-[#F85606] tabular-nums">
                                Waybill: {notif.trackingNumber}
                              </p>
                            )}

                            {/* Bottom Row: Action Link + Delete */}
                            <div className="mt-2 flex items-center justify-between gap-2 pt-1">
                              {actionLabel ? (
                                <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-[#F85606] group-hover:underline">
                                  <span>{actionLabel}</span>
                                  <ChevronRight className="h-3 w-3" />
                                </span>
                              ) : (
                                <span />
                              )}

                              <div className="flex items-center gap-2">
                                {!notif.read && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onMarkAsRead(notif);
                                    }}
                                    className="text-[11px] font-semibold text-slate-500 transition-colors hover:text-[#F85606]"
                                  >
                                    Mark read
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteNotification(notif);
                                  }}
                                  aria-label="Delete notification"
                                  title="Delete notification"
                                  className="rounded p-1 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
};
