'use client'
import { useHeaderTheme } from '@/providers/HeaderTheme'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React, { useEffect, useState } from 'react'
import { Inter, Playfair_Display } from 'next/font/google'

import type { Header } from '@/payload-types'

import { HeaderNav } from './Nav'

interface HeaderClientProps {
  data: Header
}

export const HeaderClient: React.FC<HeaderClientProps> = ({ data }) => {
  /* Storing the value in a useState to avoid hydration errors */
  const [theme, setTheme] = useState<string | null>(null)
  const { headerTheme, setHeaderTheme } = useHeaderTheme()
  const pathname = usePathname()

  useEffect(() => {
    setHeaderTheme(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  useEffect(() => {
    if (headerTheme && headerTheme !== theme) setTheme(headerTheme)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [headerTheme])

  return (
    <header
      className="sticky top-0 z-40 w-full border-b border-[#0b5d18]/40 bg-[#0b5d18] text-white shadow-md"
      {...(theme ? { 'data-theme': theme } : {})}
    >
      <div className="mx-auto flex h-16 w-full max-w-[960px] items-center justify-between px-5">
        <Link className="flex items-center gap-3" href="/">
          <span className={`${playfair.className} text-2xl font-extrabold text-white`}>Innposten</span>
        </Link>
        <HeaderNav className={inter.className} data={data} />
      </div>
    </header>
  )
}

const playfair = Playfair_Display({ subsets: ['latin'], weight: ['700', '800', '900'] })
const inter = Inter({ subsets: ['latin'], weight: ['400', '600', '700'] })
