export type SupportedLanguageCode = 'en' | 'si' | 'ta' | 'ar' | 'hi';

export interface AppTranslations {
  // Top Header & Navigation
  home: string;
  shop: string;
  cart: string;
  account: string;
  allProducts: string;
  buykitHub: string;
  compare: string;
  pickupHubs: string;
  checkout: string;
  signIn: string;
  logout: string;

  // Search & Filters
  searchPlaceholder: string;
  searchBtn: string;
  clearBtn: string;
  inStock: string;
  outOfStock: string;
  resetFilters: string;
  popularSearches: string;

  // Product Card & Product View
  freeDelivery: string;
  paidDelivery: string;
  sold: string;
  addToCart: string;
  buyNow: string;
  details: string;
  backToShop: string;
  fullProductView: string;
  couponsAndPrice: string;
  detailsAndSpecs: string;
  reviewsAndQa: string;
  finalPriceLabel: string;
  youSave: string;
  viewCoupons: string;
  hideCoupons: string;
  optionalCouponsHint: string;
  productOverview: string;
  keySpecifications: string;
  buyerProtectionTitle: string;
  totalPrice: string;

  // Home & Shop Sections
  flashSaleTitle: string;
  newUserZoneTitle: string;
  officialMallShowing: string;

  // Checkout View
  checkoutHeaderTitle: string;
  checkoutHeaderSubtitle: string;
  addMoreProducts: string;
  editAddressProfile: string;
  packageItems: string;
  appliedCouponsTitle: string;
  changeSelectCoupon: string;
  hideCouponList: string;
  selectPaymentMethod: string;
  addNewCard: string;
  finalBillSummary: string;
  totalAmountToPay: string;
  totalPayable: string;
  payNow: string;

  // Account Settings Modal
  accountSettingsTitle: string;
  tabProfileContacts: string;
  tabDeliveryAddress: string;
  tabCountryLanguage: string;
  tabCreditDebitCards: string;
  selectShippingCountry: string;
  selectCountrySubtitle: string;
  languagePreference: string;
  selectLanguageSubtitle: string;
  confirmCountryLanguage: string;
}

