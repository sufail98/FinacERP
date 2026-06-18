import { useEffect } from "react";

const GoogleTranslate = () => {
  useEffect(() => {
    const addScript = document.createElement("script");
    addScript.src =
      "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
    document.body.appendChild(addScript);

    window.googleTranslateElementInit = () => {
      new window.google.translate.TranslateElement(
        {
          pageLanguage: "en",
          includedLanguages: "en,ar",
          autoDisplay: false,
        },
        "google_translate_element"
      );
    };
  }, []);

  const handleLanguageChange = (e) => {
    const language = e.target.value;
    const selectEl = document.querySelector(".goog-te-combo");
    if (selectEl) {
      selectEl.value = language;
      selectEl.dispatchEvent(new Event("change"));
    }
  };

  return (
    <div>
      {/* Custom dropdown */}
      <select
        onChange={handleLanguageChange}
        className="p-2 border rounded"
        defaultValue="en"
      >
        <option value="en">English</option>
        <option value="ar">Arabic</option>
      </select>

      {/* Required for Google script, but hidden */}
      {/* <div id="google_translate_element" style={{ display: "none" }}></div> */}
    </div>
  );
};

export default GoogleTranslate;
