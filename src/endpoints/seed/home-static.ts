import type { RequiredDataFromCollectionSlug } from 'payload'

// Used for pre-seeded content so that the homepage is not empty
export const homeStatic: RequiredDataFromCollectionSlug<'pages'> = {
  slug: 'home',
  _status: 'published',
  hero: {
    type: 'none',
    richText: null,
  },
  meta: {
    description: 'Siste nytt, undersøkelser og meninger fra studentavisa Innposten.',
    title: 'Innposten – Studentavisa',
  },
  title: 'Innposten',
  layout: [],
}
