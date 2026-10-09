const BLOCKED_CHARACTERS = `?><.:;]}[{+=/*^%$#!~\`\\|`;

export const sanitize = {
  // Letters only
  letters: (value) =>
    Array.from(value)
      .filter((char) => !BLOCKED_CHARACTERS.includes(char))
      .join(""),

  // Letters and numbers
  alphaNumeric: (value) =>
    Array.from(value)
      .filter((char) => !BLOCKED_CHARACTERS.includes(char))
      .join(""),

  // Letters, numbers and spaces
  alphaNumericSpace: (value) =>
    Array.from(value)
      .filter((char) => !BLOCKED_CHARACTERS.includes(char))
      .join(""),

  // Arabic-Indic digits only
  arabicIndicNumbers: (value) => value.replace(/[^٠-٩]/g, ""),

  // Only numbers
  numbers: (value) => {
    const normalized = value
      .replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d))
      .replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d));

    return normalized.replace(/\D/g, "");
  },

  // Numbers and spaces
  numbersSpace: (value) => {
    const normalized = value
      .replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d))
      .replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d));

    return normalized.replace(/[^0-9 ]/g, "");
  },

  // Letters with spaces
  lettersSpace: (value) =>
    Array.from(value)
      .filter((char) => !BLOCKED_CHARACTERS.includes(char))
      .join(""),

  // Uppercase letters and numbers
  uppercaseAlphaNumeric: (value) =>
    Array.from(value)
      .filter((char) => !BLOCKED_CHARACTERS.includes(char))
      .join("")
      .toUpperCase(),

  // Uppercase letters
  uppercaseLetters: (value) =>
    Array.from(value)
      .filter((char) => !BLOCKED_CHARACTERS.includes(char))
      .join("")
      .toUpperCase(),
};