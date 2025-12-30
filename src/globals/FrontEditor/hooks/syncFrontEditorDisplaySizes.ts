import type { GlobalAfterChangeHook } from 'payload'

import { revalidatePath } from 'next/cache'

import type { FrontEditor, Post } from '@/payload-types'

const getPostId = (post: FrontEditor['items'][number]['post']): string | null => {
  if (!post) return null

  if (typeof post === 'string') {
    return post
  }

  if (typeof post === 'object' && 'id' in post) {
    return post.id as string
  }

  return null
}

export const syncFrontEditorDisplaySizes: GlobalAfterChangeHook<FrontEditor> = async ({ doc, req }) => {
  if (req.context?.postSyncFront) return doc

  const items = doc.items || []

  for (const item of items) {
    const postId = getPostId(item?.post)

    if (!postId || !item?.displaySize) continue

    await req.payload.update({
      id: postId,
      collection: 'posts',
      data: { displaySize: item.displaySize as Post['displaySize'] },
      context: { ...req.context, frontEditorSync: true },
      req,
      overrideAccess: false,
    })
  }

  revalidatePath('/')

  return doc
}
