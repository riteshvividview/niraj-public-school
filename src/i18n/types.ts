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
      emailLabel: string;
      emailPlaceholder: string;
      passwordLabel: string;
      passwordPlaceholder: string;
      submit: string;
      invalidCredentials: string;
      createAccountCta: string;
      newHere: string;
    };
    register: {
      title: string;
      subtitle: string;
      nameLabel: string;
      namePlaceholder: string;
      emailLabel: string;
      emailPlaceholder: string;
      passwordLabel: string;
      passwordPlaceholder: string;
      confirmPasswordLabel: string;
      schoolLabel: string;
      classLabel: string;
      classPlaceholder: string;
      alreadyRegistered: string;
      loginInsteadCta: string;
      submit: string;
      haveAccount: string;
      loginCta: string;
    };
    errors: {
      invalidEmail: string;
      passwordTooShort: string;
      passwordMismatch: string;
      required: string;
      selectSchool: string;
      selectClass: string;
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
    stationery: string;
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
    notNeeded: string;
    booksSubtitle: string;
    stationerySubtitle: string;
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
  };

  receiptsPage: {
    title: string;
    detailTitle: string;
    ticketTitle: string;
    emptyTitle: string;
    emptyDescription: string;
  };

  programsPage: {
    filterSchoolLabel: string;
    filterAllSchools: string;
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
    categories: {
      workshop: string;
      sports: string;
      camp: string;
      annualDay: string;
      exhibition: string;
      extraClass: string;
    };
    venueLabel: string;
    dateLabel: string;
    feeLabel: string;
    seatsLabel: string;
    organizedBy: string;
    contactLabel: string;
    enrollAndPay: string;
    fullTitle: string;
    fullDescription: string;
    alreadyInCart: string;
    viewCart: string;
  };

  profile: {
    emailLabel: string;
    mobileLabel: string;
    schoolLabel: string;
    classLabel: string;
    languageLabel: string;
    logout: string;
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
