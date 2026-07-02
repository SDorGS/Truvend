"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";

interface Props {
  onSearch: (query: string) => void;
  defaultValue?: string;
}

export default function SearchBar({ onSearch, defaultValue = "" }: Props) {
  const [query, setQuery] = useState(defaultValue);

  return (
    <div className="mb-6">
      <Input
        type="search"
        placeholder="Search listings..."
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          onSearch(e.target.value);
        }}
      />
    </div>
  );
}
