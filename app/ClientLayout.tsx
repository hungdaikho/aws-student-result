"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import Image from "next/image"

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [hideHeader, setHideHeader] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    // Hide header on admin, wilaya, and school pages
    setHideHeader(pathname === "/admin" || pathname === "/wilaya" || pathname === "/school")
  }, [pathname])

  if (hideHeader) {
    return <>{children}</>
  }

  // Check if we're on the results page
  const isResultsPage = pathname === "/results"

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className={`${isResultsPage ? 'bg-transparent shadow-none border-none' : 'bg-white shadow-sm border-b border-gray-200'}`}>
        <div className="container mx-auto px-4 py-3 sm:py-4">
          <div className="flex justify-center items-center">
            {/* Centered Logo */}
            <Link href="/" className="flex items-center">
              <Image
                src="/images/medrasti-logo.svg"
                alt="Medrasti Logo"
                width={120}
                height={40}
                className="h-8 sm:h-10 w-auto"
                priority
              />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main>{children}</main>
    </div>
  )
}
