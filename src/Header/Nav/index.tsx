'use client'

import React from 'react'

import type { Header as HeaderType } from '@/payload-types'

import { CMSLink } from '@/components/Link'
import Link from 'next/link'
import { SearchIcon } from 'lucide-react'
import { cn } from '@/utilities/ui'

export const HeaderNav: React.FC<{ data: HeaderType; className?: string }> = ({ data, className }) => {
  const navItems = data?.navItems || []

  return (
    <nav className={cn('flex items-center gap-5 text-sm font-semibold uppercase tracking-tight', className)}>
      {navItems.map(({ link }, i) => {
        return <CMSLink key={i} {...link} appearance="link" className="text-white hover:text-[#cfe5cf]" />
      })}
      <Link className="text-white hover:text-[#cfe5cf]" href="/search">
        <span className="sr-only">Search</span>
        <SearchIcon className="w-5" />
      </Link>
    </nav>
  )
}
