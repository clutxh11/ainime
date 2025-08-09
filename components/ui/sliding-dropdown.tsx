"use client";

import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown } from "lucide-react";

export interface SlidingDropdownItem {
  id: string;
  title: string;
  status?: string;
}

interface SlidingDropdownProps {
  title: string;
  items: SlidingDropdownItem[];
  onItemClick: (item: SlidingDropdownItem) => void;
  showStatusBadges?: boolean;
}

export function SlidingDropdown({
  title,
  items,
  onItemClick,
  showStatusBadges = false,
}: SlidingDropdownProps) {
  const [open, setOpen] = useState<boolean>(false);

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardContent className="p-0">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 text-left text-white hover:bg-gray-700"
        >
          <span className="font-semibold">{title}</span>
          <ChevronDown
            className={`w-4 h-4 transition-transform ${
              open ? "rotate-180" : "rotate-0"
            }`}
          />
        </button>

        {open && (
          <div className="divide-y divide-gray-700">
            {items.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-400">No items</div>
            ) : (
              items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onItemClick(item)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left text-gray-200 hover:bg-gray-700"
                >
                  <span className="truncate pr-2">{item.title}</span>
                  {showStatusBadges && item.status && (
                    <Badge variant="secondary" className="ml-2">
                      {item.status}
                    </Badge>
                  )}
                </button>
              ))
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
