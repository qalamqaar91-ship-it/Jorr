import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "en" | "ur";
const dict = {
  en: {
    brand: "Jorr", tagline: "Find a match with your family's trust.",
    heroTitle: "A respectful way to find a life partner",
    heroBody: "Create a private profile, set what matters to you, and send rishta requests only to people you choose. Your phone, email and address are never shown publicly.",
    getStarted: "Create profile", logIn: "Log in", logOut: "Log out",
    email: "Email", password: "Password", displayName: "Display name", dob: "Date of birth",
    consent: "I am 18 or older and accept the Terms and Privacy Policy.",
    signUp: "Create account", forgot: "Forgot password?", sendReset: "Send reset link",
    newPassword: "New password", savePassword: "Save password",
    checkEmail: "Check your email to confirm your account.",
    resetSent: "If an account exists for this email, a reset link has been sent.",
    notConfigured: "Supabase is not configured. Copy .env.example to .env and add your project values.",
    under18: "You must be 18 or older to register.", pwRule: "Use at least 12 characters.",
    privacy: "Privacy", terms: "Terms", safety: "Safety", language: "اردو",
    setupTitle: "First-time admin setup", setupSecret: "Setup secret", setupDone: "Setup complete. Log in again to open the admin panel.",
    setupHint: "Sign up and confirm your email first, then log in and use this page once.",
    browse: "Browse", requests: "Requests", myProfile: "My profile", admin: "Admin", save: "Save", done: "Done.", empty: "Nothing here yet.",
    gender: "Gender", male: "Male", female: "Female", any: "Any", province: "Province", about: "About me", family: "Family introduction",
    religion: "Religious preferences", visibility: "Who can see my profile", visPublic: "All members", visReq: "Only people I send requests to", visHidden: "Hidden",
    statusLabel: "Profile status", addPhoto: "Add photo", photoNote: "Photos are private and shown only after an admin approves them.",
    sendRequest: "Send request", favourite: "Favourite", block: "Block", report: "Report", reportReason: "Why are you reporting this profile?",
    accept: "Accept", reject: "Reject", withdraw: "Withdraw", approve: "Approve", pendingProfiles: "Profiles awaiting approval", openReports: "Open reports", pendingPhotos: "Photos awaiting approval",
    received: "Received", sent: "Sent", dismiss: "Dismiss", notAllowed: "You do not have access to this page.",
    loading: "Loading…", error: "Something went wrong. Please try again.",
    pillars: ["Private by default", "Family involvement, your choice", "Requests, not cold messages"],
    pillarsBody: ["Contact details stay hidden until you agree to share them.", "Invite family to view and help, or keep your search to yourself.", "Both sides must accept before any conversation begins."],
  },
  ur: {
    brand: "جوڑ", tagline: "خاندان کے اعتماد کے ساتھ رشتہ تلاش کریں۔",
    heroTitle: "زندگی کا ساتھی تلاش کرنے کا باوقار طریقہ",
    heroBody: "نجی پروفائل بنائیں، اپنی ترجیحات طے کریں، اور رشتہ کی درخواست صرف انہی کو بھیجیں جنہیں آپ منتخب کریں۔ آپ کا فون، ای میل اور پتہ کبھی عوامی طور پر ظاہر نہیں ہوتا۔",
    getStarted: "پروفائل بنائیں", logIn: "لاگ اِن", logOut: "لاگ آؤٹ",
    email: "ای میل", password: "پاس ورڈ", displayName: "ظاہر ہونے والا نام", dob: "تاریخِ پیدائش",
    consent: "میری عمر 18 سال یا زیادہ ہے اور میں شرائط اور پرائیویسی پالیسی قبول کرتا/کرتی ہوں۔",
    signUp: "اکاؤنٹ بنائیں", forgot: "پاس ورڈ بھول گئے؟", sendReset: "ری سیٹ لنک بھیجیں",
    newPassword: "نیا پاس ورڈ", savePassword: "پاس ورڈ محفوظ کریں",
    checkEmail: "اکاؤنٹ کی تصدیق کے لیے اپنی ای میل دیکھیں۔",
    resetSent: "اگر اس ای میل پر اکاؤنٹ موجود ہے تو ری سیٹ لنک بھیج دیا گیا ہے۔",
    notConfigured: "Supabase ترتیب نہیں دیا گیا۔ .env.example کو .env میں کاپی کر کے اپنی قدریں شامل کریں۔",
    under18: "رجسٹریشن کے لیے عمر کم از کم 18 سال ہونی چاہیے۔", pwRule: "کم از کم 12 حروف استعمال کریں۔",
    privacy: "پرائیویسی", terms: "شرائط", safety: "حفاظت", language: "English",
    setupTitle: "ایڈمن کی پہلی بار ترتیب", setupSecret: "سیٹ اپ خفیہ کوڈ", setupDone: "ترتیب مکمل۔ ایڈمن پینل کھولنے کے لیے دوبارہ لاگ اِن کریں۔",
    setupHint: "پہلے سائن اپ کر کے ای میل کی تصدیق کریں، پھر لاگ اِن ہو کر یہ صفحہ ایک بار استعمال کریں۔",
    browse: "تلاش", requests: "درخواستیں", myProfile: "میرا پروفائل", admin: "ایڈمن", save: "محفوظ کریں", done: "ہو گیا۔", empty: "ابھی کچھ نہیں ہے۔",
    gender: "جنس", male: "مرد", female: "عورت", any: "کوئی بھی", province: "صوبہ", about: "میرے بارے میں", family: "خاندان کا تعارف",
    religion: "مذہبی ترجیحات", visibility: "میرا پروفائل کون دیکھ سکتا ہے", visPublic: "تمام ممبرز", visReq: "صرف وہ جنہیں میں درخواست بھیجوں", visHidden: "پوشیدہ",
    statusLabel: "پروفائل کی حالت", addPhoto: "تصویر شامل کریں", photoNote: "تصاویر نجی ہیں اور ایڈمن کی منظوری کے بعد ہی دکھائی جاتی ہیں۔",
    sendRequest: "درخواست بھیجیں", favourite: "پسندیدہ", block: "بلاک", report: "رپورٹ", reportReason: "آپ اس پروفائل کی رپورٹ کیوں کر رہے ہیں؟",
    accept: "قبول کریں", reject: "مسترد کریں", withdraw: "واپس لیں", approve: "منظور کریں", pendingProfiles: "منظوری کے منتظر پروفائل", openReports: "کھلی رپورٹس", pendingPhotos: "منظوری کے منتظر تصاویر",
    received: "موصول", sent: "بھیجی گئی", dismiss: "خارج کریں", notAllowed: "آپ کو اس صفحے تک رسائی نہیں ہے۔",
    loading: "لوڈ ہو رہا ہے…", error: "کچھ غلط ہو گیا۔ دوبارہ کوشش کریں۔",
    pillars: ["بطورِ ڈیفالٹ نجی", "خاندان کی شمولیت، آپ کی مرضی", "درخواست، براہِ راست پیغام نہیں"],
    pillarsBody: ["جب تک آپ اجازت نہ دیں رابطے کی تفصیلات پوشیدہ رہتی ہیں۔", "خاندان کو شامل کریں یا تلاش اپنے تک رکھیں۔", "بات چیت سے پہلے دونوں طرف سے قبولیت ضروری ہے۔"],
  },
} as const;
export type Dict = (typeof dict)["en"];

const Ctx = createContext<{ lang: Lang; t: Dict; toggle: () => void }>(null as never);
export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => (localStorage.getItem("lang") === "ur" ? "ur" : "en"));
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ur" ? "rtl" : "ltr";
    localStorage.setItem("lang", lang);
  }, [lang]);
  return <Ctx.Provider value={{ lang, t: dict[lang] as unknown as Dict, toggle: () => setLang(lang === "en" ? "ur" : "en") }}>{children}</Ctx.Provider>;
}
export const useI18n = () => useContext(Ctx);
