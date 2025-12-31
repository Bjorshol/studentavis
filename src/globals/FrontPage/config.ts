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
      name: 'items',
      type: 'array',
      label: 'Forsidesaker',
      labels: {
        singular: 'Sak',
        plural: 'Saker',
      },
      maxRows: 50,
      admin: {
        description:
          'Velg rekkefølgen på sakene som skal vises på forsiden. Dra og slipp for å endre rekkefølge, og velg om hver sak skal vises som stor eller liten.',
        initCollapsed: true,
      },
      fields: [
        {
          name: 'post',
          type: 'relationship',
          relationTo: 'posts',
          required: true,
          label: 'Sak',
        },
        {
          name: 'displaySize',
          type: 'select',
          defaultValue: 'large',
          label: 'Visningsstørrelse',
          options: [
            {
              label: 'Stor',
              value: 'large',
            },
            {
              label: 'Liten',
              value: 'small',
            },
          ],
          admin: {
            width: '50%',
          },
        },
      ],
    },
  ],
}
