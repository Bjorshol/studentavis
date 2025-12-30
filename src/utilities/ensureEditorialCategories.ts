import type { Payload } from 'payload'

import {
  ALLOWED_CATEGORY_SLUGS,
  EDITORIAL_CATEGORIES,
  LEGACY_NEWS_SLUGS,
} from '@/constants/editorialCategories'

const normalizeCategoryId = (category: unknown): string | undefined => {
  if (!category) return undefined

  if (typeof category === 'string') return category

  if (typeof category === 'object' && 'id' in category && category.id) {
    return String(category.id)
  }

  return undefined
}

const normalizeCategorySlug = (category: unknown): string | undefined => {
  if (!category) return undefined

  if (typeof category === 'object' && 'slug' in category && category.slug) {
    return String(category.slug)
  }

  return undefined
}

export const ensureEditorialCategories = async (payload: Payload) => {
  const existing = await payload.find({
    collection: 'categories',
    depth: 0,
    limit: ALLOWED_CATEGORY_SLUGS.length,
    overrideAccess: true,
    pagination: false,
    where: {
      slug: { in: ALLOWED_CATEGORY_SLUGS },
    },
  })

  const categoriesBySlug = new Map<string, string>()

  for (const category of existing.docs) {
    if (category?.slug) {
      categoriesBySlug.set(category.slug, String(category.id))
    }
  }

  for (const category of EDITORIAL_CATEGORIES) {
    if (categoriesBySlug.has(category.slug)) {
      const existingCategoryId = categoriesBySlug.get(category.slug)
      if (existingCategoryId) {
        await payload.update({
          id: existingCategoryId,
          collection: 'categories',
          data: { title: category.title, slug: category.slug },
          overrideAccess: true,
        })
      }
      continue
    }

    const created = await payload.create({
      collection: 'categories',
      data: category,
      overrideAccess: true,
    })

    if (created?.slug) {
      categoriesBySlug.set(created.slug, String(created.id))
    }
  }

  const legacyNews = await payload.find({
    collection: 'categories',
    depth: 0,
    limit: 100,
    overrideAccess: true,
    pagination: false,
    where: {
      slug: { in: [...LEGACY_NEWS_SLUGS, 'nyheter'] },
    },
  })

  const nyheterId = categoriesBySlug.get('nyheter')
  const legacyNewsIds = legacyNews.docs
    .filter(({ slug }) => slug && LEGACY_NEWS_SLUGS.includes(slug))
    .map(({ id }) => String(id))

  const allowedIds = new Set(categoriesBySlug.values())

  const posts = await payload.find({
    collection: 'posts',
    depth: 0,
    limit: 1000,
    overrideAccess: true,
    pagination: false,
    select: {
      categories: true,
    },
  })

  for (const post of posts.docs) {
    const currentCategories = Array.isArray(post.categories) ? post.categories : []
    const currentIds = currentCategories
      .map((category) => normalizeCategoryId(category))
      .filter((categoryId): categoryId is string => Boolean(categoryId))
    const nextCategories: string[] = []

    for (const category of currentCategories) {
      const categoryId = normalizeCategoryId(category)
      const categorySlug = normalizeCategorySlug(category)

      if (categorySlug && categoriesBySlug.has(categorySlug)) {
        const resolvedId = categoriesBySlug.get(categorySlug)
        if (resolvedId) nextCategories.push(resolvedId)
        continue
      }

      if (categoryId && legacyNewsIds.includes(categoryId) && nyheterId) {
        nextCategories.push(nyheterId)
        continue
      }

      if (categoryId && allowedIds.has(categoryId)) {
        nextCategories.push(categoryId)
      }
    }

    const uniqueCategories = Array.from(new Set(nextCategories))

    const hasChanged =
      uniqueCategories.length !== currentIds.length ||
      uniqueCategories.some((category, index) => category !== currentIds[index])

    if (hasChanged) {
      await payload.update({
        id: String(post.id),
        collection: 'posts',
        data: { categories: uniqueCategories },
        overrideAccess: true,
      })
    }
  }

  const categoriesToRemove = await payload.find({
    collection: 'categories',
    depth: 0,
    limit: 500,
    overrideAccess: true,
    pagination: false,
    where: {
      slug: {
        not_in: ALLOWED_CATEGORY_SLUGS,
      },
    },
  })

  for (const category of categoriesToRemove.docs) {
    if (category.slug && ALLOWED_CATEGORY_SLUGS.includes(category.slug)) continue

    await payload.delete({
      collection: 'categories',
      id: String(category.id),
      overrideAccess: true,
    })
  }
}
