import { jsPDF } from 'jspdf';
import { formatLKR } from '../data/catalog';
import type {
  TrackableOrder,
  OrderInvoiceLineItem,
} from '../components/OrderTrackingModal';
import { getStageLabelFromStatus } from '../components/OrderTrackingModal';
import {
  DEFAULT_CARRIER_NAME,
  resolveOrderTrackingNumber,
} from './trackingSystem';

export interface StoredOrderInvoiceMetadata {
  orderId: string;
  orderNumber: string;
  trackingNumber?: string;
  items: OrderInvoiceLineItem[];
  subtotal: number;
  couponCode: string;
  couponDiscount: number;
  deliveryFee: number;
  deliveryMethodLabel: string;
  paymentMethodLabel: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: string;
  finalTotalLkr: number;
  createdAtMs: number;
}

const INVOICE_STORAGE_KEY = 'buykit_order_invoices_v1';

export function saveOrderInvoiceMetadata(meta: StoredOrderInvoiceMetadata): void {
  try {
    const raw = window.localStorage.getItem(INVOICE_STORAGE_KEY);
    const map: Record<string, StoredOrderInvoiceMetadata> = raw ? JSON.parse(raw) : {};
    map[meta.orderId] = meta;
    map[meta.orderNumber] = meta;
    window.localStorage.setItem(INVOICE_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Ignore localStorage quota or private-mode errors
  }
}

export function loadOrderInvoiceMetadata(
  orderId: string,
  orderNumber?: string
): StoredOrderInvoiceMetadata | null {
  try {
    const raw = window.localStorage.getItem(INVOICE_STORAGE_KEY);
    if (!raw) return null;
    const map: Record<string, StoredOrderInvoiceMetadata> = JSON.parse(raw);
    return map[orderId] || (orderNumber ? map[orderNumber] : null) || null;
  } catch {
    return null;
  }
}

export interface InvoiceFallbackCustomerInfo {
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  shippingAddress?: string;
}

/**
 * Fallback parser for legacy/historical orders where only summaryTitle ("2x Product A, 1x Product B")
 * was persisted in Firestore.
 */
function parseItemsFromSummaryTitle(
  summaryTitle: string,
  totalAmount: number,
  fallbackItemCount: number
): OrderInvoiceLineItem[] {
  const segments = summaryTitle
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (segments.length === 0) {
    const qty = Math.max(1, fallbackItemCount || 1);
    return [
      {
        title: 'BuyKit Marketplace Order Item',
        quantity: qty,
        unitPrice: Math.round(totalAmount / qty),
      },
    ];
  }

  const parsed = segments.map((seg) => {
    const match = seg.match(/^(\d+)\s*x\s+(.+)$/i);
    if (match) {
      return {
        quantity: Math.max(1, parseInt(match[1], 10) || 1),
        title: match[2].trim(),
      };
    }
    return {
      quantity: 1,
      title: seg,
    };
  });

  const totalQty = parsed.reduce((acc, p) => acc + p.quantity, 0) || 1;
  const approxUnitPrice = Math.round(totalAmount / totalQty);

  return parsed.map((p, idx) => {
    // Adjust the final item slightly if rounding left a small remainder
    if (idx === parsed.length - 1) {
      const prevSum = parsed
        .slice(0, idx)
        .reduce((acc, item) => acc + item.quantity * approxUnitPrice, 0);
      const remaining = Math.max(0, totalAmount - prevSum);
      return {
        title: p.title,
        quantity: p.quantity,
        unitPrice: Math.round(remaining / p.quantity),
      };
    }
    return {
      title: p.title,
      quantity: p.quantity,
      unitPrice: approxUnitPrice,
    };
  });
}

/**
 * Generates and downloads a clean, branded A4 PDF Invoice summarizing the order items,
 * coupon applied, delivery details, and final total in LKR.
 */
export function downloadOrderInvoicePdf(
  order: TrackableOrder,
  fallbackCustomer?: InvoiceFallbackCustomerInfo
): void {
  const storedMeta = loadOrderInvoiceMetadata(order.id, order.orderNumber);

  const lineItems: OrderInvoiceLineItem[] =
    order.invoiceItems && order.invoiceItems.length > 0
      ? order.invoiceItems
      : storedMeta?.items && storedMeta.items.length > 0
      ? storedMeta.items
      : parseItemsFromSummaryTitle(order.summaryTitle, order.totalAmount, order.itemCount);

  const itemsSubtotal =
    storedMeta?.subtotal ??
    lineItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

  const rawCouponCode = order.couponCode || storedMeta?.couponCode || '';
  const couponCode =
    rawCouponCode && rawCouponCode !== 'NO_COUPON' ? rawCouponCode : 'None';
  const couponDiscount =
    typeof order.couponDiscount === 'number'
      ? order.couponDiscount
      : storedMeta?.couponDiscount ?? 0;

  const deliveryFee =
    typeof order.deliveryFee === 'number'
      ? order.deliveryFee
      : storedMeta?.deliveryFee ?? 0;

  const deliveryMethodLabel =
    order.deliveryMethodLabel ||
    storedMeta?.deliveryMethodLabel ||
    'Standard Islandwide Delivery';

  const paymentMethodLabel =
    order.paymentMethodLabel ||
    storedMeta?.paymentMethodLabel ||
    (order.paymentMethod === 'cod'
      ? 'Cash on Delivery (LKR)'
      : 'Online Card / Express Payment (LKR)');

  const customerName =
    order.customerName ||
    storedMeta?.customerName ||
    fallbackCustomer?.customerName ||
    'BuyKit Valued Shopper';

  const customerEmail =
    order.customerEmail ||
    storedMeta?.customerEmail ||
    fallbackCustomer?.customerEmail ||
    'shopper@buykit.lk';

  const customerPhone =
    order.customerPhone ||
    storedMeta?.customerPhone ||
    fallbackCustomer?.customerPhone ||
    'N/A';

  const shippingAddress =
    order.shippingAddress ||
    storedMeta?.shippingAddress ||
    fallbackCustomer?.shippingAddress ||
    order.pickupHubName ||
    'Sri Lanka';

  const finalTotalLkr = Math.max(0, Math.round(order.totalAmount));
  const orderDate = new Date(order.createdAtMs || storedMeta?.createdAtMs || Date.now());
  const formattedDate = orderDate.toLocaleDateString('en-LK', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const formattedTime = orderDate.toLocaleTimeString('en-LK', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const cleanOrderNum = order.orderNumber.replace(/[^a-zA-Z0-9_-]/g, '');
  const trackingCode = resolveOrderTrackingNumber({
    id: order.id,
    orderNumber: order.orderNumber,
    trackingNumber: order.trackingNumber || storedMeta?.trackingNumber,
    createdAtMs: order.createdAtMs || storedMeta?.createdAtMs,
  });
  const statusLabel = getStageLabelFromStatus(order.status).toUpperCase();

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 15;
  const contentWidth = pageWidth - marginX * 2;

  // =========================================================
  // 1. TOP BRANDED HEADER BANNER
  // =========================================================
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 40, 'F');

  // BuyKit Orange bottom accent strip
  doc.setFillColor(248, 86, 6); // #F85606
  doc.rect(0, 40, pageWidth, 2.5, 'F');

  // Brand Title (Left)
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('buykit', marginX, 16);

  doc.setTextColor(255, 184, 0); // #FFB800
  doc.setFontSize(11);
  doc.text('with Pramu', marginX + 24, 16);

  doc.setTextColor(203, 213, 225); // slate-300
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Sri Lanka Online Marketplace · Official Order Invoice (LKR)', marginX, 23.5);
  doc.text('Colombo 03, Sri Lanka · support@buykit.lk', marginX, 29);
  doc.setTextColor(255, 184, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text(`Tracking No: ${trackingCode}`, marginX, 35);

  // Invoice Header Block (Right)
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('INVOICE', pageWidth - marginX, 15.5, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(226, 232, 240);
  doc.text(`Invoice No: INV-${cleanOrderNum}`, pageWidth - marginX, 22.5, { align: 'right' });
  doc.text(`Order Ref: #${order.orderNumber}`, pageWidth - marginX, 27.5, { align: 'right' });
  doc.text(`Issued: ${formattedDate} · ${formattedTime}`, pageWidth - marginX, 32.5, {
    align: 'right',
  });
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(`Waybill: ${trackingCode}`, pageWidth - marginX, 37.2, { align: 'right' });

  // =========================================================
  // 2. CUSTOMER & ORDER METADATA CARDS
  // =========================================================
  let cursorY = 50;
  const colGap = 6;
  const halfWidth = (contentWidth - colGap) / 2;

  // Left Box: Billed & Shipped To
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(marginX, cursorY, halfWidth, 38, 2.5, 2.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(248, 86, 6);
  doc.text('BILLED & SHIPPED TO', marginX + 4, cursorY + 6.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(customerName.slice(0, 42), marginX + 4, cursorY + 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  const addressLines = doc.splitTextToSize(shippingAddress, halfWidth - 8).slice(0, 2);
  doc.text(addressLines, marginX + 4, cursorY + 18.5);
  doc.text(`Phone: ${customerPhone}`, marginX + 4, cursorY + 28.5);
  doc.text(`Email: ${customerEmail.slice(0, 38)}`, marginX + 4, cursorY + 33.5);

  // Right Box: Order, Tracking & Payment Details
  const rightX = marginX + halfWidth + colGap;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(rightX, cursorY, halfWidth, 38, 2.5, 2.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(248, 86, 6);
  doc.text('ORDER & SHIPMENT TRACKING', rightX + 4, cursorY + 6.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);

  const metaRows: Array<[string, string, boolean?]> = [
    ['Tracking No:', trackingCode, true],
    ['Carrier:', DEFAULT_CARRIER_NAME],
    ['Status:', statusLabel],
    ['Payment:', paymentMethodLabel.slice(0, 30)],
    ['Delivery:', deliveryMethodLabel.slice(0, 30)],
  ];

  let metaY = cursorY + 12.5;
  for (const [label, val, highlight] of metaRows) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(51, 65, 85);
    doc.text(label, rightX + 4, metaY);
    doc.setFont('helvetica', highlight ? 'bold' : 'normal');
    if (highlight) {
      doc.setTextColor(248, 86, 6);
    } else {
      doc.setTextColor(15, 23, 42);
    }
    doc.text(val, rightX + 26, metaY);
    metaY += 5.1;
  }

  // =========================================================
  // 3. ITEMIZED ORDER TABLE
  // =========================================================
  cursorY += 45;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('ORDER ITEMS SUMMARY', marginX, cursorY);

  cursorY += 3.5;

  // Table Header Bar
  doc.setFillColor(15, 23, 42);
  doc.rect(marginX, cursorY, contentWidth, 8.5, 'F');

  const colNoX = marginX + 3;
  const colDescX = marginX + 12;
  const colQtyX = marginX + 114;
  const colUnitX = marginX + 144;
  const colTotalX = pageWidth - marginX - 3;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text('#', colNoX, cursorY + 5.7);
  doc.text('Product Description', colDescX, cursorY + 5.7);
  doc.text('Qty', colQtyX, cursorY + 5.7, { align: 'right' });
  doc.text('Unit Price', colUnitX, cursorY + 5.7, { align: 'right' });
  doc.text('Line Total', colTotalX, cursorY + 5.7, { align: 'right' });

  cursorY += 8.5;

  // Table Rows
  lineItems.forEach((item, index) => {
    const descLines = doc.splitTextToSize(item.title, 92);
    const rowHeight = Math.max(9.5, descLines.length * 4.5 + 4);

    // Page break safety if an order has many items
    if (cursorY + rowHeight > pageHeight - 72) {
      doc.addPage();
      cursorY = 20;
    }

    if (index % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(marginX, cursorY, contentWidth, rowHeight, 'F');
    }

    doc.setDrawColor(226, 232, 240);
    doc.line(marginX, cursorY + rowHeight, marginX + contentWidth, cursorY + rowHeight);

    const textY = cursorY + 5.8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text(String(index + 1), colNoX, textY);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(descLines, colDescX, textY);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(String(item.quantity), colQtyX, textY, { align: 'right' });
    doc.text(formatLKR(item.unitPrice), colUnitX, textY, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.text(formatLKR(item.unitPrice * item.quantity), colTotalX, textY, { align: 'right' });

    cursorY += rowHeight;
  });

  // =========================================================
  // 4. COUPON & FINAL LKR FINANCIAL TOTALS
  // =========================================================
  if (cursorY > pageHeight - 75) {
    doc.addPage();
    cursorY = 24;
  }

  cursorY += 8;

  // Left: Coupon Applied & Verification Note
  const noteWidth = 88;
  doc.setFillColor(255, 245, 240);
  doc.setDrawColor(253, 186, 116);
  doc.roundedRect(marginX, cursorY, noteWidth, 32, 2.5, 2.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(248, 86, 6);
  doc.text('COUPON & VOUCHER DETAILS', marginX + 4, cursorY + 6.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(
    couponCode !== 'None' ? `Code Applied: ${couponCode}` : 'No Coupon Code Applied',
    marginX + 4,
    cursorY + 13.5
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(21, 128, 61);
  doc.text(
    couponDiscount > 0
      ? `Voucher Discount Saved: - ${formatLKR(couponDiscount)}`
      : 'Standard BuyKit Deal Pricing Applied',
    marginX + 4,
    cursorY + 19.5
  );

  doc.setTextColor(71, 85, 105);
  doc.setFontSize(7.8);
  doc.text('100% BuyKit Buyer Protection Verified', marginX + 4, cursorY + 26.5);

  // Right: Financial Summary Box
  const summaryWidth = contentWidth - noteWidth - 8;
  const summaryX = marginX + noteWidth + 8;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(summaryX, cursorY, summaryWidth, 42, 2.5, 2.5, 'FD');

  let sumY = cursorY + 7.5;
  const labelX = summaryX + 4;
  const valueX = summaryX + summaryWidth - 4;

  const drawSummaryRow = (
    label: string,
    value: string,
    color: [number, number, number] = [51, 65, 85],
    bold = false
  ) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(8.8);
    doc.setTextColor(color[0], color[1], color[2]);
    doc.text(label, labelX, sumY);
    doc.text(value, valueX, sumY, { align: 'right' });
    sumY += 6.2;
  };

  drawSummaryRow('Items Subtotal:', formatLKR(itemsSubtotal), [15, 23, 42], true);
  drawSummaryRow(
    couponCode !== 'None' ? `Coupon (${couponCode}):` : 'Coupon Discount:',
    couponDiscount > 0 ? `- ${formatLKR(couponDiscount)}` : 'Rs. 0',
    couponDiscount > 0 ? [21, 128, 61] : [100, 116, 139],
    couponDiscount > 0
  );

  // If Coins / extra discounts reduced final total further, show it clearly
  const impliedOtherDiscount = Math.max(
    0,
    itemsSubtotal - couponDiscount + deliveryFee - finalTotalLkr
  );
  if (impliedOtherDiscount > 0) {
    drawSummaryRow('Coins / Extra Rebate:', `- ${formatLKR(impliedOtherDiscount)}`, [21, 128, 61]);
  }

  drawSummaryRow(
    'Delivery Fee:',
    deliveryFee === 0 ? 'FREE (Rs. 0)' : `+ ${formatLKR(deliveryFee)}`,
    deliveryFee === 0 ? [21, 128, 61] : [15, 23, 42]
  );

  // Final Total Highlight Strip
  const totalBoxY = cursorY + 30.5;
  doc.setFillColor(248, 86, 6);
  doc.roundedRect(summaryX, totalBoxY, summaryWidth, 11.5, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(255, 255, 255);
  doc.text('FINAL TOTAL (LKR)', labelX, totalBoxY + 7.2);

  doc.setFontSize(12);
  doc.text(formatLKR(finalTotalLkr), valueX, totalBoxY + 7.4, { align: 'right' });

  // =========================================================
  // 5. OFFICIAL SHIPMENT WAYBILL & BARCODE STRIP
  // =========================================================
  const barcodeBoxY = Math.min(pageHeight - 44, Math.max(totalBoxY + 18, cursorY + 48));
  if (barcodeBoxY < pageHeight - 36) {
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(marginX, barcodeBoxY, contentWidth, 21, 2.5, 2.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    doc.text('REAL-TIME SHIPMENT TRACKING NUMBER', marginX + 4, barcodeBoxY + 6.5);

    doc.setFont('courier', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text(trackingCode, marginX + 4, barcodeBoxY + 13.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `Carrier: ${DEFAULT_CARRIER_NAME} · Hub: ${order.pickupHubName.slice(0, 34)}`,
      marginX + 4,
      barcodeBoxY + 18
    );

    // Deterministic vector barcode bars encoded from trackingCode characters
    let barX = pageWidth - marginX - 66;
    const barTop = barcodeBoxY + 3.5;
    const barHeight = 11.5;
    doc.setFillColor(15, 23, 42);
    for (let i = 0; i < trackingCode.length && barX < pageWidth - marginX - 5; i++) {
      const code = trackingCode.charCodeAt(i);
      const w1 = code % 2 === 0 ? 0.9 : 0.45;
      const w2 = (code >> 1) % 2 === 0 ? 0.45 : 1.05;
      const g1 = 0.55;
      const g2 = 0.65;
      doc.rect(barX, barTop, w1, barHeight, 'F');
      barX += w1 + g1;
      doc.rect(barX, barTop, w2, barHeight, 'F');
      barX += w2 + g2;
    }

    doc.setFont('courier', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(71, 85, 105);
    doc.text(trackingCode, pageWidth - marginX - 35, barcodeBoxY + 18.2, { align: 'center' });
  }

  // =========================================================
  // 6. FOOTER
  // =========================================================
  const footerY = pageHeight - 16;
  doc.setDrawColor(226, 232, 240);
  doc.line(marginX, footerY - 4, pageWidth - marginX, footerY - 4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.8);
  doc.setTextColor(100, 116, 139);
  doc.text(
    'Thank you for shopping with BuyKit with Pramu! This is an electronically generated invoice valid without a physical signature.',
    pageWidth / 2,
    footerY,
    { align: 'center' }
  );
  doc.text(
    `Order #${order.orderNumber} · Tracking No: ${trackingCode} · All totals settled in Sri Lankan Rupees (LKR)`,
    pageWidth / 2,
    footerY + 4.5,
    { align: 'center' }
  );

  doc.save(`BuyKit_Invoice_${cleanOrderNum || 'Order'}.pdf`);
}
