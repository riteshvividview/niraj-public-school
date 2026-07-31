import type { Dictionary } from "../types";

const en: Dictionary = {
  appName: "Niraj Public School",
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
    back: "Back",
    change: "Change",
  },

  auth: {
    language: {
      title: "Choose your language",
      subtitle: "You can change this anytime from your profile.",
    },
    login: {
      title: "Log in",
      subtitle: "Enter your mobile number to continue.",
      mobileLabel: "Mobile number",
      mobilePlaceholder: "98765 43210",
      sendOtp: "Send OTP",
      notFound: "We couldn't find an account for this number.",
      createAccountCta: "Create an account",
      newHere: "New here?",
    },
    register: {
      title: "Create your account",
      subtitle: "Tell us a little about your child to set up your school workspace.",
      nameLabel: "Parent / student name",
      namePlaceholder: "e.g. Ritesh Kumar",
      mobileLabel: "Mobile number",
      schoolLabel: "School",
      classLabel: "Class",
      classPlaceholder: "Select class",
      alreadyRegistered: "This number is already registered.",
      loginInsteadCta: "Log in instead",
      sendOtp: "Send OTP",
      haveAccount: "Already have an account?",
      loginCta: "Log in",
    },
    otp: {
      title: "Verify your number",
      subtitleFor: "Enter the 6-digit code sent to",
      demoLabel: "Demo OTP",
      demoNote: "Preview build only — real OTPs will be sent once this goes live.",
      codeLabel: "6-digit code",
      codePlaceholder: "123456",
      verify: "Verify & Continue",
      changeNumber: "Change number",
      resend: "Resend OTP",
      resendIn: "Resend available in {n}s",
    },
    errors: {
      invalidMobile: "Enter a valid 10-digit mobile number.",
      incorrectOtp: "That code isn't right. Please try again.",
      required: "This field is required.",
      selectSchool: "Please select a school.",
      selectClass: "Please select a class.",
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
  },

  profile: {
    mobileLabel: "Mobile number",
    schoolLabel: "School",
    classLabel: "Class",
    languageLabel: "Language",
    logout: "Log out",
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
