import type { Dictionary } from "../types";

const te: Dictionary = {
  appName: "నీరజ్ పబ్లిక్ స్కూల్",
  language: "భాష",
  continueLabel: "కొనసాగించండి",
  welcome: "స్వాగతం",

  nav: {
    home: "హోమ్",
    essentials: "అవసరమైనవి",
    programs: "కార్యక్రమాలు",
    receipts: "రసీదులు",
    profile: "ప్రొఫైల్",
  },

  status: {
    open: "అందుబాటులో ఉంది",
    fillingFast: "సీట్లు తక్కువ",
    full: "నిండిపోయింది",
    closed: "మూసివేయబడింది",
    paid: "చెల్లించారు",
    pending: "పెండింగ్‌లో ఉంది",
    failed: "విఫలమైంది",
    refunded: "వాపసు చేయబడింది",
    ready: "తీసుకోవడానికి సిద్ధంగా ఉంది",
    collected: "తీసుకున్నారు",
    checkedIn: "చెక్-ఇన్ అయ్యింది",
    cancelled: "రద్దు చేయబడింది",
  },

  common: {
    viewDetails: "వివరాలు చూడండి",
    remove: "తీసివేయండి",
    total: "మొత్తం",
    noItemsYet: "ఇక్కడ ఇంకా ఏమీ లేదు",
    seatsLeft: "సీట్లు మిగిలి ఉన్నాయి",
    download: "డౌన్‌లోడ్ చేయండి",
    share: "షేర్ చేయండి",
    showAtCounter: "వస్తువులు తీసుకోవడానికి లేదా చెక్-ఇన్ కోసం దీన్ని స్కూల్ కౌంటర్‌లో చూపించండి",
    back: "వెనుకకు",
    change: "మార్చండి",
  },

  auth: {
    language: {
      title: "మీ భాషను ఎంచుకోండి",
      subtitle: "మీరు దీన్ని మీ ప్రొఫైల్ నుండి ఎప్పుడైనా మార్చుకోవచ్చు.",
    },
    login: {
      title: "లాగిన్ చేయండి",
      subtitle: "కొనసాగించడానికి మీ మొబైల్ నంబర్‌ను నమోదు చేయండి.",
      mobileLabel: "మొబైల్ నంబర్",
      mobilePlaceholder: "98765 43210",
      sendOtp: "OTP పంపండి",
      notFound: "ఈ నంబర్ కోసం ఖాతా కనుగొనబడలేదు.",
      createAccountCta: "ఖాతా సృష్టించండి",
      newHere: "ఇక్కడ కొత్తగా వచ్చారా?",
    },
    register: {
      title: "మీ ఖాతాను సృష్టించండి",
      subtitle: "మీ స్కూల్ వర్క్‌స్పేస్‌ను సెటప్ చేయడానికి మీ పిల్లల గురించి కొంచెం సమాచారం ఇవ్వండి.",
      nameLabel: "తల్లిదండ్రి / విద్యార్థి పేరు",
      namePlaceholder: "ఉదా. రితేష్ కుమార్",
      mobileLabel: "మొబైల్ నంబర్",
      schoolLabel: "స్కూల్",
      classLabel: "తరగతి",
      classPlaceholder: "తరగతిని ఎంచుకోండి",
      alreadyRegistered: "ఈ నంబర్ ఇప్పటికే నమోదు చేయబడింది.",
      loginInsteadCta: "బదులుగా లాగిన్ చేయండి",
      sendOtp: "OTP పంపండి",
      haveAccount: "ఇప్పటికే ఖాతా ఉందా?",
      loginCta: "లాగిన్ చేయండి",
    },
    otp: {
      title: "మీ నంబర్‌ను ధృవీకరించండి",
      subtitleFor: "ఈ నంబర్‌కు పంపిన 6-అంకెల కోడ్‌ను నమోదు చేయండి",
      demoLabel: "డెమో OTP",
      demoNote: "ఇది ప్రివ్యూ బిల్డ్ మాత్రమే — లైవ్ అయిన తర్వాత నిజమైన OTPలు పంపబడతాయి.",
      codeLabel: "6-అంకెల కోడ్",
      codePlaceholder: "123456",
      verify: "ధృవీకరించి కొనసాగించండి",
      changeNumber: "నంబర్ మార్చండి",
      resend: "OTP మళ్లీ పంపండి",
      resendIn: "{n} సెకన్లలో మళ్లీ పంపే అవకాశం లభిస్తుంది",
    },
    errors: {
      invalidMobile: "సరైన 10-అంకెల మొబైల్ నంబర్‌ను నమోదు చేయండి.",
      incorrectOtp: "ఈ కోడ్ సరైనది కాదు. దయచేసి మళ్లీ ప్రయత్నించండి.",
      required: "ఈ ఫీల్డ్ తప్పనిసరి.",
      selectSchool: "దయచేసి ఒక స్కూల్‌ను ఎంచుకోండి.",
      selectClass: "దయచేసి ఒక తరగతిని ఎంచుకోండి.",
    },
  },
};

export default te;
