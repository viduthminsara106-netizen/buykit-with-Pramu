import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Settings,
  User as UserIcon,
  MapPin,
  Globe,
  Languages,
  CreditCard,
  Plus,
  Trash2,
  Check,
  ShieldCheck,
  Phone,
  Mail,
  Building2,
  Sparkles,
  ChevronDown,
} from 'lucide-react';
import { getTranslations } from '../utils/i18n';

export interface CountryOption {
  code: string;
  name: string;
  dialCode: string;
  currency: string;
  flagUrl: string;
  shippingZone: string;
  baseShippingLkr: number;
}

export const COUNTRIES_WITH_FLAGS: CountryOption[] = [
  {
    code: 'LK',
    name: 'Sri Lanka',
    dialCode: '+94',
    currency: 'LKR (Rs.)',
    flagUrl: 'https://flagcdn.com/w80/lk.png',
    shippingZone: 'Islandwide Express (1–3 Days)',
    baseShippingLkr: 350,
  },
  {
    code: 'AE',
    name: 'United Arab Emirates',
    dialCode: '+971',
    currency: 'LKR / AED',
    flagUrl: 'https://flagcdn.com/w80/ae.png',
    shippingZone: 'BuyKit Global Air (3–5 Days)',
    baseShippingLkr: 1450,
  },
  {
    code: 'SG',
    name: 'Singapore',
    dialCode: '+65',
    currency: 'LKR / SGD',
    flagUrl: 'https://flagcdn.com/w80/sg.png',
    shippingZone: 'BuyKit Global Air (3–5 Days)',
    baseShippingLkr: 1250,
  },
  {
    code: 'IN',
    name: 'India',
    dialCode: '+91',
    currency: 'LKR / INR',
    flagUrl: 'https://flagcdn.com/w80/in.png',
    shippingZone: 'South Asia Priority (2–4 Days)',
    baseShippingLkr: 850,
  },
  {
    code: 'MV',
    name: 'Maldives',
    dialCode: '+960',
    currency: 'LKR / MVR',
    flagUrl: 'https://flagcdn.com/w80/mv.png',
    shippingZone: 'Indian Ocean Express (2–4 Days)',
    baseShippingLkr: 750,
  },
  {
    code: 'MY',
    name: 'Malaysia',
    dialCode: '+60',
    currency: 'LKR / MYR',
    flagUrl: 'https://flagcdn.com/w80/my.png',
    shippingZone: 'BuyKit Global Air (3–6 Days)',
    baseShippingLkr: 1200,
  },
  {
    code: 'GB',
    name: 'United Kingdom',
    dialCode: '+44',
    currency: 'LKR / GBP',
    flagUrl: 'https://flagcdn.com/w80/gb.png',
    shippingZone: 'BuyKit International DHL (4–7 Days)',
    baseShippingLkr: 2200,
  },
  {
    code: 'US',
    name: 'United States',
    dialCode: '+1',
    currency: 'LKR / USD',
    flagUrl: 'https://flagcdn.com/w80/us.png',
    shippingZone: 'BuyKit International DHL (5–8 Days)',
    baseShippingLkr: 2500,
  },
  {
    code: 'AU',
    name: 'Australia',
    dialCode: '+61',
    currency: 'LKR / AUD',
    flagUrl: 'https://flagcdn.com/w80/au.png',
    shippingZone: 'Asia-Pacific Express (4–7 Days)',
    baseShippingLkr: 1950,
  },
  {
    code: 'JP',
    name: 'Japan',
    dialCode: '+81',
    currency: 'LKR / JPY',
    flagUrl: 'https://flagcdn.com/w80/jp.png',
    shippingZone: 'Asia-Pacific Express (4–6 Days)',
    baseShippingLkr: 1800,
  },
];

export interface LanguageOption {
  code: string;
  label: string;
  nativeLabel: string;
  regionNote: string;
}

