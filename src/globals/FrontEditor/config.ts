import type { GlobalConfig } from 'payload'

import { syncFrontEditorDisplaySizes } from './hooks/syncFrontEditorDisplaySizes'

export const FrontEditor: GlobalConfig = {
  slug: 'front-editor',
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
      maxRows: 50,
      admin: {
        initCollapsed: true,
        description:
          'Velg hvilke saker som skal vises på forsiden, juster rekkefølge, og sett størrelse. Øverst vises øverst på forsiden.',
      },
      fields: [
        {
          name: 'post',
          type: 'relationship',
          relationTo: 'posts',
          required: true,
        },
        {
          name: 'displaySize',
          type: 'select',
          defaultValue: 'large',
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
            description: 'Størrelsen synkroniseres med feltet for visningsstørrelse i selve saken.',
            width: '50%',
          },
          label: 'Visningsstørrelse',
        },
      ],
    },
  ],
  hooks: {
    afterChange: [syncFrontEditorDisplaySizes],
  },
}
