"use client"

import * as React from "react"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

// ProductDescriptionTabs — DESIGN §12.6 below-fold panel switcher. Tabs
// horizontal on md+, Accordion stacked on mobile per Phase 7 plan D2.
//
// Implementation: render BOTH widgets and use Tailwind responsive classes
// to swap visibility. Both are client components (Radix Tabs / Accordion
// each need their own state). Empty sections are filtered out by the
// caller (PDP page) before the array reaches us — null fields don't
// produce empty tabs, per plan D3.

export interface ProductDescriptionSection {
  id: string
  label: string
  content: string
}

export interface ProductDescriptionTabsProps {
  sections: ProductDescriptionSection[]
  className?: string
}

export function ProductDescriptionTabs({ sections, className }: ProductDescriptionTabsProps) {
  if (sections.length === 0) return null
  const firstId = sections[0]!.id

  return (
    <div className={cn("w-full", className)} data-slot="product-description">
      {/* Mobile: accordion, all panels expanded by default per PRODUCT §F-CAT-003. */}
      <Accordion type="multiple" defaultValue={sections.map((s) => s.id)} className="md:hidden">
        {sections.map((section) => (
          <AccordionItem key={section.id} value={section.id}>
            <AccordionTrigger className="text-body text-ink-900 font-semibold">
              {section.label}
            </AccordionTrigger>
            <AccordionContent className="text-body text-ink-700">
              <p className="whitespace-pre-line">{section.content}</p>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      {/* Desktop: horizontal tabs. */}
      <Tabs defaultValue={firstId} className="hidden md:block">
        <TabsList className="flex flex-wrap justify-start">
          {sections.map((section) => (
            <TabsTrigger key={section.id} value={section.id}>
              {section.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {sections.map((section) => (
          <TabsContent key={section.id} value={section.id} className="text-body text-ink-700">
            <p className="whitespace-pre-line">{section.content}</p>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
