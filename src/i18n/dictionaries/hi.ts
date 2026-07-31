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

  home: {
    upcomingProgramsTitle: "आगामी कार्यक्रम",
    viewAll: "सभी देखें",
    hasReceiptsMessage: "आपकी रसीदें स्कूल में दिखाने के लिए तैयार हैं।",
    noReceiptsTitle: "अभी कोई रसीद नहीं",
    noReceiptsDescription: "अपनी पहली रसीद पाने के लिए कोई खरीदारी या कार्यक्रम पंजीकरण पूरा करें।",
  },

  essentials: {
    books: "किताबें",
    uniform: "यूनिफ़ॉर्म और किट",
    stationery: "स्टेशनरी",
    hubTitle: "मेरे स्कूल की आवश्यक सामग्री",
    hubSubtitle: "आपके बच्चे की कक्षा के लिए तय किताबें, यूनिफ़ॉर्म और स्टेशनरी का सेट।",
    selectedCount: "{total} में से {selected} चुनी गईं",
    confirmedCount: "{total} में से {selected} साइज़ पुष्ट",
    reviewAndPay: "समीक्षा करें और भुगतान करें",
    itemsCount: "{n} वस्तुएं",
    sizeGuideCta: "साइज़ गाइड",
    sizeGuideTitle: "साइज़ गाइड",
    sizeGuideAgeColumn: "आयु (लगभग)",
    sizeGuideHeightColumn: "ऊंचाई (सेमी)",
    chooseSizeLabel: "साइज़ चुनें",
    sizePlaceholder: "साइज़ चुनें",
    sizeConfirmed: "साइज़ पुष्ट",
    sizeNotConfirmed: "साइज़ अभी पुष्ट नहीं है",
    notNeeded: "ज़रूरत नहीं",
    booksSubtitle: "आपके बच्चे की कक्षा के लिए तय किताबों की सूची — डिफ़ॉल्ट रूप से शामिल।",
    stationerySubtitle: "आपके बच्चे की कक्षा के लिए तय स्टेशनरी स्टार्टर किट।",
  },

  cart: {
    title: "कार्ट और चेकआउट",
    orderSummary: "ऑर्डर सारांश",
    noFeeNote: "कोई प्रवेश शुल्क या डिलीवरी शुल्क नहीं — आप केवल ऊपर दी गई वस्तुओं और कार्यक्रमों के लिए भुगतान करते हैं।",
    emptyTitle: "आपका कार्ट खाली है",
    emptyDescription: "किताबें, यूनिफ़ॉर्म या स्टेशनरी चुनने के लिए आवश्यक सामग्री पर वापस जाएं।",
    proceedToPayment: "भुगतान की ओर बढ़ें",
    changeSize: "साइज़ बदलें",
  },

  payment: {
    title: "भुगतान",
    methodLabel: "भुगतान का तरीका",
    upi: "UPI",
    card: "डेबिट / क्रेडिट कार्ड",
    netbanking: "नेट बैंकिंग",
    payNow: "अभी भुगतान करें",
    processing: "आपका भुगतान प्रोसेस हो रहा है…",
    failureTitle: "भुगतान विफल",
    failureDescription: "आपका भुगतान प्रोसेस करते समय कुछ गड़बड़ हुई। कृपया फिर से प्रयास करें।",
    tryAgain: "फिर से प्रयास करें",
    devFailureToggle: "भुगतान विफलता का अनुकरण करें (केवल डेमो के लिए)",
  },

  receiptsPage: {
    title: "मेरी रसीदें",
    detailTitle: "रसीद",
    emptyTitle: "अभी कोई रसीद नहीं",
    emptyDescription: "खरीदारी पूरी करने या किसी कार्यक्रम में नामांकन के बाद आपकी रसीदें यहां दिखाई देंगी।",
  },

  profile: {
    mobileLabel: "मोबाइल नंबर",
    schoolLabel: "स्कूल",
    classLabel: "कक्षा",
    languageLabel: "भाषा",
    logout: "लॉग आउट करें",
  },

  help: {
    title: "सहायता और समर्थन",
    subtitle: "भुगतान, रसीद और सामान लेने से जुड़े सामान्य सवालों के जवाब।",
    faqTitle: "अक्सर पूछे जाने वाले सवाल",
    contactTitle: "स्कूल से संपर्क करें",
    contactPhoneLabel: "फ़ोन",
    contactEmailLabel: "ईमेल",
    contactHoursLabel: "समय",
    contactHoursValue: "सोम–शनि, सुबह 9 बजे – शाम 5 बजे",
    chatTitle: "हमसे चैट करें",
    chatComingSoon: "लाइव चैट जल्द आ रही है। तब तक, कृपया ऊपर दिए गए विवरण से कॉल या ईमेल करें।",
    faqs: [
      {
        question: "मैं अपनी किताबें, यूनिफ़ॉर्म या स्टेशनरी कैसे लूं?",
        answer:
          "अपनी रसीद का QR कोड स्कूल काउंटर पर दिखाएं। स्टाफ इसे स्कैन करके आपका सामान दे देगा।",
      },
      {
        question: "मैंने भुगतान किया लेकिन रसीद नहीं मिली — मैं क्या करूं?",
        answer: "पहले ऐप में 'मेरी रसीदें' देखें। अगर फिर भी न मिले, तो नीचे दिए विवरण से स्कूल से संपर्क करें।",
      },
      {
        question: "क्या मैं अपने बच्चे की कक्षा या स्कूल बदल सकता हूं?",
        answer:
          "कक्षा और स्कूल पंजीकरण के समय तय होते हैं। इन्हें बदलने के लिए कृपया सीधे स्कूल से संपर्क करें — यह अभी ऐप से नहीं बदला जा सकता।",
      },
      {
        question: "कौन से भुगतान तरीके स्वीकार किए जाते हैं?",
        answer: "चेकआउट पर UPI, डेबिट/क्रेडिट कार्ड और नेट बैंकिंग सभी स्वीकार किए जाते हैं।",
      },
      {
        question: "क्या कोई डिलीवरी या प्रवेश शुल्क है?",
        answer: "नहीं — आप केवल सूचीबद्ध सामान या कार्यक्रम के लिए भुगतान करते हैं। सब कुछ स्कूल में व्यक्तिगत रूप से लिया जाता है।",
      },
    ],
  },

  stub: {
    comingSoonTitle: "जल्द आ रहा है",
    comingSoonDescription: "यह भाग एक बाद के चरण में बनाया जा रहा है।",
  },
};

export default hi;
