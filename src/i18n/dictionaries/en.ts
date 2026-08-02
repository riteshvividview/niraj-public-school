import type { Dictionary } from "../types";

const en: Dictionary = {
  appName: "School Workspace",
  language: "Language",
  continueLabel: "Continue",
  welcome: "Welcome",

  nav: {
    home: "Home",
    essentials: "Essentials",
    programs: "Programs",
    receipts: "Receipts",
    profile: "Profile",
  },

  status: {
    open: "Open",
    fillingFast: "Filling Fast",
    full: "Full",
    closed: "Closed",
    paid: "Paid",
    pending: "Pending",
    failed: "Failed",
    refunded: "Refunded",
    ready: "Ready to Collect",
    collected: "Collected",
    checkedIn: "Checked In",
    cancelled: "Cancelled",
  },

  common: {
    viewDetails: "View Details",
    remove: "Remove",
    total: "Total",
    noItemsYet: "Nothing here yet",
    seatsLeft: "seats left",
    download: "Download",
    share: "Share",
    showAtCounter: "Show this at the school counter to collect / check in",
    showAtEntry: "Show this at the entry to check in",
    ticketLabel: "Ticket",
    back: "Back",
    change: "Change",
  },

  auth: {
    language: {
      title: "Choose your language",
      subtitle: "You can change this anytime from your profile.",
      next: "Next",
    },
    login: {
      title: "Welcome back",
      subtitle: "Log in with your register number to continue.",
      registerNumberLabel: "Register number",
      registerNumberPlaceholder: "e.g. NPS2026001",
      passwordLabel: "Password",
      passwordPlaceholder: "Enter your password",
      submit: "Log in",
      invalidCredentials: "That register number and password don't match an account.",
      cantLogIn:
        "Can't log in? Contact your school office or class teacher — they can add or fix your record, then you can try again.",
    },
  },

  home: {
    upcomingProgramsTitle: "Upcoming Programs & Events",
    viewAll: "View all",
    hasReceiptsMessage: "You have receipts ready to show at school.",
    noReceiptsTitle: "No receipts yet",
    noReceiptsDescription: "Complete a purchase or program enrollment to get your first receipt.",
  },

  essentials: {
    books: "Books",
    uniform: "Uniform & Kit",
    stationery: "Stationery",
    hubTitle: "My School Essentials",
    hubSubtitle: "The fixed set of books, uniform and stationery for your child's class.",
    selectedCount: "{selected} of {total} selected",
    confirmedCount: "{selected} of {total} sizes confirmed",
    reviewAndPay: "Review & Pay",
    itemsCount: "{n} items",
    sizeGuideCta: "Size guide",
    sizeGuideTitle: "Size guide",
    sizeGuideAgeColumn: "Age (approx.)",
    sizeGuideHeightColumn: "Height (cm)",
    chooseSizeLabel: "Choose size",
    sizePlaceholder: "Select size",
    sizeConfirmed: "Size confirmed",
    sizeNotConfirmed: "Size not confirmed yet",
    notNeeded: "Not needed",
    booksSubtitle: "The fixed book list for your child's class — included by default.",
    stationerySubtitle: "The fixed stationery starter kit for your child's class.",
  },

  cart: {
    title: "Cart & Checkout",
    orderSummary: "Order Summary",
    noFeeNote: "No admission fee or delivery charge — you pay only for the items and programs listed above.",
    emptyTitle: "Your cart is empty",
    emptyDescription: "Head back to Essentials to select books, uniform or stationery.",
    proceedToPayment: "Proceed to Payment",
    changeSize: "Change size",
  },

  payment: {
    title: "Payment",
    methodLabel: "Payment method",
    upi: "UPI",
    card: "Debit / Credit Card",
    netbanking: "Net Banking",
    payNow: "Pay Now",
    processing: "Processing your payment…",
    failureTitle: "Payment failed",
    failureDescription: "Something went wrong while processing your payment. Please try again.",
    tryAgain: "Try Again",
    devFailureToggle: "Simulate a failed payment (demo only)",
  },

  receiptsPage: {
    title: "My Receipts",
    detailTitle: "Receipt",
    ticketTitle: "Ticket",
    emptyTitle: "No receipts yet",
    emptyDescription: "Your receipts will show up here after you complete a purchase or enroll in a program.",
  },

  programsPage: {
    filterCategoryLabel: "Category",
    filterAllCategories: "All categories",
    filterDateFromLabel: "From date",
    filterMaxFeeLabel: "Max fee",
    filterAnyFee: "Any fee",
    filterSortLabel: "Sort by",
    sortDate: "Date (soonest first)",
    sortFeeAsc: "Fee (low to high)",
    sortFeeDesc: "Fee (high to low)",
    clearFilters: "Clear filters",
    noResultsTitle: "No programs match your filters",
    noResultsDescription: "Try clearing a filter or checking back later for new programs.",
    categories: {
      workshop: "Workshop",
      sports: "Sports",
      camp: "Camp",
      annualDay: "Annual Day",
      exhibition: "Exhibition",
      extraClass: "Extra Class",
    },
    venueLabel: "Venue",
    dateLabel: "Date",
    feeLabel: "Fee",
    seatsLabel: "Seats",
    contactLabel: "Contact",
    enrollAndPay: "Enroll & Pay",
    fullTitle: "This program is full",
    fullDescription: "All seats have been taken. Check back later in case a spot opens up.",
    alreadyInCart: "Already in your cart",
    viewCart: "View Cart",
  },

  profile: {
    registerNumberLabel: "Register number",
    mobileLabel: "Mobile number",
    classLabel: "Class",
    languageLabel: "Language",
    logout: "Log out",
    changePhoto: "Change photo",
    avatarUploadError: "Couldn't upload that photo. Please try again.",
  },

  help: {
    title: "Help & Support",
    subtitle: "Answers to common questions about payments, receipts and collection.",
    faqTitle: "Frequently asked questions",
    contactTitle: "Contact the school",
    contactPhoneLabel: "Phone",
    contactEmailLabel: "Email",
    contactHoursLabel: "Hours",
    contactHoursValue: "Mon–Sat, 9 AM – 5 PM",
    chatTitle: "Chat with us",
    chatComingSoon: "Live chat is coming soon. For now, please call or email using the details above.",
    faqs: [
      {
        question: "How do I collect my books, uniform or stationery?",
        answer:
          "Show the QR code from your receipt at the school counter. Staff will scan it and hand over your items.",
      },
      {
        question: "I paid but didn't get a receipt — what do I do?",
        answer:
          "Check My Receipts in the app first. If it's still missing, contact the school using the details below.",
      },
      {
        question: "Can I change my child's class or school?",
        answer:
          "Class and school are set during registration. To change either, please contact the school directly — this can't be edited from the app yet.",
      },
      {
        question: "What payment methods are accepted?",
        answer: "UPI, debit/credit cards, and net banking are all supported at checkout.",
      },
      {
        question: "Is there a delivery or admission fee?",
        answer:
          "No — you pay only for the items or program listed. Everything is collected in person at school.",
      },
    ],
  },

  stub: {
    comingSoonTitle: "Coming soon",
    comingSoonDescription: "This section is being built in a later phase.",
  },
};

export default en;
