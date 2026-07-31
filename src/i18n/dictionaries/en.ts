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
};

export default en;
