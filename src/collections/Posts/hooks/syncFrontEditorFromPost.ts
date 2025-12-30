import type { CollectionAfterChangeHook } from 'payload'

import type { Post } from '@/payload-types'

export const syncFrontEditorFromPost: CollectionAfterChangeHook<Post> = async ({
  doc,
  previousDoc,
  req,
}) => {
  if (req.context?.frontEditorSync) return doc
  if (doc.displaySize === previousDoc?.displaySize) return doc

  const frontEditor = await req.payload.findGlobal({
    slug: 'front-editor',
    depth: 0,
    overrideAccess: false,
    req,
  })

  const items = frontEditor.items || []

  let updated = false
  const updatedItems = items.map((item) => {
    if (!item?.post) return item

    const postId = typeof item.post === 'string' ? item.post : ('id' in item.post ? item.post.id : null)

    if (postId !== doc.id) return item

    updated = true

    return {
      ...item,
      displaySize: doc.displaySize,
    }
  })

  if (updated) {
    await req.payload.updateGlobal({
      slug: 'front-editor',
      data: { items: updatedItems },
      context: { ...req.context, postSyncFront: true },
      overrideAccess: false,
      req,
    })
  }

  return doc
}
