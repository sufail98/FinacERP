import { useEffect, useRef } from "react";

export default function useAutoFocus(open, delay = 200, selector = null) {
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        } else if (selector) {
          const input = document.querySelector(selector);
          if (input) input.focus();
        }
      }, delay);

      return () => clearTimeout(timer);
    }
  }, [open, delay, selector]);

  return inputRef;
}
