import type { Dictionary } from "../types";

const hi: Dictionary = {
  appName: "निराज पब्लिक स्कूल",
  language: "भाषा",
  continueLabel: "जारी रखें",
  welcome: "स्वागत है",

  nav: {
    home: "होम",
    essentials: "आवश्यक सामग्री",
    programs: "कार्यक्रम",
    receipts: "रसीदें",
    profile: "प्रोफ़ाइल",
  },

  status: {
    open: "उपलब्ध",
    fillingFast: "सीमित सीटें",
    full: "फुल",
    closed: "बंद",
    paid: "भुगतान हो गया",
    pending: "लंबित",
    failed: "असफल",
    refunded: "रिफंड हो गया",
    ready: "लेने के लिए तैयार",
    collected: "प्राप्त हो गया",
    checkedIn: "चेक-इन हो गया",
    cancelled: "रद्द",
  },

  common: {
    viewDetails: "विवरण देखें",
    remove: "हटाएं",
    total: "कुल",
    noItemsYet: "अभी यहां कुछ नहीं है",
    seatsLeft: "सीटें शेष",
    download: "डाउनलोड करें",
    share: "साझा करें",
    showAtCounter: "सामान लेने या चेक-इन के लिए यह स्कूल काउंटर पर दिखाएं",
    back: "वापस",
    change: "बदलें",
  },

  auth: {
    language: {
      title: "अपनी भाषा चुनें",
      subtitle: "आप इसे अपनी प्रोफ़ाइल से कभी भी बदल सकते हैं।",
    },
    login: {
      title: "लॉग इन करें",
      subtitle: "जारी रखने के लिए अपना मोबाइल नंबर दर्ज करें।",
      mobileLabel: "मोबाइल नंबर",
      mobilePlaceholder: "98765 43210",
      sendOtp: "OTP भेजें",
      notFound: "इस नंबर के लिए कोई खाता नहीं मिला।",
      createAccountCta: "खाता बनाएं",
      newHere: "यहाँ नए हैं?",
    },
    register: {
      title: "अपना खाता बनाएं",
      subtitle: "अपना स्कूल वर्कस्पेस सेट करने के लिए अपने बच्चे के बारे में थोड़ी जानकारी दें।",
      nameLabel: "अभिभावक / छात्र का नाम",
      namePlaceholder: "उदा. रितेश कुमार",
      mobileLabel: "मोबाइल नंबर",
      schoolLabel: "स्कूल",
      classLabel: "कक्षा",
      classPlaceholder: "कक्षा चुनें",
      alreadyRegistered: "यह नंबर पहले से पंजीकृत है।",
      loginInsteadCta: "इसके बजाय लॉग इन करें",
      sendOtp: "OTP भेजें",
      haveAccount: "पहले से खाता है?",
      loginCta: "लॉग इन करें",
    },
    otp: {
      title: "अपना नंबर सत्यापित करें",
      subtitleFor: "इस नंबर पर भेजा गया 6 अंकों का कोड दर्ज करें",
      demoLabel: "डेमो OTP",
      demoNote: "केवल प्रीव्यू बिल्ड के लिए — लाइव होने पर असली OTP भेजे जाएंगे।",
      codeLabel: "6 अंकों का कोड",
      codePlaceholder: "123456",
      verify: "सत्यापित करें और जारी रखें",
      changeNumber: "नंबर बदलें",
      resend: "OTP फिर से भेजें",
      resendIn: "{n} सेकंड में फिर से भेजें उपलब्ध होगा",
    },
    errors: {
      invalidMobile: "एक मान्य 10 अंकों का मोबाइल नंबर दर्ज करें।",
      incorrectOtp: "यह कोड सही नहीं है। कृपया फिर से प्रयास करें।",
      required: "यह फ़ील्ड आवश्यक है।",
      selectSchool: "कृपया एक स्कूल चुनें।",
      selectClass: "कृपया एक कक्षा चुनें।",
    },
  },
};

export default hi;
