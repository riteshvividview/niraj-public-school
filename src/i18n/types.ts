/**
 * Every dictionary in src/i18n/dictionaries must implement this shape.
 * Grows as later phases build real screens — add new keys here first,
 * then fill them in for en/hi/te together so no language falls behind.
 */
export interface Dictionary {
  appName: string;
  language: string;
  continueLabel: string;
  welcome: string;

  nav: {
    home: string;
    essentials: string;
    programs: string;
    receipts: string;
    profile: string;
  };

  /**
   * Labels for StatusBadge. Keys are camelCase versions of every status value
   * across ProgramStatus / OrderStatus / RedemptionStatus (e.g. domain
   * "filling-fast" → key "fillingFast") — see toBadgeStatus() in
   * src/components/shared/status-badge.tsx.
   */
  status: {
    open: string;
    fillingFast: string;
    full: string;
    closed: string;
    paid: string;
    pending: string;
    failed: string;
    refunded: string;
    ready: string;
    partiallyCollected: string;
    collected: string;
    checkedIn: string;
    cancelled: string;
  };

  common: {
    viewDetails: string;
    remove: string;
    total: string;
    noItemsYet: string;
    seatsLeft: string;
    download: string;
    share: string;
    showAtCounter: string;
    showAtEntry: string;
    ticketLabel: string;
    back: string;
    change: string;
    next: string;
    previous: string;
    /** e.g. "Page" in "Page 2 / 5" — combined with a plain "n / total" the caller formats. */
    pageOf: string;
    collected: string;
    pendingCollection: string;
  };

  auth: {
    language: {
      title: string;
      subtitle: string;
      next: string;
    };
    login: {
      title: string;
      subtitle: string;
      registerNumberLabel: string;
      registerNumberPlaceholder: string;
      passwordLabel: string;
      passwordPlaceholder: string;
      showPasswordLabel: string;
      hidePasswordLabel: string;
      submit: string;
      invalidCredentials: string;
      /** Shown below the form — no self-registration, so this points students at staff instead. */
      cantLogIn: string;
      forgotPasswordLink: string;
    };
    forgotPassword: {
      title: string;
      registerNumberLabel: string;
      registerNumberPlaceholder: string;
      sendOtpLabel: string;
      /** Template with "{email}" placeholder — the masked email the code was sent to. */
      otpSentTemplate: string;
      successTitle: string;
      successDescription: string;
      backToLogin: string;
    };
  };

  home: {
    upcomingProgramsTitle: string;
    viewAll: string;
    hasReceiptsMessage: string;
    noReceiptsTitle: string;
    noReceiptsDescription: string;
  };

  essentials: {
    books: string;
    uniform: string;
    hubTitle: string;
    hubSubtitle: string;
    /** Template with "{selected}" and "{total}" placeholders. */
    selectedCount: string;
    /** Template with "{selected}" and "{total}" placeholders. */
    confirmedCount: string;
    reviewAndPay: string;
    /** Template with "{n}" placeholder. */
    itemsCount: string;
    sizeGuideCta: string;
    sizeGuideTitle: string;
    sizeGuideAgeColumn: string;
    sizeGuideHeightColumn: string;
    chooseSizeLabel: string;
    sizePlaceholder: string;
    sizeConfirmed: string;
    sizeNotConfirmed: string;
    sizeUnselectOption: string;
    notNeeded: string;
    booksSubtitle: string;
    /** Books selection step — choose 2nd language / specialization / specialization 2. */
    selectionSubtitle: string;
    secondLanguageLabel: string;
    specializationLabel: string;
    specialization2Label: string;
    languageHindi: string;
    languageTelugu: string;
    streamScience: string;
    streamEconomics: string;
    electiveEna: string;
    electiveHomeScience: string;
    electiveRoboticsAI: string;
    yourSelectionTitle: string;
    changeSelection: string;
    noBookSetTitle: string;
    noBookSetDescription: string;
    notSelectedYet: string;
  };

  cart: {
    title: string;
    orderSummary: string;
    noFeeNote: string;
    emptyTitle: string;
    emptyDescription: string;
    proceedToPayment: string;
    changeSize: string;
  };

  payment: {
    title: string;
    methodLabel: string;
    upi: string;
    card: string;
    netbanking: string;
    payNow: string;
    processing: string;
    failureTitle: string;
    failureDescription: string;
    tryAgain: string;
    devFailureToggle: string;
    successTitle: string;
    successDescription: string;
    itemsLabel: string;
  };

  receiptsPage: {
    title: string;
    emptyTitle: string;
    emptyDescription: string;
    receiptCodeLabel: string;
    /** Short nouns used to compose a per-order title — see deriveReceiptTitle in src/lib/cart-items.ts. */
    titleBooks: string;
    titleUniform: string;
    titleReceiptWord: string;
    titleProgrammeReceiptWord: string;
    paidAtLabel: string;
  };

  programsPage: {
    filterCategoryLabel: string;
    filterAllCategories: string;
    filterDateFromLabel: string;
    filterMaxFeeLabel: string;
    filterAnyFee: string;
    filterSortLabel: string;
    sortDate: string;
    sortFeeAsc: string;
    sortFeeDesc: string;
    clearFilters: string;
    noResultsTitle: string;
    noResultsDescription: string;
    venueLabel: string;
    dateLabel: string;
    feeLabel: string;
    seatsLabel: string;
    /** e.g. "{n} seats available" — shown only when the program has a seat cap. */
    seatsAvailableTemplate: string;
    eligibleGradesLabel: string;
    contactLabel: string;
    enrollAndPay: string;
    fullTitle: string;
    fullDescription: string;
    notEligibleTitle: string;
    notEligibleDescription: string;
    registeredTitle: string;
    registeredDescription: string;
    registeredBadge: string;
    viewReceiptLabel: string;
    alreadyInCart: string;
    viewCart: string;
  };

  profile: {
    registerNumberLabel: string;
    mobileLabel: string;
    classLabel: string;
    languageLabel: string;
    logout: string;
    changePhoto: string;
    avatarUploadError: string;
    changePasswordLabel: string;
    changePasswordNoEmail: string;
    /** Template with "{email}" placeholder. */
    changePasswordEmailNotice: string;
    sendOtpLabel: string;
    otpLabel: string;
    otpPlaceholder: string;
    verifyOtpLabel: string;
    otpInvalid: string;
    otpSent: string;
    otpCooldown: string;
    newPasswordLabel: string;
    confirmPasswordLabel: string;
    passwordMismatch: string;
    passwordTooShort: string;
    updatePasswordLabel: string;
    passwordUpdated: string;
  };

  help: {
    title: string;
    subtitle: string;
    faqTitle: string;
    contactTitle: string;
    contactPhoneLabel: string;
    contactEmailLabel: string;
    contactHoursLabel: string;
    contactHoursValue: string;
    chatTitle: string;
    chatComingSoon: string;
    faqs: { question: string; answer: string }[];
  };

  stub: {
    comingSoonTitle: string;
    comingSoonDescription: string;
  };
}
