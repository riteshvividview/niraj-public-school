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
    exchange: string;
    support: string;
    profile: string;
    more: string;
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
    clearCart: string;
    clearTitle: string;
    clearDescription: string;
    clearConfirm: string;
    clearKeep: string;
  };

  payment: {
    title: string;
    methodLabel: string;
    upi: string;
    card: string;
    netbanking: string;
    other: string;
    duplicateTitle: string;
    duplicateDescription: string;
    duplicateNoReceipt: string;
    viewReceipt: string;
    pendingTitle: string;
    pendingDescription: string;
    checkStatus: string;
    cancelPayment: string;
    continuePayment: string;
    confirming: string;
    notConfirmedTitle: string;
    notConfirmedDescription: string;
    myPayments: string;
    testModeNote: string;
    unavailable: string;
    devDieToggle: string;
    startFailed: string;
    checkingStatus: string;
    stillPending: string;
    cancelledToast: string;
    redirecting: string;
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
    paymentsLink: string;
  };

  newAdmission: {
    setTitle: string;
    setDescription: string;
    required: string;
    optional: string;
    addSet: string;
    removeSet: string;
    setInCart: string;
    setTotal: string;
    setNote: string;
    extrasTitle: string;
    extrasDescription: string;
    request: string;
    requestTitle: string;
    requestDescription: string;
    sizeLabel: string;
    noteLabel: string;
    notePlaceholder: string;
    sendRequest: string;
    requestSent: string;
    myRequests: string;
    statusPending: string;
    statusApproved: string;
    statusRejected: string;
    statusCancelled: string;
    statusUsed: string;
    addToCart: string;
    inCart: string;
    cancelRequest: string;
    schoolNote: string;
    approvedTitle: string;
    setBought: string;
    cartSetLocked: string;
    cartRemoveSet: string;
  };

  paymentsPage: {
    title: string;
    subtitle: string;
    emptyTitle: string;
    emptyDescription: string;
    statusPaid: string;
    statusPending: string;
    statusFailed: string;
    statusCancelled: string;
    statusExpired: string;
    pendingNote: string;
    failedNote: string;
    cancelledNote: string;
    expiredNote: string;
    lateNote: string;
    receiptCode: string;
    viewReceipt: string;
    checkStatus: string;
    cancelPayment: string;
    cancelTitle: string;
    cancelDescription: string;
    cancelConfirm: string;
    keep: string;
    startedOn: string;
    refreshed: string;
  };

  exchangePage: {
    title: string;
    subtitle: string;
    tabNew: string;
    tabRequests: string;
    chooseReceiptTitle: string;
    chooseReceiptHint: string;
    noReceiptsTitle: string;
    noReceiptsDescription: string;
    noUniformTitle: string;
    noUniformDescription: string;
    receiptWord: string;
    /** Template with "{date}" and "{n}" placeholders. */
    eligibleUntilTemplate: string;
    requestExchange: string;
    sizeLabel: string;
    quantityLabel: string;
    ineligibleNotCollected: string;
    ineligibleWindowClosed: string;
    ineligibleAlreadyRequested: string;
    ineligibleAlreadyExchanged: string;
    ineligibleNotPaid: string;
    formTitle: string;
    currentSizeLabel: string;
    newSizeLabel: string;
    chooseNewSize: string;
    reasonLabel: string;
    reasonSizeTooSmall: string;
    reasonSizeTooLarge: string;
    reasonDefect: string;
    reasonOther: string;
    noteLabel: string;
    notePlaceholder: string;
    priceDifferenceLabel: string;
    /** Template with "{amount}" placeholder. */
    youPayTemplate: string;
    /** Template with "{amount}" placeholder. */
    schoolAdjustsTemplate: string;
    noPriceDifference: string;
    settledAtCounterNote: string;
    submit: string;
    submitting: string;
    successTitle: string;
    successDescription: string;
    viewMyRequests: string;
    noRequestsTitle: string;
    noRequestsDescription: string;
    statusPending: string;
    statusApproved: string;
    statusRejected: string;
    statusCancelled: string;
    statusCompleted: string;
    helpPending: string;
    helpApproved: string;
    helpRejected: string;
    helpCancelled: string;
    helpCompleted: string;
    noteFromSchool: string;
    requestedOn: string;
    cancelRequest: string;
    cancelConfirmTitle: string;
    cancelConfirmDescription: string;
    keepRequest: string;
    cancelFailed: string;
    submitFailed: string;
  };

  bookLock: {
    assignedTitle: string;
    assignedNote: string;
    lockedBadge: string;
    requestChange: string;
    changeDialogTitle: string;
    changeDialogDescription: string;
    currentLabel: string;
    keepAsIs: string;
    reasonLabel: string;
    reasonPlaceholder: string;
    submit: string;
    submitting: string;
    successTitle: string;
    successDescription: string;
    submitFailed: string;
    pendingTitle: string;
    pendingDescription: string;
    approvedTitle: string;
    approvedDescription: string;
    rejectedTitle: string;
    rejectedDescription: string;
    cancelledTitle: string;
    noteFromSchool: string;
    cancelRequest: string;
    cancelConfirmTitle: string;
    cancelConfirmDescription: string;
    keepRequest: string;
    cancelFailed: string;
    requestedLabel: string;
    dismiss: string;
    cartUpdatedNote: string;
  };

  supportPage: {
    title: string;
    subtitle: string;
    askTitle: string;
    messageLabel: string;
    messagePlaceholder: string;
    contactHeading: string;
    contactHint: string;
    phoneLabel: string;
    emailLabel: string;
    send: string;
    sending: string;
    successTitle: string;
    successDescription: string;
    sendFailed: string;
    needContact: string;
    schoolContactTitle: string;
    callSchool: string;
    emailSchool: string;
    myQueries: string;
    noQueriesTitle: string;
    noQueriesDescription: string;
    statusOpen: string;
    statusInProgress: string;
    statusResolved: string;
    helpOpen: string;
    helpInProgress: string;
    helpResolved: string;
    sentOn: string;
    noteFromSchool: string;
  };

  addressSection: {
    title: string;
    optionalNote: string;
    empty: string;
    add: string;
    edit: string;
    remove: string;
    removeConfirmTitle: string;
    removeConfirmDescription: string;
    updatedOn: string;
    sourceLive: string;
    sourceManual: string;
    dialogTitle: string;
    dialogDescription: string;
    useLiveLocation: string;
    locating: string;
    locationDenied: string;
    locationUnsupported: string;
    locationTimeout: string;
    lookupFailed: string;
    lookupNotFound: string;
    osmNote: string;
    confirmTitle: string;
    confirmQuestion: string;
    confirmYes: string;
    confirmNo: string;
    confirmedHint: string;
    houseLabel: string;
    housePlaceholder: string;
    streetLabel: string;
    streetPlaceholder: string;
    landmarkLabel: string;
    landmarkPlaceholder: string;
    cityLabel: string;
    stateLabel: string;
    pincodeLabel: string;
    phoneLabel: string;
    phoneHint: string;
    locationCaptured: string;
    openInMaps: string;
    save: string;
    saving: string;
    saveFailed: string;
    savedToast: string;
    removedToast: string;
    errHouse: string;
    errStreet: string;
    errCity: string;
    errState: string;
    errPincode: string;
    errPincodeFormat: string;
    cancel: string;
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
