import { formatDateTime } from 'src/utilities/formatDateTime'
import React from 'react'

import type { Post } from '@/payload-types'

import { Media } from '@/components/Media'
import { formatAuthors } from '@/utilities/formatAuthors'

export const PostHero: React.FC<{
  post: Post
}> = ({ post }) => {
  const { categories, heroImage, populatedAuthors, publishedAt, title } = post

  const hasAuthors =
    populatedAuthors && populatedAuthors.length > 0 && formatAuthors(populatedAuthors) !== ''

  return (
    <div className="relative isolate -mt-[10.4rem] overflow-hidden bg-black text-white">
      <div className="absolute inset-0">
        {heroImage && typeof heroImage !== 'string' && (
          <Media fill priority imgClassName="object-cover" resource={heroImage} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/20" />
      </div>

      <div className="container relative z-10 max-w-5xl pb-14 pt-[13rem]">
        <div className="flex flex-col gap-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/80">
            {categories?.map((category, index) => {
              if (typeof category === 'object' && category !== null) {
                const { title: categoryTitle } = category

                const titleToUse = categoryTitle || 'Untitled category'

                const isLast = index === categories.length - 1

                return (
                  <React.Fragment key={index}>
                    {titleToUse}
                    {!isLast && <React.Fragment>&nbsp;•&nbsp;</React.Fragment>}
                  </React.Fragment>
                )
              }
              return null
            })}
          </p>

          <h1 className="font-serif text-3xl leading-tight md:text-5xl lg:text-6xl">{title}</h1>

          <div className="flex flex-col gap-3 text-sm text-white/80 sm:flex-row sm:items-center sm:gap-8">
            {hasAuthors && (
              <div className="flex flex-col gap-1">
                <p className="uppercase tracking-[0.08em] text-xs">Forfatter</p>
                <p className="text-base text-white">{formatAuthors(populatedAuthors)}</p>
              </div>
            )}
            {publishedAt && (
              <div className="flex flex-col gap-1">
                <p className="uppercase tracking-[0.08em] text-xs">Publisert</p>
                <time className="text-base text-white" dateTime={publishedAt}>
                  {formatDateTime(publishedAt)}
                </time>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
