import React, { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { getAutocompleteSuggestions } from "@/src/lib/geocoding";
import { motion, AnimatePresence } from "motion/react";
import { Search, Loader2 } from "lucide-react";

interface AddressInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  icon?: React.ReactNode;
  autoFocus?: boolean;
  className?: string;
}

export function AddressInput({
  value,
  onChange,
  placeholder,
  icon,
  autoFocus,
  className,
}: AddressInputProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const updatePos = () => {
      if (inputRef.current) {
        const rect = inputRef.current.getBoundingClientRect();
        setDropdownPos({
          top: rect.bottom + window.scrollY,
          left: rect.left + window.scrollX,
          width: rect.width,
        });
      }
    };

    if (showSuggestions) {
      updatePos();
      window.addEventListener("scroll", updatePos, true);
      window.addEventListener("resize", updatePos);
    }

    return () => {
      window.removeEventListener("scroll", updatePos, true);
      window.removeEventListener("resize", updatePos);
    };
  }, [showSuggestions]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (value.length >= 3 && showSuggestions) {
        setIsLoading(true);
        const results = await getAutocompleteSuggestions(value);
        setSuggestions(results);
        setIsLoading(false);
      } else {
        setSuggestions([]);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [value, showSuggestions]);

  const handleSelect = (suggestion: string) => {
    onChange(suggestion);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-3 w-4 h-4 text-zinc-500 flex items-center justify-center">
            {icon}
          </div>
        )}
        <Input
          ref={inputRef}
          placeholder={placeholder}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          autoFocus={autoFocus}
          className={`${icon ? "pl-10" : ""} bg-zinc-800 border-zinc-700 focus:ring-blue-500 ${className}`}
        />
        {isLoading && (
          <div className="absolute right-3 top-3">
            <Loader2 className="w-4 h-4 text-zinc-500 animate-spin" />
          </div>
        )}
      </div>

      <AnimatePresence>
        {showSuggestions && suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={{
              position: "fixed",
              top: dropdownPos.top,
              left: dropdownPos.left,
              width: dropdownPos.width,
            }}
            className="z-[9999] mt-1 bg-zinc-800 border border-zinc-700 rounded-md shadow-2xl overflow-hidden"
          >
            <ul className="max-h-60 overflow-auto py-1">
              {suggestions.map((suggestion, index) => (
                <li
                  key={index}
                  onClick={() => handleSelect(suggestion)}
                  className="px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700 cursor-pointer transition-colors truncate"
                >
                  {suggestion}
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
