import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check, X, User } from 'lucide-react';
import { Input } from './input';

export interface ResidentOption {
  id: string;
  full_name: string;
  nik?: string;
  phone?: string;
  house_number?: string;
}

export interface SearchableResidentSelectProps {
  residents: ResidentOption[];
  value: string;
  onChange: (residentId: string) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  id?: string;
}

export const SearchableResidentSelect: React.FC<SearchableResidentSelectProps> = ({
  residents = [],
  value,
  onChange,
  placeholder = 'Cari nama, NIK, atau nomor rumah warga...',
  required = false,
  disabled = false,
  id,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedResident = useMemo(
    () => residents.find((r) => r.id === value),
    [residents, value]
  );

  // Filter warga di memori dengan performa tinggi & limit 20 hasil render
  const filteredResidents = useMemo(() => {
    if (!search.trim()) {
      return residents.slice(0, 25);
    }
    const q = search.toLowerCase();
    return residents
      .filter((r) => {
        const matchName = r.full_name.toLowerCase().includes(q);
        const matchNIK = (r.nik || '').toLowerCase().includes(q);
        const matchPhone = (r.phone || '').toLowerCase().includes(q);
        const matchHouse = (r.house_number || '').toLowerCase().includes(q);
        return matchName || matchNIK || matchPhone || matchHouse;
      })
      .slice(0, 30);
  }, [residents, search]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearch('');
    }
  }, [isOpen]);

  return (
    <div className="relative w-full" ref={containerRef} id={id}>
      {/* Trigger Button */}
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`flex h-10 w-full items-center justify-between rounded-xl border border-[#d2d2d7] bg-white px-3 py-2 text-xs transition-colors cursor-pointer select-none ${
          disabled ? 'opacity-50 cursor-not-allowed bg-[#f5f5f7]' : 'hover:border-[#0071e3]'
        } ${isOpen ? 'border-[#0071e3] ring-1 ring-[#0071e3]' : ''}`}
      >
        <div className="flex items-center gap-2 truncate">
          <User className="h-3.5 w-3.5 text-[#0071e3] shrink-0" />
          {selectedResident ? (
            <span className="font-semibold text-[#1d1d1f] truncate">
              {selectedResident.full_name}
              {selectedResident.nik ? ` (${selectedResident.nik})` : ''}
              {selectedResident.house_number ? ` · No. ${selectedResident.house_number}` : ''}
            </span>
          ) : (
            <span className="text-[#858585]">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {selectedResident && !disabled && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
              }}
              className="p-1 hover:bg-[#f5f5f7] rounded-full text-[#858585] hover:text-rose-600 transition-colors"
              title="Hapus pilihan"
            >
              <X className="h-3.5 w-3.5" />
            </span>
          )}
          <ChevronDown className={`h-4 w-4 text-[#707070] transition-transform ${isOpen ? 'rotate-180 text-[#0071e3]' : ''}`} />
        </div>
      </div>

      {/* Hidden input for HTML form validation */}
      {required && (
        <input
          type="text"
          value={value}
          required={required}
          onChange={() => {}}
          className="opacity-0 absolute -z-10 h-0 w-0 pointer-events-none"
          tabIndex={-1}
        />
      )}

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1.5 w-full rounded-xl border border-[#d2d2d7] bg-white shadow-lg overflow-hidden animate-in fade-in-50 zoom-in-95 duration-100">
          {/* Search Bar inside popover */}
          <div className="p-2 border-b border-[#e2e2e5] bg-[#f5f5f7]">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#858585]" />
              <Input
                ref={searchInputRef}
                type="text"
                placeholder="Ketik nama warga atau NIK..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 pl-8 text-xs bg-white border-[#d2d2d7] focus:border-[#0071e3]"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[#858585] hover:text-[#1d1d1f]"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* List Hasil Warga */}
          <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 p-1">
            {filteredResidents.length === 0 ? (
              <div className="py-6 text-center text-xs text-[#858585]">
                {search ? `Warga "${search}" tidak ditemukan.` : 'Belum ada data warga terdaftar.'}
              </div>
            ) : (
              filteredResidents.map((r) => {
                const isSelected = r.id === value;
                return (
                  <div
                    key={r.id}
                    onClick={() => {
                      onChange(r.id);
                      setIsOpen(false);
                    }}
                    className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer text-xs transition-colors ${
                      isSelected
                        ? 'bg-[#f4f8fb] text-[#0066cc] font-semibold'
                        : 'hover:bg-[#f5f5f7] text-[#1d1d1f]'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="font-semibold text-xs text-[#1d1d1f] truncate">{r.full_name}</span>
                        {r.house_number && (
                          <span className="text-[10px] px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded border border-slate-200">
                            No. {r.house_number}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-[#707070] truncate mt-0.5">
                        {r.nik ? `NIK: ${r.nik}` : 'NIK: -'}
                        {r.phone ? ` · Telp: ${r.phone}` : ''}
                      </div>
                    </div>
                    {isSelected && <Check className="h-4 w-4 text-[#0071e3] shrink-0 ml-2" />}
                  </div>
                );
              })
            )}
          </div>

          {residents.length > 25 && !search && (
            <div className="p-2 border-t border-[#e2e2e5] bg-[#f5f5f7] text-center text-[10px] text-[#707070]">
              Ketik nama di kolom pencarian untuk menyaring {residents.length} total warga
            </div>
          )}
        </div>
      )}
    </div>
  );
};
