import type { Metadata } from 'next'

import { PayloadRedirects } from '@/components/PayloadRedirects'
import configPromise from '@payload-config'
import { getPayload, type RequiredDataFromCollectionSlug } from 'payload'
import { draftMode } from 'next/headers'
import Link from 'next/link'
import Image from 'next/image'
import React, { cache } from 'react'
import { Inter, Playfair_Display } from 'next/font/google'

import { RenderBlocks } from '@/blocks/RenderBlocks'
import { RenderHero } from '@/heros/RenderHero'
import { generateMeta } from '@/utilities/generateMeta'
import PageClient from './page.client'
import { LivePreviewListener } from '@/components/LivePreviewListener'
import { homeStatic } from '@/endpoints/seed/home-static'

export async function generateStaticParams() {
  const payload = await getPayload({ config: configPromise })
  const pages = await payload.find({
    collection: 'pages',
    draft: false,
    limit: 1000,
    overrideAccess: false,
    pagination: false,
    select: {
      slug: true,
    },
  })

  const params = pages.docs
    ?.filter((doc) => {
      return doc.slug !== 'home'
    })
    .map(({ slug }) => {
      return { slug }
    })

  return params
}

type Args = {
  params: Promise<{
    slug?: string
  }>
}

export default async function Page({ params: paramsPromise }: Args) {
  const { isEnabled: draft } = await draftMode()
  const { slug = 'home' } = await paramsPromise
  // Decode to support slugs with special characters
  const decodedSlug = decodeURIComponent(slug)
  const url = '/' + decodedSlug
  const isHomePage = decodedSlug === 'home'
  let page: RequiredDataFromCollectionSlug<'pages'> | null

  page = await queryPageBySlug({
    slug: decodedSlug,
  })

  // Remove this code once your website is seeded
  if (!page && slug === 'home') {
    page = homeStatic
  }

  if (!page) {
    return <PayloadRedirects url={url} />
  }

  const { hero, layout } = page
  const homePosts = isHomePage ? await queryFrontPagePosts({ draft }) : []

  return (
    <article className="pt-16 pb-24">
      <PageClient />
      {/* Allows redirects for valid pages too */}
      <PayloadRedirects disableNotFound url={url} />

      {draft && <LivePreviewListener />}

      {isHomePage ? (
        <HomeLanding posts={homePosts} />
      ) : (
        <>
          <RenderHero {...hero} />
          <RenderBlocks blocks={layout} />
        </>
      )}
    </article>
  )
}

export async function generateMetadata({ params: paramsPromise }: Args): Promise<Metadata> {
  const { slug = 'home' } = await paramsPromise
  // Decode to support slugs with special characters
  const decodedSlug = decodeURIComponent(slug)
  let page = await queryPageBySlug({
    slug: decodedSlug,
  })

  if (!page && decodedSlug === 'home') {
    page = homeStatic
  }

  return generateMeta({ doc: page })
}

const queryPageBySlug = cache(async ({ slug }: { slug: string }) => {
  const { isEnabled: draft } = await draftMode()

  const payload = await getPayload({ config: configPromise })

  const result = await payload.find({
    collection: 'pages',
    draft,
    limit: 1,
    pagination: false,
    overrideAccess: draft,
    where: {
      slug: {
        equals: slug,
      },
    },
  })

  return result.docs?.[0] || null
})

const queryFrontPagePosts = cache(async ({ draft }: { draft: boolean }) => {
  const payload = await getPayload({ config: configPromise })

  const frontEditor = await payload.findGlobal({
    slug: 'front-editor',
    draft,
    depth: 2,
    overrideAccess: draft,
  })

  const configuredPosts: FrontPagePost[] = []
  const usedPostIds = new Set<string>()

  for (const item of frontEditor.items || []) {
    const post = item?.post

    if (post && typeof post === 'object' && 'id' in post) {
      configuredPosts.push({
        displaySize: (item?.displaySize || post.displaySize) ?? 'large',
        post: post as HomePost,
      })
      usedPostIds.add(post.id as string)
    } else if (typeof post === 'string') {
      usedPostIds.add(post)
    }
  }

  const remaining = Math.max(0, 50 - configuredPosts.length)

  let fallbackPosts: FrontPagePost[] = []

  if (remaining > 0) {
    const fallbackResult = await payload.find({
      collection: 'posts',
      draft,
      depth: 2,
      limit: remaining,
      overrideAccess: draft,
      pagination: false,
      select: {
        displaySize: true,
        heroImage: true,
        meta: true,
        slug: true,
        title: true,
      },
      sort: '-publishedAt',
      where: usedPostIds.size
        ? {
            id: {
              not_in: Array.from(usedPostIds),
            },
          }
        : undefined,
    })

    fallbackPosts = fallbackResult.docs.map((post) => ({
      displaySize: post.displaySize ?? 'large',
      post: post as HomePost,
    }))
  }

  return [...configuredPosts, ...fallbackPosts]
})

