export type EditorialCategory = {
  slug: string
  title: string
}

export const EDITORIAL_CATEGORIES: EditorialCategory[] = [
  { title: 'Nyheter', slug: 'nyheter' },
  { title: 'Studentliv', slug: 'studentliv' },
  { title: 'Kultur', slug: 'kultur' },
  { title: 'Landet rundt', slug: 'landet-rundt' },
  { title: 'Inntriger', slug: 'inntriger' },
]

export const ALLOWED_CATEGORY_SLUGS = EDITORIAL_CATEGORIES.map(({ slug }) => slug)
export const ALLOWED_CATEGORY_TITLES = EDITORIAL_CATEGORIES.map(({ title }) => title)
export const LEGACY_NEWS_SLUGS = ['news']
