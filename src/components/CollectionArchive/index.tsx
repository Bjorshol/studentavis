import Link from 'next/link'
import React from 'react'

import { CardPostData } from '@/components/Card'
import { Media } from '@/components/Media'
import { cn } from '@/utilities/ui'
import useClickableCard from '@/utilities/useClickableCard'

export type Props = {
  posts: CardPostData[]
}

const getDisplaySize = (post?: CardPostData) => {
  if (!post || typeof post !== 'object') return 'large'

  return post.displaySize === 'small' ? 'small' : 'large'
}

const getImage = (post: CardPostData) => {
  if (post.heroImage && typeof post.heroImage !== 'string') return post.heroImage

  if (post.meta?.image && typeof post.meta.image !== 'string') return post.meta.image

  return null
}

const CategoryList: React.FC<{ categories?: CardPostData['categories'] }> = ({ categories }) => {
  if (!categories || categories.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {categories.map((category, index) => {
        if (typeof category !== 'object') return null

        const isLast = index === categories.length - 1

        return (
          <span key={category.id || `${category.title}-${index}`} className="flex items-center gap-2">
            <span>{category.title}</span>
            {!isLast && <span className="h-1 w-1 rounded-full bg-muted-foreground/50" />}
          </span>
        )
      })}
    </div>
  )
}

const LargeArticleCard: React.FC<{ post: CardPostData }> = ({ post }) => {
  const { card, link } = useClickableCard({})
  const image = getImage(post)
  const sanitizedDescription = post.meta?.description?.replace(/\s/g, ' ')
  const href = `/posts/${post.slug}`

  return (
    <article
      className="overflow-hidden rounded-3xl border bg-card shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-lg"
      ref={card.ref}
    >
      {image && (
        <Link className="block" href={href} ref={link.ref}>
          <div className="relative aspect-[16/9] w-full">
            <Media fill imgClassName="object-cover" resource={image} />
          </div>
        </Link>
      )}
      <div className="flex flex-col gap-3 p-6 md:p-8">
        <CategoryList categories={post.categories} />
        {post.title && (
          <h2 className="text-2xl font-semibold leading-tight tracking-tight md:text-3xl">
            <Link className="no-underline" href={href} ref={!image ? link.ref : undefined}>
              {post.title}
            </Link>
          </h2>
        )}
        {sanitizedDescription && (
          <p className="max-w-4xl text-lg text-muted-foreground">{sanitizedDescription}</p>
        )}
      </div>
    </article>
  )
}

const SmallArticleCard: React.FC<{ post: CardPostData }> = ({ post }) => {
  const { card, link } = useClickableCard({})
  const image = getImage(post)
  const sanitizedDescription = post.meta?.description?.replace(/\s/g, ' ')
  const href = `/posts/${post.slug}`

  return (
    <article
      className="flex h-full flex-col overflow-hidden rounded-2xl border bg-card shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-lg"
      ref={card.ref}
    >
      <div className="flex flex-1 flex-col gap-3 p-4 sm:p-5">
        <div className="flex gap-3 sm:flex-col">
          {image && (
            <Link className="block w-32 shrink-0 sm:w-full" href={href} ref={link.ref}>
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl">
                <Media fill imgClassName="object-cover" loading="lazy" resource={image} />
              </div>
            </Link>
          )}
          <div className="flex flex-1 flex-col gap-2">
            <CategoryList categories={post.categories} />
            {post.title && (
              <h3 className="text-lg font-semibold leading-snug">
                <Link className="no-underline" href={href} ref={!image ? link.ref : undefined}>
                  {post.title}
                </Link>
              </h3>
            )}
            {sanitizedDescription && <p className="text-sm text-muted-foreground">{sanitizedDescription}</p>}
          </div>
        </div>
      </div>
    </article>
  )
}

const SmallArticlesGroup: React.FC<{ posts: CardPostData[]; keyPrefix: string }> = ({ posts, keyPrefix }) => {
  if (posts.length === 0) return null

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {posts.map((post, index) => (
        <SmallArticleCard key={`${keyPrefix}-${post.slug}-${index}`} post={post} />
      ))}
    </div>
  )
}

export const CollectionArchive: React.FC<Props> = ({ posts }) => {
  const sections: React.ReactNode[] = []
  let pendingSmall: CardPostData[] = []

  const flushSmall = () => {
    if (pendingSmall.length === 0) return

    sections.push(
      <SmallArticlesGroup key={`small-group-${sections.length}`} keyPrefix={`small-${sections.length}`} posts={pendingSmall} />,
    )
    pendingSmall = []
  }

  posts?.forEach((post) => {
    if (!post || typeof post !== 'object') return

    if (getDisplaySize(post) === 'small') {
      pendingSmall.push(post)
      return
    }

    flushSmall()

    sections.push(<LargeArticleCard key={`large-${post.slug}`} post={post} />)
  })

  flushSmall()

  return (
    <div className={cn('container')}>
      <div className="flex flex-col gap-8 lg:gap-12">{sections}</div>
    </div>
  )
}