type HomePost = RequiredDataFromCollectionSlug<'posts'>

type FrontPagePost = {
  displaySize: HomePost['displaySize']
  post: HomePost
}

type FrontPost = {
  displaySize: HomePost['displaySize']
  title: string
  description?: string | null
  href?: string
  image?: string | null
}

const playfair = Playfair_Display({ subsets: ['latin'], weight: ['700', '800', '900'] })
const inter = Inter({ subsets: ['latin'], weight: ['400', '600', '700'] })

const normalizePost = (post: HomePost, displaySize: HomePost['displaySize']): FrontPost => {
  const imageFromHero =
    post.heroImage && typeof post.heroImage === 'object' && 'url' in post.heroImage
      ? post.heroImage.url
      : null

  const imageFromMeta =
    post.meta?.image && typeof post.meta.image === 'object' && 'url' in post.meta.image
      ? post.meta.image.url
      : null

  return {
    displaySize,
    description: post.meta?.description,
    href: post.slug ? `/posts/${post.slug}` : undefined,
    image: imageFromHero || imageFromMeta,
    title: post.title || 'Uten tittel',
  }
}

const HomeLanding: React.FC<{ posts: FrontPagePost[] }> = ({ posts }) => {
  const frontPagePosts = posts.map(({ displaySize, post }) => normalizePost(post, displaySize ?? 'large'))

  if (!frontPagePosts.length) return null

  const cardBaseClasses =
    'block w-full border border-neutral-200 bg-white text-neutral-900 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md'

  return (
    <div className="bg-[#f2f3ea] py-10">
      <div className="mx-auto flex w-full max-w-[720px] flex-col gap-6 px-4">
        {frontPagePosts.map((frontPost, index) =>
          frontPost.displaySize === 'small' ? (
            <ArticleSmall
              cardClasses={cardBaseClasses}
              key={frontPost.href || `${frontPost.title}-${index}`}
              post={frontPost}
              showImage
              titleClassName="text-[1.6rem] leading-tight"
            />
          ) : (
            <ArticleLarge
              cardClasses={cardBaseClasses}
              key={frontPost.href || `${frontPost.title}-${index}`}
              post={frontPost}
              titleClassName="text-[2rem] leading-snug"
            />
          )
        )}
      </div>
    </div>
  )
}

const ArticleLarge: React.FC<{ post: FrontPost; titleClassName?: string; cardClasses: string }> = ({
  post,
  titleClassName,
  cardClasses,
}) => {
  const content = (
    <div className={`${cardClasses} overflow-hidden`}>
      {post.image ? (
        <div className="relative h-64 w-full overflow-hidden bg-neutral-200">
          <Image
            alt={post.title}
            className="object-cover"
            fill
            sizes="(min-width: 1024px) 720px, 100vw"
            src={post.image}
          />
        </div>
      ) : (
        <div className="h-64 w-full bg-gradient-to-br from-emerald-200 via-white to-emerald-50" />
      )}
      <div className="px-5 py-6">
        <h2 className={`${playfair.className} ${titleClassName} font-bold text-neutral-900`}>{post.title}</h2>
        {post.description && (
          <p className={`${inter.className} mt-3 text-base text-neutral-700`}>{post.description}</p>
        )}
      </div>
    </div>
  )

  if (post.href) {
    return <Link href={post.href}>{content}</Link>
  }

  return content
}

const ArticleSmall: React.FC<{
  post: FrontPost
  titleClassName?: string
  cardClasses: string
  showImage?: boolean
}> = ({ post, titleClassName, cardClasses, showImage = false }) => {
  const content = (
    <div className={`${cardClasses} px-4 py-4`}>
      <div className="flex items-center gap-4">
        {showImage && post.image && (
          <div className="relative h-24 w-24 overflow-hidden rounded-md bg-neutral-200">
            <Image alt={post.title} className="object-cover" fill sizes="96px" src={post.image} />
          </div>
        )}
        <div>
          <h3 className={`${playfair.className} ${titleClassName} font-bold text-neutral-900`}>{post.title}</h3>
          {post.description && (
            <p className={`${inter.className} mt-2 text-sm text-neutral-700`}>{post.description}</p>
          )}
        </div>
      </div>
    </div>
  )

  if (post.href) {
    return <Link href={post.href}>{content}</Link>
  }

  return content
}