export const LANGUAGES_LIST: LanguageOption[] = [
  {
    code: 'en',
    label: 'English (International)',
    nativeLabel: 'English',
    regionNote: 'Default Storefront Language',
  },
  {
    code: 'si',
    label: 'Sinhala (Sri Lanka)',
    nativeLabel: 'සිංහල',
    regionNote: 'ශ්‍රී ලංකා පාරිභෝගික භාෂාව',
  },
  {
    code: 'ta',
    label: 'Tamil (Sri Lanka / Global)',
    nativeLabel: 'தமிழ்',
    regionNote: 'இலங்கை / சர்வதேச தமிழ்',
  },
  {
    code: 'ar',
    label: 'Arabic (Middle East)',
    nativeLabel: 'العربية',
    regionNote: 'UAE & Gulf Region',
  },
  {
    code: 'hi',
    label: 'Hindi (South Asia)',
    nativeLabel: 'हिन्दी',
    regionNote: 'India & South Asia',
  },
];

export interface SavedPaymentCard {
  id: string;
  brand: 'Visa' | 'Mastercard' | 'Amex';
  cardType: 'Credit' | 'Debit';
  last4: string;
  holderName: string;
  expiry: string;
  bankName: string;
  isDefault: boolean;
}

export const INITIAL_SAVED_CARDS: SavedPaymentCard[] = [
  {
    id: 'card_visa_4242',
    brand: 'Visa',
    cardType: 'Credit',
    last4: '4242',
    holderName: 'PRAMU BUYKIT MEMBER',
    expiry: '08/29',
    bankName: 'Commercial Bank Visa Platinum',
    isDefault: true,
  },
  {
    id: 'card_mc_8891',
    brand: 'Mastercard',
    cardType: 'Debit',
    last4: '8891',
    holderName: 'PRAMU BUYKIT MEMBER',
    expiry: '11/28',
    bankName: 'Sampath Bank World Mastercard',
    isDefault: false,
  },
];

export type SettingsTabKey = 'profile' | 'address' | 'country_language' | 'cards';

interface AccountSettingsModalProps {
  isOpen: boolean;
  initialTab?: SettingsTabKey;
  onClose: () => void;
  fullName: string;
  email: string;
  phone: string;
  secondaryPhone: string;
  shippingAddress: string;
  cityDistrict: string;
  postalCode: string;
  addressLabel: 'Home' | 'Office';
  selectedHubName: string;
  selectedCountryCode: string;
  selectedLanguageCode: string;
  savedCards: SavedPaymentCard[];
  onUpdateFullName: (v: string) => void;
  onUpdateEmail: (v: string) => void;
  onUpdatePhone: (v: string) => void;
  onUpdateSecondaryPhone: (v: string) => void;
  onUpdateShippingAddress: (v: string) => void;
  onUpdateCityDistrict: (v: string) => void;
  onUpdatePostalCode: (v: string) => void;
  onUpdateAddressLabel: (v: 'Home' | 'Office') => void;
  onUpdateCountryCode: (code: string) => void;
  onUpdateLanguageCode: (code: string) => void;
  onAddCard: (card: SavedPaymentCard) => void;
  onRemoveCard: (cardId: string) => void;
  onSetDefaultCard: (cardId: string) => void;
  onOpenPickupMap: () => void;
  onSaveAllSettings: () => Promise<void>;
}

