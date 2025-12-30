import type { CollectionConfig } from 'payload'

import { anyone } from '../access/anyone'
import { slugField } from 'payload'

import { ALLOWED_CATEGORY_SLUGS, ALLOWED_CATEGORY_TITLES } from '@/constants/editorialCategories'

export const Categories: CollectionConfig = {
  slug: 'categories',
  access: {
    create: () => false,
    delete: () => false,
    read: anyone,
    update: () => false,
  },
  admin: {
    useAsTitle: 'title',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      admin: {
        description: 'Redaksjonsstyrte kategorier. Listen er låst til fastsatte emner.',
      },
      validate: (value) => {
        if (!value || typeof value !== 'string') return 'Kategori er påkrevd.'

        return ALLOWED_CATEGORY_TITLES.includes(value)
          ? true
          : 'Ugyldig kategori. Bruk en av de forhåndsdefinerte kategoriene.'
      },
    },
    slugField({
      overrides: {
        admin: {
          readOnly: true,
        },
        index: true,
        validate: (value) => {
          if (!value || typeof value !== 'string') return 'Slug er påkrevd.'

          return ALLOWED_CATEGORY_SLUGS.includes(value)
            ? true
            : 'Ugyldig slug. Bruk en av de forhåndsdefinerte kategoriene.'
        },
      },
      position: undefined,
    }),
  ],
}
