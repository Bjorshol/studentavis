import type { Metadata } from 'next'

import { RelatedPosts } from '@/blocks/RelatedPosts/Component'
import { PayloadRedirects } from '@/components/PayloadRedirects'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { draftMode } from 'next/headers'
import React, { cache } from 'react'
import RichText from '@/components/RichText'

import type { DefaultTypedEditorState } from '@payloadcms/richtext-lexical'
import type { Post } from '@/payload-types'

import { PostHero } from '@/heros/PostHero'
import { formatAuthors } from '@/utilities/formatAuthors'
import { formatDateTime } from '@/utilities/formatDateTime'
import { generateMeta } from '@/utilities/generateMeta'
import PageClient from './page.client'
import { LivePreviewListener } from '@/components/LivePreviewListener'

export async function generateStaticParams() {
  const payload = await getPayload({ config: configPromise })
  const posts = await payload.find({
    collection: 'posts',
    draft: false,
    limit: 1000,
    overrideAccess: false,
    pagination: false,
    select: {
      slug: true,
    },
  })

  const params = posts.docs.map(({ slug }) => {
    return { slug }
  })

  return params
}

type Args = {
  params: Promise<{
    slug?: string
  }>
}

export default async function Post({ params: paramsPromise }: Args) {
  const { isEnabled: draft } = await draftMode()
  const { slug = '' } = await paramsPromise
  // Decode to support slugs with special characters
  const decodedSlug = decodeURIComponent(slug)
  const url = '/posts/' + decodedSlug
  const post = await queryPostBySlug({ slug: decodedSlug })
  const leadParagraph = deriveLeadParagraph(post?.content)

  if (!post) return <PayloadRedirects url={url} />

  return (
    <article className="bg-neutral-50 pb-20 text-neutral-900">
      <PageClient />

      {/* Allows redirects for valid pages too */}
      <PayloadRedirects disableNotFound url={url} />

      {draft && <LivePreviewListener />}

      <PostHero post={post} />

      <div className="pt-10">
        <div className="container">
          <div className="mx-auto flex max-w-4xl flex-col gap-10 bg-white px-4 py-8 shadow-sm sm:px-8 sm:py-10 lg:px-12">
            <div className="flex flex-col gap-3 border-b border-neutral-200 pb-6 text-sm text-neutral-600 sm:flex-row sm:items-center sm:justify-between">
              {post.publishedAt && (
                <time className="font-semibold uppercase tracking-[0.08em]" dateTime={post.publishedAt}>
                  {formatDateTime(post.publishedAt)}
                </time>
              )}

              {post.populatedAuthors && post.populatedAuthors.length > 0 && (
                <p className="flex flex-wrap items-center gap-2">
                  <span className="uppercase tracking-[0.08em] text-neutral-500">Av</span>
                  <span className="font-medium text-neutral-800">{formatAuthors(post.populatedAuthors)}</span>
                </p>
              )}
            </div>

            {leadParagraph && (
              <p className="font-serif text-xl leading-relaxed text-neutral-800 md:text-2xl">{leadParagraph}</p>
            )}

            <RichText
              className="article-body mx-auto max-w-3xl prose prose-lg md:prose-xl prose-headings:font-serif prose-headings:text-neutral-900 prose-h2:mt-12 prose-h3:mt-10 prose-p:my-6 prose-p:leading-8 prose-li:my-2 prose-img:rounded-md prose-figure:my-8"
              data={post.content}
              enableGutter={false}
            />
          </div>

          {post.relatedPosts && post.relatedPosts.length > 0 && (
            <RelatedPosts
              className="mx-auto mt-12 max-w-5xl lg:grid lg:grid-cols-subgrid col-start-1 col-span-3 grid-rows-[2fr]"
              docs={post.relatedPosts.filter((post) => typeof post === 'object')}
            />
          )}
        </div>
      </div>
    </article>
  )
}

export async function generateMetadata({ params: paramsPromise }: Args): Promise<Metadata> {
  const { slug = '' } = await paramsPromise
  // Decode to support slugs with special characters
  const decodedSlug = decodeURIComponent(slug)
  const post = await queryPostBySlug({ slug: decodedSlug })

  return generateMeta({ doc: post })
}

const deriveLeadParagraph = (content?: DefaultTypedEditorState) => {
  const rootChildren = content?.root?.children

  if (!rootChildren || !Array.isArray(rootChildren)) return null

  for (const node of rootChildren) {
    if (node && typeof node === 'object' && 'type' in node && node.type === 'paragraph') {
      const paragraphChildren = Array.isArray((node as { children?: unknown }).children)
        ? ((node as { children?: DefaultTypedEditorState[] }).children as Array<{
            text?: string
            type?: string
          }> | null)
        : null

      if (!paragraphChildren) continue

      const paragraphText = paragraphChildren
        .filter((child) => child?.type === 'text' && typeof child.text === 'string')
        .map((child) => child.text?.trim())
        .filter(Boolean)
        .join(' ')

      if (paragraphText) {
        return paragraphText
      }
    }
  }

  return null
}

const queryPostBySlug = cache(async ({ slug }: { slug: string }) => {
  const { isEnabled: draft } = await draftMode()

  const payload = await getPayload({ config: configPromise })

  const result = await payload.find({
    collection: 'posts',
    draft,
    limit: 1,
    overrideAccess: draft,
    pagination: false,
    where: {
      slug: {
        equals: slug,
      },
    },
  })

  return result.docs?.[0] || null
})