export const AccountSettingsModal: React.FC<AccountSettingsModalProps> = ({
  isOpen,
  initialTab = 'profile',
  onClose,
  fullName,
  email,
  phone,
  secondaryPhone,
  shippingAddress,
  cityDistrict,
  postalCode,
  addressLabel,
  selectedHubName,
  selectedCountryCode,
  selectedLanguageCode,
  savedCards,
  onUpdateFullName,
  onUpdateEmail,
  onUpdatePhone,
  onUpdateSecondaryPhone,
  onUpdateShippingAddress,
  onUpdateCityDistrict,
  onUpdatePostalCode,
  onUpdateAddressLabel,
  onUpdateCountryCode,
  onUpdateLanguageCode,
  onAddCard,
  onRemoveCard,
  onSetDefaultCard,
  onOpenPickupMap,
  onSaveAllSettings,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTabKey>(initialTab);
  const [saving, setSaving] = useState(false);
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false);

  // New Card Form State
  const [cardNumberInput, setCardNumberInput] = useState('');
  const [cardHolderInput, setCardHolderInput] = useState(fullName || 'BUYKIT SHOPPER');
  const [cardExpiryInput, setCardExpiryInput] = useState('');
  const [cardCvvInput, setCardCvvInput] = useState('');
  const [cardTypeInput, setCardTypeInput] = useState<'Credit' | 'Debit'>('Credit');
  const [bankNameInput, setBankNameInput] = useState('BOC / Sampath / Commercial Bank');
  const [cardFormFeedback, setCardFormFeedback] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setIsCountryDropdownOpen(false);
      setIsLanguageDropdownOpen(false);
    }
  }, [isOpen, initialTab]);

  const currentCountry =
    COUNTRIES_WITH_FLAGS.find((c) => c.code === selectedCountryCode) ||
    COUNTRIES_WITH_FLAGS[0];

  const currentLanguage =
    LANGUAGES_LIST.find((l) => l.code === selectedLanguageCode) || LANGUAGES_LIST[0];

  const t = getTranslations(selectedLanguageCode);

  const detectBrand = (num: string): 'Visa' | 'Mastercard' | 'Amex' => {
    const clean = num.replace(/\D/g, '');
    if (clean.startsWith('34') || clean.startsWith('37')) return 'Amex';
    if (clean.startsWith('5') || clean.startsWith('2')) return 'Mastercard';
    return 'Visa';
  };

  const handleFormatCardNumber = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 16);
    const groups = digits.match(/.{1,4}/g);
    setCardNumberInput(groups ? groups.join(' ') : digits);
  };

  const handleFormatExpiry = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 4);
    if (digits.length >= 3) {
      setCardExpiryInput(`${digits.slice(0, 2)}/${digits.slice(2)}`);
    } else {
      setCardExpiryInput(digits);
    }
  };

  const handleAddCardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const digits = cardNumberInput.replace(/\D/g, '');
    if (digits.length < 12) {
      setCardFormFeedback('Please enter a valid 16-digit Credit or Debit card number.');
      return;
    }
    if (!cardExpiryInput.includes('/') || cardExpiryInput.length < 4) {
      setCardFormFeedback('Please enter a valid expiry date in MM/YY format.');
      return;
    }
    if (cardCvvInput.replace(/\D/g, '').length < 3) {
      setCardFormFeedback('Please enter a valid 3 or 4 digit CVV security code.');
      return;
    }

    const brand = detectBrand(digits);
    const newCard: SavedPaymentCard = {
      id: `card_${Date.now()}`,
      brand,
      cardType: cardTypeInput,
      last4: digits.slice(-4),
      holderName: (cardHolderInput.trim() || fullName || 'BUYKIT SHOPPER').toUpperCase(),
      expiry: cardExpiryInput,
      bankName: bankNameInput.trim() || `${brand} ${cardTypeInput} Card`,
      isDefault: savedCards.length === 0,
    };

    onAddCard(newCard);
    setCardNumberInput('');
    setCardExpiryInput('');
    setCardCvvInput('');
    setCardFormFeedback(
      `Added ${brand} ${cardTypeInput} Card ending in •••• ${newCard.last4} to your BuyKit Wallet!`
    );
  };

  const handleSaveProfileAndAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSaveAllSettings();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-2 backdrop-blur-xs sm:p-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ duration: 0.2 }}
            className="relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-gradient-to-r from-[#F85606] via-[#ff6a00] to-[#d94800] px-5 py-4 text-white">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-black/25 text-white shadow-xs">
                  <Settings className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-display text-base font-extrabold tracking-tight sm:text-lg">
                      {t.accountSettingsTitle}
                    </h2>
                    <img
                      src={currentCountry.flagUrl}
                      alt={currentCountry.name}
                      className="h-4 w-6 rounded-xs border border-white/50 object-cover"
                    />
                  </div>
                  <p className="text-xs text-orange-100">
                    Manage Profile, Contact Numbers, Delivery Address, Country, Language & Credit/Debit Cards
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Close settings modal"
                className="rounded-lg bg-black/20 p-2 text-white transition-colors hover:bg-black/35"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* 4-Tab Navigation Bar */}
            <div className="flex overflow-x-auto border-b border-slate-200 bg-slate-50 px-4 pt-2.5">
              <button
                type="button"
                onClick={() => setActiveTab('profile')}
                className={`inline-flex shrink-0 items-center gap-1.5 border-b-2 px-4 py-2.5 text-xs font-extrabold transition-colors ${
                  activeTab === 'profile'
                    ? 'border-[#F85606] bg-white text-[#F85606] rounded-t-lg'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <UserIcon className="h-4 w-4" />
                <span>{t.tabProfileContacts}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('address')}
                className={`inline-flex shrink-0 items-center gap-1.5 border-b-2 px-4 py-2.5 text-xs font-extrabold transition-colors ${
                  activeTab === 'address'
                    ? 'border-[#F85606] bg-white text-[#F85606] rounded-t-lg'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <MapPin className="h-4 w-4" />
                <span>{t.tabDeliveryAddress}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('country_language')}
                className={`inline-flex shrink-0 items-center gap-1.5 border-b-2 px-4 py-2.5 text-xs font-extrabold transition-colors ${
                  activeTab === 'country_language'
                    ? 'border-[#F85606] bg-white text-[#F85606] rounded-t-lg'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <Globe className="h-4 w-4" />
                <span>{t.tabCountryLanguage}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('cards')}
                className={`inline-flex shrink-0 items-center gap-1.5 border-b-2 px-4 py-2.5 text-xs font-extrabold transition-colors ${
                  activeTab === 'cards'
                    ? 'border-[#F85606] bg-white text-[#F85606] rounded-t-lg'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <CreditCard className="h-4 w-4" />
                <span>
                  {t.tabCreditDebitCards} ({savedCards.length})
                </span>
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6">
              {/* TAB 1: PROFILE & CONTACT NUMBERS */}
              {activeTab === 'profile' && (
                <form onSubmit={handleSaveProfileAndAddress} className="space-y-4">
                  <div className="rounded-xl border border-orange-200/80 bg-[#FFF8F4] p-4">
                    <h3 className="font-display text-sm font-bold text-slate-950">
                      Personal Profile & Contact Information
                    </h3>
                    <p className="mt-0.5 text-xs text-slate-600">
                      Used for BuyKit order notifications, SMS tracking alerts, and delivery verification.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 flex items-center gap-1.5 text-xs font-bold text-slate-700">
                        <UserIcon className="h-3.5 w-3.5 text-[#F85606]" />
                        <span>Full Name (Recipient Name)</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => onUpdateFullName(e.target.value)}
                        placeholder="e.g., Pramu Perera"
                        className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-900 focus:border-[#F85606] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="mb-1 flex items-center gap-1.5 text-xs font-bold text-slate-700">
                        <Mail className="h-3.5 w-3.5 text-[#F85606]" />
                        <span>Email Address (For Invoices & Tracking)</span>
                      </label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => onUpdateEmail(e.target.value)}
                        placeholder="shopper@buykit.lk"
                        className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-900 focus:border-[#F85606] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="mb-1 flex items-center gap-1.5 text-xs font-bold text-slate-700">
                        <Phone className="h-3.5 w-3.5 text-emerald-600" />
                        <span>Primary Mobile Number ({currentCountry.dialCode})</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={phone}
                        onChange={(e) => onUpdatePhone(e.target.value)}
                        placeholder={`${currentCountry.dialCode} 77 123 4567`}
                        className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 font-mono text-xs font-medium text-slate-900 focus:border-[#F85606] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="mb-1 flex items-center gap-1.5 text-xs font-bold text-slate-700">
                        <Phone className="h-3.5 w-3.5 text-blue-600" />
                        <span>Secondary Contact / WhatsApp Number</span>
                      </label>
                      <input
                        type="text"
                        value={secondaryPhone}
                        onChange={(e) => onUpdateSecondaryPhone(e.target.value)}
                        placeholder={`${currentCountry.dialCode} 71 987 6543`}
                        className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 font-mono text-xs font-medium text-slate-900 focus:border-[#F85606] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
                    <button
                      type="button"
                      onClick={() => setActiveTab('address')}
                      className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                    >
                      Next: Shipping Address →
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[#F85606] px-5 py-2.5 text-xs font-extrabold text-white shadow-sm hover:bg-[#d94800] disabled:opacity-50"
                    >
                      <Check className="h-4 w-4" />
                      <span>{saving ? 'Saving...' : 'Save Profile Settings'}</span>
                    </button>
                  </div>
                </form>
              )}

              {/* TAB 2: SHIPPING ADDRESS & HUB */}
              {activeTab === 'address' && (
                <form onSubmit={handleSaveProfileAndAddress} className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={currentCountry.flagUrl}
                        alt={currentCountry.name}
                        className="h-6 w-9 rounded border border-slate-300 object-cover"
                      />
                      <div>
                        <p className="text-xs font-bold text-slate-900">
                          Shipping Country: {currentCountry.name} ({currentCountry.shippingZone})
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Pickup / Dispatch Hub: <strong>{selectedHubName}</strong>
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('country_language')}
                      className="text-xs font-bold text-[#F85606] underline"
                    >
                      Change Country
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-xs font-bold text-slate-700">
                        Street Address, House No. & Landmark
                      </label>
                      <input
                        type="text"
                        required
                        value={shippingAddress}
                        onChange={(e) => onUpdateShippingAddress(e.target.value)}
                        placeholder="No. 42, Galle Road, Colombo 03"
                        className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-900 focus:border-[#F85606] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-bold text-slate-700">
                        City / District / Province
                      </label>
                      <input
                        type="text"
                        required
                        value={cityDistrict}
                        onChange={(e) => onUpdateCityDistrict(e.target.value)}
                        placeholder="Colombo · Western Province"
                        className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-900 focus:border-[#F85606] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-bold text-slate-700">
                        Postal / ZIP Code
                      </label>
                      <input
                        type="text"
                        required
                        value={postalCode}
                        onChange={(e) => onUpdatePostalCode(e.target.value)}
                        placeholder="00300"
                        className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 font-mono text-xs font-medium text-slate-900 focus:border-[#F85606] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-[#F85606]" />
                      <span className="text-xs font-bold text-slate-700">Address Label:</span>
                      <button
                        type="button"
                        onClick={() => onUpdateAddressLabel('Home')}
                        className={`rounded-lg px-3 py-1 text-xs font-bold ${
                          addressLabel === 'Home'
                            ? 'bg-[#F85606] text-white'
                            : 'bg-white text-slate-600 border border-slate-200'
                        }`}
                      >
                        Home
                      </button>
                      <button
                        type="button"
                        onClick={() => onUpdateAddressLabel('Office')}
                        className={`rounded-lg px-3 py-1 text-xs font-bold ${
                          addressLabel === 'Office'
                            ? 'bg-[#F85606] text-white'
                            : 'bg-white text-slate-600 border border-slate-200'
                        }`}
                      >
                        Office
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={onOpenPickupMap}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-orange-200 bg-[#FFF3EB] px-3 py-1.5 text-xs font-bold text-[#F85606] hover:bg-orange-100"
                    >
                      <MapPin className="h-3.5 w-3.5" />
                      <span>Select Pickup Hub on Map ({selectedHubName})</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
                    <button
                      type="submit"
                      disabled={saving}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[#F85606] px-5 py-2.5 text-xs font-extrabold text-white shadow-sm hover:bg-[#d94800] disabled:opacity-50"
                    >
                      <Check className="h-4 w-4" />
                      <span>{saving ? 'Saving...' : 'Save Delivery Address'}</span>
                    </button>
                  </div>
                </form>
              )}

              {/* TAB 3: COUNTRY (WITH FLAG IMAGE) & LANGUAGE SELECTOR (WITH DROPDOWN ARROW BARS) */}
              {activeTab === 'country_language' && (
                <div className="space-y-6">
                  {/* 1. Country Selection Dropdown Arrow Bar (With Flag Image) */}
                  <div className="space-y-2.5">
                    <div>
                      <h3 className="font-display text-sm font-bold text-slate-950">
                        {t.selectShippingCountry}
                      </h3>
                      <p className="text-xs text-slate-500">{t.selectCountrySubtitle}</p>
                    </div>

                    {/* Country Dropdown Trigger Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsCountryDropdownOpen((prev) => !prev);
                        setIsLanguageDropdownOpen(false);
                      }}
                      className="flex w-full items-center justify-between gap-3 rounded-2xl border-2 border-orange-200 bg-white px-4 py-3.5 text-left shadow-2xs transition-all hover:border-[#F85606]"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <img
                          src={currentCountry.flagUrl}
                          alt={currentCountry.name}
                          className="h-6 w-9 shrink-0 rounded-xs border border-slate-300 object-cover shadow-2xs"
                        />
                        <div className="min-w-0">
                          <p className="truncate font-display text-sm font-extrabold text-slate-950">
                            {currentCountry.name}{' '}
                            <span className="font-mono text-xs font-bold text-[#F85606]">
                              ({currentCountry.dialCode})
                            </span>
                          </p>
                          <p className="truncate text-xs text-slate-500">
                            {currentCountry.shippingZone} · {currentCountry.currency}
                          </p>
                        </div>
                      </div>

                      <div className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700">
                        <span>{isCountryDropdownOpen ? 'Hide' : 'Select Country'}</span>
                        <ChevronDown
                          className={`h-4 w-4 text-[#F85606] transition-transform duration-200 ${
                            isCountryDropdownOpen ? 'rotate-180' : ''
                          }`}
                        />
                      </div>
                    </button>

                    {/* Collapsible Country Dropdown List (Hidden until Arrow Bar is clicked) */}
                    {isCountryDropdownOpen && (
                      <div className="max-h-64 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-2.5 shadow-inner">
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          {COUNTRIES_WITH_FLAGS.map((c) => {
                            const isSelected = c.code === selectedCountryCode;
                            return (
                              <button
                                key={c.code}
                                type="button"
                                onClick={() => {
                                  onUpdateCountryCode(c.code);
                                  setIsCountryDropdownOpen(false);
                                }}
                                className={`flex items-center justify-between gap-2.5 rounded-xl border p-3 text-left transition-all ${
                                  isSelected
                                    ? 'border-[#F85606] bg-[#FFF5F0] ring-2 ring-[#F85606]/20'
                                    : 'border-slate-200 bg-white hover:border-orange-200 hover:bg-orange-50/40'
                                }`}
                              >
                                <div className="flex min-w-0 items-center gap-2.5">
                                  <img
                                    src={c.flagUrl}
                                    alt={c.name}
                                    className="h-5 w-8 shrink-0 rounded-xs border border-slate-200 object-cover shadow-2xs"
                                  />
                                  <div className="min-w-0">
                                    <p className="truncate text-xs font-bold text-slate-900">
                                      {c.name}
                                    </p>
                                    <p className="truncate font-mono text-[10px] text-slate-500">
                                      {c.dialCode} · {c.shippingZone}
                                    </p>
                                  </div>
                                </div>
                                {isSelected && (
                                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#F85606] text-white">
                                    <Check className="h-3 w-3" />
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 2. Language Selection Dropdown Arrow Bar */}
                  <div className="space-y-2.5 border-t border-slate-200 pt-5">
                    <div className="flex items-center gap-2">
                      <Languages className="h-4 w-4 text-[#F85606]" />
                      <div>
                        <h3 className="font-display text-sm font-bold text-slate-950">
                          {t.languagePreference}
                        </h3>
                        <p className="text-xs text-slate-500">{t.selectLanguageSubtitle}</p>
                      </div>
                    </div>

                    {/* Language Dropdown Trigger Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsLanguageDropdownOpen((prev) => !prev);
                        setIsCountryDropdownOpen(false);
                      }}
                      className="flex w-full items-center justify-between gap-3 rounded-2xl border-2 border-orange-200 bg-white px-4 py-3.5 text-left shadow-2xs transition-all hover:border-[#F85606]"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#FFF3EB] font-display text-xs font-extrabold text-[#F85606] uppercase">
                          {currentLanguage.code}
                        </div>
                        <div>
                          <p className="font-display text-sm font-extrabold text-slate-950">
                            {currentLanguage.nativeLabel} · {currentLanguage.label}
                          </p>
                          <p className="text-xs text-slate-500">{currentLanguage.regionNote}</p>
                        </div>
                      </div>

                      <div className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700">
                        <span>{isLanguageDropdownOpen ? 'Hide' : 'Select Language'}</span>
                        <ChevronDown
                          className={`h-4 w-4 text-[#F85606] transition-transform duration-200 ${
                            isLanguageDropdownOpen ? 'rotate-180' : ''
                          }`}
                        />
                      </div>
                    </button>

                    {/* Collapsible Language Dropdown List (Hidden until Arrow Bar is clicked) */}
                    {isLanguageDropdownOpen && (
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-2.5 shadow-inner">
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          {LANGUAGES_LIST.map((lang) => {
                            const isSelected = lang.code === selectedLanguageCode;
                            return (
                              <button
                                key={lang.code}
                                type="button"
                                onClick={() => {
                                  onUpdateLanguageCode(lang.code);
                                  setIsLanguageDropdownOpen(false);
                                }}
                                className={`flex items-center justify-between rounded-xl border p-3 text-left transition-all ${
                                  isSelected
                                    ? 'border-[#F85606] bg-[#FFF5F0] ring-2 ring-[#F85606]/20'
                                    : 'border-slate-200 bg-white hover:border-orange-200 hover:bg-orange-50/40'
                                }`}
                              >
                                <div>
                                  <p className="text-xs font-extrabold text-slate-900">
                                    {lang.nativeLabel} · {lang.label}
                                  </p>
                                  <p className="mt-0.5 text-[11px] text-slate-500">
                                    {lang.regionNote}
                                  </p>
                                </div>
                                {isSelected && (
                                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#F85606] text-white">
                                    <Check className="h-3 w-3" />
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end border-t border-slate-200 pt-4">
                    <button
                      type="button"
                      onClick={onClose}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[#F85606] px-5 py-2.5 text-xs font-extrabold text-white shadow-sm hover:bg-[#d94800]"
                    >
                      <Check className="h-4 w-4" />
                      <span>{t.confirmCountryLanguage}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 4: CREDIT / DEBIT CARDS MANAGER */}
              {activeTab === 'cards' && (
                <div className="space-y-6">
                  {/* Saved Cards Grid */}
                  <div>
                    <h3 className="font-display text-sm font-bold text-slate-950">
                      Saved Credit & Debit Cards ({savedCards.length})
                    </h3>
                    <p className="text-xs text-slate-500">
                      Cards saved here appear directly in the Checkout Payment Options for 1-click LKR payment
                    </p>

                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {savedCards.map((card) => (
                        <div
                          key={card.id}
                          className={`relative flex flex-col justify-between overflow-hidden rounded-2xl p-4 text-white shadow-md ${
                            card.brand === 'Visa'
                              ? 'bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900'
                              : card.brand === 'Mastercard'
                              ? 'bg-gradient-to-br from-slate-900 via-[#3b1506] to-[#F85606]'
                              : 'bg-gradient-to-br from-emerald-950 via-teal-900 to-slate-900'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="rounded-md bg-white/15 px-2.5 py-0.5 font-mono text-xs font-extrabold tracking-wider uppercase">
                              {card.brand} · {card.cardType}
                            </span>
                            {card.isDefault ? (
                              <span className="rounded-md bg-emerald-500 px-2 py-0.5 text-[10px] font-extrabold text-white uppercase">
                                Default Card
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => onSetDefaultCard(card.id)}
                                className="rounded-md bg-white/15 px-2 py-0.5 text-[10px] font-bold text-white hover:bg-white/25"
                              >
                                Set Default
                              </button>
                            )}
                          </div>

                          <div className="my-4">
                            <p className="font-mono text-lg font-extrabold tracking-widest text-white">
                              •••• •••• •••• {card.last4}
                            </p>
                            <p className="mt-0.5 text-[11px] text-white/75">{card.bankName}</p>
                          </div>

                          <div className="flex items-center justify-between border-t border-white/15 pt-2.5 text-xs">
                            <div>
                              <span className="block text-[10px] text-white/60 uppercase">
                                Cardholder
                              </span>
                              <span className="font-mono text-xs font-bold">
                                {card.holderName}
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <div>
                                <span className="block text-[10px] text-white/60 uppercase">
                                  Expires
                                </span>
                                <span className="font-mono text-xs font-bold">
                                  {card.expiry}
                                </span>
                              </div>
                              {savedCards.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => onRemoveCard(card.id)}
                                  className="rounded-lg bg-red-500/25 p-1.5 text-red-200 hover:bg-red-500/40 hover:text-white"
                                  title="Remove card"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Add New Credit / Debit Card Form */}
                  <form
                    onSubmit={handleAddCardSubmit}
                    className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 sm:p-5"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Plus className="h-4 w-4 text-[#F85606]" />
                        <h4 className="font-display text-sm font-bold text-slate-950">
                          Add New Credit / Debit Card
                        </h4>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700">
                        <ShieldCheck className="h-4 w-4" />
                        <span>256-Bit Encrypted LKR Checkout</span>
                      </div>
                    </div>

                    {cardFormFeedback && (
                      <div className="mb-3 rounded-xl border border-orange-200 bg-[#FFF3EB] px-3.5 py-2 text-xs font-semibold text-[#F85606]">
                        {cardFormFeedback}
                      </div>
                    )}

                    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-12">
                      <div className="sm:col-span-6">
                        <label className="mb-1 block text-xs font-bold text-slate-700">
                          Card Number (Visa / Mastercard / Amex)
                        </label>
                        <input
                          type="text"
                          required
                          value={cardNumberInput}
                          onChange={(e) => handleFormatCardNumber(e.target.value)}
                          placeholder="4532 •••• •••• 8899"
                          className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 font-mono text-xs font-bold text-slate-900 focus:border-[#F85606] focus:outline-none"
                        />
                      </div>

                      <div className="sm:col-span-6">
                        <label className="mb-1 block text-xs font-bold text-slate-700">
                          Cardholder Name (As on Card)
                        </label>
                        <input
                          type="text"
                          required
                          value={cardHolderInput}
                          onChange={(e) => setCardHolderInput(e.target.value)}
                          placeholder="PRAMU PERERA"
                          className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 font-mono text-xs uppercase text-slate-900 focus:border-[#F85606] focus:outline-none"
                        />
                      </div>

                      <div className="sm:col-span-3">
                        <label className="mb-1 block text-xs font-bold text-slate-700">
                          Expiry (MM/YY)
                        </label>
                        <input
                          type="text"
                          required
                          value={cardExpiryInput}
                          onChange={(e) => handleFormatExpiry(e.target.value)}
                          placeholder="09/29"
                          className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 font-mono text-xs font-bold text-slate-900 focus:border-[#F85606] focus:outline-none"
                        />
                      </div>

                      <div className="sm:col-span-3">
                        <label className="mb-1 block text-xs font-bold text-slate-700">
                          CVV / CVC
                        </label>
                        <input
                          type="password"
                          required
                          maxLength={4}
                          value={cardCvvInput}
                          onChange={(e) => setCardCvvInput(e.target.value.replace(/\D/g, ''))}
                          placeholder="•••"
                          className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 font-mono text-xs font-bold text-slate-900 focus:border-[#F85606] focus:outline-none"
                        />
                      </div>

                      <div className="sm:col-span-3">
                        <label className="mb-1 block text-xs font-bold text-slate-700">
                          Card Type
                        </label>
                        <select
                          value={cardTypeInput}
                          onChange={(e) =>
                            setCardTypeInput(e.target.value === 'Debit' ? 'Debit' : 'Credit')
                          }
                          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 focus:border-[#F85606] focus:outline-none"
                        >
                          <option value="Credit">Credit Card</option>
                          <option value="Debit">Debit Card</option>
                        </select>
                      </div>

                      <div className="sm:col-span-3">
                        <label className="mb-1 block text-xs font-bold text-slate-700">
                          Issuing Bank
                        </label>
                        <input
                          type="text"
                          value={bankNameInput}
                          onChange={(e) => setBankNameInput(e.target.value)}
                          placeholder="Commercial / Sampath"
                          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-[#F85606] focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="mt-4 flex justify-end">
                      <button
                        type="submit"
                        className="inline-flex items-center gap-1.5 rounded-xl bg-[#F85606] px-5 py-2.5 text-xs font-extrabold text-white shadow-sm transition-colors hover:bg-[#d94800]"
                      >
                        <CreditCard className="h-4 w-4" />
                        <span>Save Credit / Debit Card</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