export const TRANSLATIONS: Record<SupportedLanguageCode, AppTranslations> = {
  en: {
    home: 'Home',
    shop: 'Shop',
    cart: 'Cart',
    account: 'Account',
    allProducts: 'All Products',
    buykitHub: 'BuyKit Hub',
    compare: 'Compare',
    pickupHubs: 'Pickup Hubs',
    checkout: 'Checkout',
    signIn: 'Sign In',
    logout: 'Logout',

    searchPlaceholder: 'Search LKR products by name, brand, or feature...',
    searchBtn: 'Search',
    clearBtn: 'Clear',
    inStock: 'In Stock',
    outOfStock: 'Out of Stock',
    resetFilters: 'Reset',
    popularSearches: 'Popular Searches:',

    freeDelivery: 'Free Delivery',
    paidDelivery: 'Paid Delivery',
    sold: 'Sold',
    addToCart: 'Add Cart',
    buyNow: 'Buy Now',
    details: 'Details',
    backToShop: 'Back to Shop',
    fullProductView: 'Full Product View',
    couponsAndPrice: 'Coupons & Price',
    detailsAndSpecs: 'Details & Specs',
    reviewsAndQa: 'Reviews & Q&A',
    finalPriceLabel: 'Final Price (With Active Deal & Selected Coupon)',
    youSave: 'You Save',
    viewCoupons: 'View Coupons',
    hideCoupons: 'Hide Coupons',
    optionalCouponsHint: 'Optional — Click arrow to view & select a coupon if you want',
    productOverview: 'Product Overview & Full Details',
    keySpecifications: "Key Specifications & What's in the Box",
    buyerProtectionTitle: 'BuyKit Mall Buyer Protection & Delivery',
    totalPrice: 'Total Price',

    flashSaleTitle: 'Flash Sale · Limited Time SuperDeals',
    newUserZoneTitle: 'New User Exclusive Deals · Up to 65% Off',
    officialMallShowing: 'BuyKit Official Mall · Products',

    checkoutHeaderTitle: 'BuyKit Order Checkout & Payment',
    checkoutHeaderSubtitle:
      'Verify your shipping address, customize applied LKR coupons, and choose your payment method',
    addMoreProducts: '+ Add More Products',
    editAddressProfile: 'Edit Address / Profile',
    packageItems: 'Package Items',
    appliedCouponsTitle: 'Applied Coupons & Vouchers',
    changeSelectCoupon: 'Change / Select Coupon',
    hideCouponList: 'Hide Coupon List',
    selectPaymentMethod: 'Select Payment Method',
    addNewCard: '+ Add New Credit / Debit Card',
    finalBillSummary: 'Final Checkout Bill Summary',
    totalAmountToPay: 'Total Amount to Pay',
    totalPayable: 'Total Payable',
    payNow: 'Pay Now',

    accountSettingsTitle: 'Account & Regional Settings',
    tabProfileContacts: 'Profile & Contacts',
    tabDeliveryAddress: 'Delivery Address',
    tabCountryLanguage: 'Country & Language',
    tabCreditDebitCards: 'Credit / Debit Cards',
    selectShippingCountry: 'Select Shipping Country / Region (With Flag)',
    selectCountrySubtitle: 'Click the dropdown arrow to choose your delivery country',
    languagePreference: 'Language Preference',
    selectLanguageSubtitle: 'Click the dropdown arrow to switch display language',
    confirmCountryLanguage: 'Confirm Country & Language',
  },

  si: {
    home: 'මුල් පිටුව',
    shop: 'භාණ්ඩ (Shop)',
    cart: 'කාට් එක',
    account: 'ගිණුම',
    allProducts: 'සියලුම භාණ්ඩ',
    buykitHub: 'BuyKit මධ්‍යස්ථානය',
    compare: 'සංසන්දනය',
    pickupHubs: 'බෙදාහැරීමේ මධ්‍යස්ථාන',
    checkout: 'ගෙවීම් (Checkout)',
    signIn: 'පිවිසෙන්න',
    logout: 'ඉවත් වන්න',

    searchPlaceholder: 'ඔබට අවශ්‍ය භාණ්ඩයේ නම හෝ වර්ගය මෙහි සොයන්න...',
    searchBtn: 'සොයන්න',
    clearBtn: 'මකන්න',
    inStock: 'තොග ඇත (In Stock)',
    outOfStock: 'තොග අවසන්',
    resetFilters: 'යළි සකසන්න',
    popularSearches: 'ජනප්‍රිය සෙවුම්:',

    freeDelivery: 'නොමිලේ ප්‍රවාහනය',
    paidDelivery: 'ප්‍රවාහන ගාස්තු සහිතයි',
    sold: 'අලෙවි විය',
    addToCart: 'Add Cart (කාට් එකට)',
    buyNow: 'Buy Now (මිලදී ගන්න)',
    details: 'විස්තර',
    backToShop: 'ආපසු වෙළඳසැලට',
    fullProductView: 'සම්පූර්ණ විස්තරය',
    couponsAndPrice: 'වට්ටම් සහ මිල',
    detailsAndSpecs: 'විශේෂාංග (Specs)',
    reviewsAndQa: 'අදහස් සහ ප්‍රශ්න (Reviews)',
    finalPriceLabel: 'අවසාන මිල (වට්ටම් සහ තෝරාගත් කූපන් සමඟ)',
    youSave: 'ඔබේ ඉතිරිය',
    viewCoupons: 'කූපන් බලන්න',
    hideCoupons: 'කූපන් සඟවන්න',
    optionalCouponsHint: 'අවශ්‍ය නම් පමණක් ඊතලය ඔබා කූපනයක් තෝරාගන්න',
    productOverview: 'භාණ්ඩයේ සම්පූර්ණ විස්තරය',
    keySpecifications: 'ප්‍රධාන විශේෂාංග සහ අඩංගු දෑ',
    buyerProtectionTitle: 'BuyKit පාරිභෝගික ආරක්ෂාව සහ බෙදාහැරීම',
    totalPrice: 'මුළු මිල',

    flashSaleTitle: 'Flash Sale · විශේෂ වට්ටම් දීමනා',
    newUserZoneTitle: 'නව පාරිභෝගික විශේෂ වට්ටම් (65% දක්වා)',
    officialMallShowing: 'BuyKit නිල වෙළඳසැල · භාණ්ඩ',

    checkoutHeaderTitle: 'BuyKit ඇණවුම් සහ ගෙවීම් පිටුව (Checkout)',
    checkoutHeaderSubtitle:
      'ඔබේ ලිපිනය, වට්ටම් කූපන් සහ ගෙවීමේ ක්‍රමය පරීක්ෂා කර ඇණවුම තහවුරු කරන්න',
    addMoreProducts: '+ තවත් භාණ්ඩ එක් කරන්න',
    editAddressProfile: 'ලිපිනය / විස්තර වෙනස් කරන්න',
    packageItems: 'ඇණවුම් කරන භාණ්ඩ',
    appliedCouponsTitle: 'එක් කර ඇති කූපන් සහ වට්ටම්',
    changeSelectCoupon: 'කූපනය වෙනස් කරන්න',
    hideCouponList: 'කූපන් ලැයිස්තුව වසන්න',
    selectPaymentMethod: 'ගෙවීමේ ක්‍රමය තෝරන්න (Payment Method)',
    addNewCard: '+ නව බැංකු කාඩ්පතක් එක් කරන්න',
    finalBillSummary: 'අවසාන බිල්පත් සාරාංශය',
    totalAmountToPay: 'ගෙවිය යුතු මුළු මුදල',
    totalPayable: 'මුළු ගෙවීම',
    payNow: 'Pay Now (දැන් ගෙවන්න)',

    accountSettingsTitle: 'ගිණුම් සහ භාෂා සැකසුම් (Settings)',
    tabProfileContacts: 'පෞද්ගලික විස්තර',
    tabDeliveryAddress: 'බෙදාහැරීමේ ලිපිනය',
    tabCountryLanguage: 'රට සහ භාෂාව',
    tabCreditDebitCards: 'බැංකු කාඩ්පත් (Cards)',
    selectShippingCountry: 'බෙදාහැරීමේ රට තෝරන්න (කොඩිය සමඟ)',
    selectCountrySubtitle: 'ඊතලය (Dropdown) ඔබා ඔබේ රට තෝරාගන්න',
    languagePreference: 'භාෂාව තෝරන්න (Language)',
    selectLanguageSubtitle: 'ඊතලය (Dropdown) ඔබා ඔබට අවශ්‍ය භාෂාව තෝරාගන්න',
    confirmCountryLanguage: 'රට සහ භාෂාව තහවුරු කරන්න',
  },

  ta: {
    home: 'முகப்பு',
    shop: 'கடை (Shop)',
    cart: 'கூடை',
    account: 'கணக்கு',
    allProducts: 'அனைத்து பொருட்கள்',
    buykitHub: 'BuyKit மையம்',
    compare: 'ஒப்பிடு',
    pickupHubs: 'பிக்கப் மையங்கள்',
    checkout: 'செக்அவுட்',
    signIn: 'உள்நுழைக',
    logout: 'வெளியேறு',

    searchPlaceholder: 'பொருட்கள், பிராண்டுகளைத் தேடுங்கள்...',
    searchBtn: 'தேடு',
    clearBtn: 'அழி',
    inStock: 'கையிருப்பில் உள்ளது',
    outOfStock: 'கையிருப்பு இல்லை',
    resetFilters: 'மீட்டமை',
    popularSearches: 'பிரபலமான தேடல்கள்:',

    freeDelivery: 'இலவச டெலிவரி',
    paidDelivery: 'கட்டண டெலிவரி',
    sold: 'விற்கப்பட்டது',
    addToCart: 'Add Cart',
    buyNow: 'Buy Now',
    details: 'விவரங்கள்',
    backToShop: 'கடைக்குத் திரும்பு',
    fullProductView: 'முழு விவரம்',
    couponsAndPrice: 'கூப்பன்கள் & விலை',
    detailsAndSpecs: 'சிறப்பம்சங்கள்',
    reviewsAndQa: 'விமர்சனங்கள் & Q&A',
    finalPriceLabel: 'இறுதி விலை (தள்ளுபடி & கூப்பனுடன்)',
    youSave: 'சேமிப்பு',
    viewCoupons: 'கூப்பன்களைப் பார்',
    hideCoupons: 'கூப்பன்களை மறை',
    optionalCouponsHint: 'விருப்பப்பட்டால் கூப்பனைத் தேர்ந்தெடுக்க அம்புக்குறியை அழுத்தவும்',
    productOverview: 'பொருள் பற்றிய முழு விவரம்',
    keySpecifications: 'முக்கிய சிறப்பம்சங்கள்',
    buyerProtectionTitle: 'BuyKit வாங்குபவர் பாதுகாப்பு & டெலிவரி',
    totalPrice: 'மொத்த விலை',

    flashSaleTitle: 'Flash Sale · சிறப்பு சலுகைகள்',
    newUserZoneTitle: 'புதிய பயனர் சலுகைகள் · 65% வரை தள்ளுபடி',
    officialMallShowing: 'BuyKit அதிகாரப்பூர்வ மால் · பொருட்கள்',

    checkoutHeaderTitle: 'BuyKit ஆர்டர் & கட்டணம் (Checkout)',
    checkoutHeaderSubtitle: 'முகவரி, கூப்பன்கள் மற்றும் கட்டண முறையைத் தேர்ந்தெடுக்கவும்',
    addMoreProducts: '+ மேலும் பொருட்களைச் சேர்',
    editAddressProfile: 'முகவரியைத் திருத்து',
    packageItems: 'ஆர்டர் பொருட்கள்',
    appliedCouponsTitle: 'கூப்பன்கள் & வவுச்சர்கள்',
    changeSelectCoupon: 'கூப்பனை மாற்று',
    hideCouponList: 'பட்டியலை மறை',
    selectPaymentMethod: 'கட்டண முறையைத் தேர்ந்தெடுக்கவும்',
    addNewCard: '+ புதிய கார்டைச் சேர்',
    finalBillSummary: 'இறுதி பில் சுருக்கம்',
    totalAmountToPay: 'செலுத்த வேண்டிய மொத்த தொகை',
    totalPayable: 'மொத்த தொகை',
    payNow: 'Pay Now (இப்போது செலுத்து)',

    accountSettingsTitle: 'கணக்கு & மொழி அமைப்புகள்',
    tabProfileContacts: 'சுயவிவரம் & தொடர்பு',
    tabDeliveryAddress: 'டெலிவரி முகவரி',
    tabCountryLanguage: 'நாடு & மொழி',
    tabCreditDebitCards: 'கிரெடிட் / டெபிட் கார்டுகள்',
    selectShippingCountry: 'நாட்டைத் தேர்ந்தெடுக்கவும் (கொடியுடன்)',
    selectCountrySubtitle: 'நாட்டை மாற்ற கீழ் அம்புக்குறியை அழுத்தவும்',
    languagePreference: 'மொழி தேர்வு (Language)',
    selectLanguageSubtitle: 'மொழியை மாற்ற கீழ் அம்புக்குறியை அழுத்தவும்',
    confirmCountryLanguage: 'நாடு & மொழியை உறுதிப்படுத்து',
  },

  ar: {
    home: 'الرئيسية',
    shop: 'المتجر',
    cart: 'السلة',
    account: 'حسابي',
    allProducts: 'جميع المنتجات',
    buykitHub: 'مركز BuyKit',
    compare: 'مقارنة',
    pickupHubs: 'مراكز الاستلام',
    checkout: 'الدفع',
    signIn: 'تسجيل الدخول',
    logout: 'خروج',

    searchPlaceholder: 'ابحث عن المنتجات أو العلامات التجارية...',
    searchBtn: 'بحث',
    clearBtn: 'مسح',
    inStock: 'متوفر',
    outOfStock: 'غير متوفر',
    resetFilters: 'إعادة ضبط',
    popularSearches: 'عمليات البحث الشائعة:',

    freeDelivery: 'توصيل مجاني',
    paidDelivery: 'توصيل مدفوع',
    sold: 'مباع',
    addToCart: 'أضف للسلة',
    buyNow: 'اشتر الآن',
    details: 'التفاصيل',
    backToShop: 'العودة للمتجر',
    fullProductView: 'عرض المنتج الكامل',
    couponsAndPrice: 'الكوبونات والسعر',
    detailsAndSpecs: 'المواصفات',
    reviewsAndQa: 'التقييمات والأسئلة',
    finalPriceLabel: 'السعر النهائي (مع العرض والكوبون)',
    youSave: 'توفر',
    viewCoupons: 'عرض الكوبونات',
    hideCoupons: 'إخفاء الكوبونات',
    optionalCouponsHint: 'اختياري — اضغط على السهم لاختيار كوبون خصم',
    productOverview: 'نظرة عامة وتفاصيل المنتج',
    keySpecifications: 'المواصفات الرئيسية ومحتويات العلبة',
    buyerProtectionTitle: 'حماية المشتري والتوصيل من BuyKit',
    totalPrice: 'السعر الإجمالي',

    flashSaleTitle: 'عروض البرق · خصومات حصرية',
    newUserZoneTitle: 'عروض المستخدمين الجدد · خصم حتى 65%',
    officialMallShowing: 'متجر BuyKit الرسمي · المنتجات',

    checkoutHeaderTitle: 'إتمام الطلب والدفع في BuyKit',
    checkoutHeaderSubtitle: 'تحقق من عنوان الشحن والكوبونات واختر طريقة الدفع',
    addMoreProducts: '+ إضافة المزيد من المنتجات',
    editAddressProfile: 'تعديل العنوان / الملف',
    packageItems: 'منتجات الطلب',
    appliedCouponsTitle: 'الكوبونات والقسائم المطبقة',
    changeSelectCoupon: 'تغيير / اختيار كوبون',
    hideCouponList: 'إخفاء قائمة الكوبونات',
    selectPaymentMethod: 'اختر طريقة الدفع',
    addNewCard: '+ إضافة بطاقة ائتمان / خصم جديدة',
    finalBillSummary: 'ملخص الفاتورة النهائي',
    totalAmountToPay: 'إجمالي المبلغ المطلوب دفعه',
    totalPayable: 'الإجمالي للدفع',
    payNow: 'Pay Now (ادفع الآن)',

    accountSettingsTitle: 'إعدادات الحساب واللغة',
    tabProfileContacts: 'الملف الشخصي وجهات الاتصال',
    tabDeliveryAddress: 'عنوان التوصيل',
    tabCountryLanguage: 'الدولة واللغة',
    tabCreditDebitCards: 'البطاقات البنكية',
    selectShippingCountry: 'اختر دولة الشحن (مع العلم)',
    selectCountrySubtitle: 'اضغط على السهم لاختيار دولة التوصيل',
    languagePreference: 'تفضيل اللغة (Language)',
    selectLanguageSubtitle: 'اضغط على السهم لتغيير لغة التطبيق',
    confirmCountryLanguage: 'تأكيد الدولة واللغة',
  },

  hi: {
    home: 'होम',
    shop: 'शॉप (Shop)',
    cart: 'कार्ट',
    account: 'अकाउंट',
    allProducts: 'सभी प्रोडक्ट्स',
    buykitHub: 'BuyKit हब',
    compare: 'तुलना करें',
    pickupHubs: 'पिकअप हब',
    checkout: 'चेकआउट',
    signIn: 'साइन इन',
    logout: 'लॉग आउट',

    searchPlaceholder: 'नाम या ब्रांड से प्रोडक्ट्स खोजें...',
    searchBtn: 'खोजें',
    clearBtn: 'हटाएं',
    inStock: 'स्टॉक में है',
    outOfStock: 'स्टॉक समाप्त',
    resetFilters: 'रीसेट',
    popularSearches: 'लोकप्रिय खोजें:',

    freeDelivery: 'फ्री डिलीवरी',
    paidDelivery: 'पेड डिलीवरी',
    sold: 'बिक गए',
    addToCart: 'Add Cart',
    buyNow: 'Buy Now',
    details: 'विवरण',
    backToShop: 'शॉप पर वापस जाएं',
    fullProductView: 'पूरा विवरण',
    couponsAndPrice: 'कूपन और कीमत',
    detailsAndSpecs: 'स्पेसिफिकेशन',
    reviewsAndQa: 'रिव्यू और Q&A',
    finalPriceLabel: 'अंतिम कीमत (डील और चुने गए कूपन के साथ)',
    youSave: 'आपकी बचत',
    viewCoupons: 'कूपन देखें',
    hideCoupons: 'कूपन छिपाएं',
    optionalCouponsHint: 'वैकल्पिक — कूपन चुनने के लिए तीर पर क्लिक करें',
    productOverview: 'प्रोडक्ट का पूरा विवरण',
    keySpecifications: 'मुख्य विशेषताएं और बॉक्स में क्या है',
    buyerProtectionTitle: 'BuyKit ग्राहक सुरक्षा और डिलीवरी',
    totalPrice: 'कुल कीमत',

    flashSaleTitle: 'Flash Sale · सीमित समय के ऑफर्स',
    newUserZoneTitle: 'नए यूजर ऑफर्स · 65% तक की छूट',
    officialMallShowing: 'BuyKit आधिकारिक मॉल · प्रोडक्ट्स',

    checkoutHeaderTitle: 'BuyKit ऑर्डर चेकआउट और पेमेंट',
    checkoutHeaderSubtitle: 'अपना पता, कूपन और पेमेंट विकल्प जांचें',
    addMoreProducts: '+ और प्रोडक्ट्स जोड़ें',
    editAddressProfile: 'पता / प्रोफाइल बदलें',
    packageItems: 'ऑर्डर आइटम्स',
    appliedCouponsTitle: 'लागू कूपन और वाउचर',
    changeSelectCoupon: 'कूपन बदलें / चुनें',
    hideCouponList: 'कूपन सूची छिपाएं',
    selectPaymentMethod: 'पेमेंट का तरीका चुनें',
    addNewCard: '+ नया क्रेडिट / डेबिट कार्ड जोड़ें',
    finalBillSummary: 'अंतिम बिल सारांश',
    totalAmountToPay: 'भुगतान करने के लिए कुल राशि',
    totalPayable: 'कुल देय राशि',
    payNow: 'Pay Now (अभी भुगतान करें)',

    accountSettingsTitle: 'अकाउंट और भाषा सेटिंग्स',
    tabProfileContacts: 'प्रोफाइल और संपर्क',
    tabDeliveryAddress: 'डिलीवरी का पता',
    tabCountryLanguage: 'देश और भाषा',
    tabCreditDebitCards: 'क्रेडिट / डेबिट कार्ड',
    selectShippingCountry: 'शिपिंग देश चुनें (झंडे के साथ)',
    selectCountrySubtitle: 'देश चुनने के लिए ड्रॉपडाउन तीर पर क्लिक करें',
    languagePreference: 'भाषा चुनें (Language)',
    selectLanguageSubtitle: 'भाषा बदलने के लिए ड्रॉपडाउन तीर पर क्लिक करें',
    confirmCountryLanguage: 'देश और भाषा की पुष्टि करें',
  },
};

export function getTranslations(languageCode?: string): AppTranslations {
  const normalized = (languageCode || 'en').toLowerCase() as SupportedLanguageCode;
  return TRANSLATIONS[normalized] || TRANSLATIONS.en;
}
