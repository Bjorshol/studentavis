import type { GlobalConfig } from 'payload'

export const FrontPageLayout: GlobalConfig = {
  slug: 'front-page',
  access: {
    read: () => true,
  },
  admin: {
    group: 'Forside',
    hideAPIURL: true,
  },
  fields: [
    {
      name: 'stack',
      type: 'relationship',
      label: 'Forsideordre',
      relationTo: 'posts',
      hasMany: true,
      maxRows: 50,
      admin: {
        description: 'Dra publiserte saker inn i ønsket rekkefølge for forsiden.',
        components: {
          Field: '@/components/FrontPageEditor/FrontPageEditor#FrontPageEditorField',
        },
      },
    },
  ],
}
