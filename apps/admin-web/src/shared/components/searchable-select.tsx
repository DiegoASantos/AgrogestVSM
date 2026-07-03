"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type SearchableSelectOption = {
  value: string;
  label: string;
  helper?: string;
};

type SearchableSelectProps = {
  label: string;
  value: string;
  options: SearchableSelectOption[];
  placeholder: string;
  emptyMessage?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
};

export function SearchableSelect({
  label,
  value,
  options,
  placeholder,
  emptyMessage = "No hay opciones disponibles.",
  disabled = false,
  onChange
}: SearchableSelectProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const selectedOption = options.find((option) => option.value === value);
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState(selectedOption?.label ?? "");

  useEffect(() => {
    setSearch(selectedOption?.label ?? "");
  }, [selectedOption?.label]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
        setSearch(selectedOption?.label ?? "");
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);

    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isOpen, selectedOption?.label]);

  const filteredOptions = useMemo(() => {
    const normalizedSearch = normalizeSearchableText(search);

    if (!normalizedSearch) {
      return options;
    }

    return options.filter((option) => {
      const searchableText = normalizeSearchableText(
        `${option.label} ${option.helper ?? ""}`
      );

      return searchableText.includes(normalizedSearch);
    });
  }, [options, search]);

  return (
    <div className="field-group searchable-select" ref={wrapperRef}>
      <label htmlFor={`${label}-searchable-select`}>{label}</label>
      <div className="searchable-select__control">
        <input
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          autoComplete="off"
          disabled={disabled}
          id={`${label}-searchable-select`}
          onChange={(event) => {
            setSearch(event.target.value);
            onChange("");
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          role="combobox"
          value={search}
        />
      </div>

      {isOpen && !disabled ? (
        <div className="searchable-select__list" role="listbox">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option) => (
              <button
                className="searchable-select__option"
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  setSearch(option.label);
                  setIsOpen(false);
                }}
                onMouseDown={(event) => event.preventDefault()}
                role="option"
                type="button"
              >
                <span>{option.label}</span>
                {option.helper ? <small>{option.helper}</small> : null}
              </button>
            ))
          ) : (
            <p className="searchable-select__empty">
              {search.trim() ? "No hay coincidencias para la busqueda." : emptyMessage}
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}

function normalizeSearchableText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}
