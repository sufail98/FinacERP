export const FLLanguage = 'Arabic'

export const selectedLang = 'English'

// src/lib/LanguageHelper.js
export const switchLanguage = (lang) => {
  if (lang === "ar") {
    document.documentElement.setAttribute("dir", "rtl");
    document.documentElement.setAttribute("lang", "ar");
  } else {
    document.documentElement.setAttribute("dir", "ltr");
    document.documentElement.setAttribute("lang", "en");
  }
};
