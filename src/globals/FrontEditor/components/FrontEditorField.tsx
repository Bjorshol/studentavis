'use client'
/* eslint-disable @next/next/no-img-element */

import type { ArrayFieldClientComponent } from 'payload'
import { useEffect, useMemo, useState } from 'react'

import {
  DndContext,
  PointerSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { DragHandleIcon, EditIcon, MoreIcon, useConfig, useField } from '@payloadcms/ui'

import type { FrontEditor, Post } from '@/payload-types'

import './frontEditorField.scss'

type FrontEditorItem = NonNullable<FrontEditor['items']>[number]

type PostSummary = Pick<Post, 'id' | 'title' | 'displaySize'> & {
  heroImage?: Post['heroImage']
}

const getPostId = (post: FrontEditorItem['post']): string | undefined => {
  if (!post) return undefined

  if (typeof post === 'string') return post

  if (typeof post === 'object' && 'id' in post) {
    return post.id as string
  }

  return undefined
}

const getItemKey = (item: FrontEditorItem, index: number): string => {
  if (item?.id) return String(item.id)

  const relatedPostId = getPostId(item.post)
  if (relatedPostId) return `stack-${relatedPostId}`

  return `stack-${index}`
}

const getHeroImage = (post?: PostSummary | null): string | undefined => {
  if (!post?.heroImage || typeof post.heroImage !== 'object') return undefined

  if ('url' in post.heroImage && post.heroImage.url) return post.heroImage.url

  return undefined
}

const StackRow = ({
  item,
  itemKey,
  post,
  adminRoute,
  onRemove,
  onSizeChange,
}: {
  adminRoute: string
  item: FrontEditorItem
  itemKey: string
  onRemove: (key: string) => void
  onSizeChange: (key: string, size: Post['displaySize']) => void
  post?: PostSummary | null
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: itemKey,
    data: { type: 'stack' },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const displaySize = item.displaySize || post?.displaySize || 'large'
  const heroImage = getHeroImage(post)

  return (
    <div className={`front-editor-field__stack-row${isDragging ? ' is-dragging' : ''}`} ref={setNodeRef} style={style}>
      <button className="front-editor-field__drag-handle" type="button" {...attributes} {...listeners}>
        <DragHandleIcon />
      </button>
      <div className="front-editor-field__stack-visual">
        {heroImage ? (
          <img alt={post?.title || 'Forsidesak'} src={heroImage} />
        ) : (
          <div className="front-editor-field__placeholder" aria-hidden />
        )}
      </div>
      <div className="front-editor-field__stack-meta">
        <div className="front-editor-field__stack-title">{post?.title || 'Uten tittel'}</div>
        <div className="front-editor-field__stack-controls">
          <label className="front-editor-field__size-label">
            Visningsstørrelse
            <select
              aria-label="Visningsstørrelse"
              disabled={disabled}
              onChange={(event) => onSizeChange(itemKey, event.target.value as Post['displaySize'])}
              value={displaySize || 'large'}
            >
              <option value="large">Stor</option>
              <option value="small">Liten</option>
            </select>
          </label>
          <details className="front-editor-field__actions">
            <summary aria-label="Flere valg">
              <MoreIcon />
            </summary>
            <div className="front-editor-field__actions-menu">
              {post?.id && (
                <a href={`${adminRoute}/collections/posts/${post.id}`} rel="noreferrer" target="_blank">
                  <EditIcon /> Rediger
                </a>
              )}
              <button disabled={disabled} onClick={() => onRemove(itemKey)} type="button">
                Fjern fra forsiden
              </button>
            </div>
          </details>
        </div>
      </div>
    </div>
  )
}

const PublishedCard = ({
  post,
  onAdd,
}: {
  onAdd: (post: PostSummary) => void
  post: PostSummary
}) => {
  const postId = String(post.id)
  const heroImage = getHeroImage(post)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `pool-${postId}`,
    data: { postId, type: 'pool' },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      className={`front-editor-field__pool-card${isDragging ? ' is-dragging' : ''}`}
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
    >
      <div className="front-editor-field__pool-image">
        {heroImage ? <img alt={post.title || 'Publisert sak'} src={heroImage} /> : <div className="front-editor-field__placeholder" />}
      </div>
      <div className="front-editor-field__pool-title">{post.title || 'Uten tittel'}</div>
      <button className="front-editor-field__pool-add" disabled={isDragging} onClick={() => onAdd(post)} type="button">
        Legg til på forsiden
      </button>
    </div>
  )
}

const FrontEditorField: ArrayFieldClientComponent = (props) => {
  const { path, field } = props
  const { value, setValue } = useField<FrontEditor['items']>({ path })
  const { config: clientConfig } = useConfig()
  const [publishedPosts, setPublishedPosts] = useState<PostSummary[]>([])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
  )

  const stackItems = useMemo(() => (Array.isArray(value) ? value : []), [value])
  const stackItemKeys = stackItems.map((item, index) => getItemKey(item, index))

  const { setNodeRef: setStackRef } = useDroppable({ id: 'front-stack' })

  useEffect(() => {
    const controller = new AbortController()

    const fetchPosts = async () => {
      const apiRoute = clientConfig?.routes?.api || '/api'
      const serverURL = clientConfig?.serverURL || ''
      const baseURL = serverURL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000')
      const url = apiRoute.startsWith('http') || apiRoute.startsWith('//')
        ? new URL(`${apiRoute.replace(/\/$/, '')}/posts`)
        : new URL(`${apiRoute.replace(/\/$/, '')}/posts`, baseURL)

      url.searchParams.set('where[_status][equals]', 'published')
      url.searchParams.set('where[workflowStatus][equals]', 'published')
      url.searchParams.set('depth', '1')
      url.searchParams.set('limit', '100')
      url.searchParams.set('pagination', 'false')
      url.searchParams.set('sort', '-publishedAt')
      url.searchParams.set('select[title]', 'true')
      url.searchParams.set('select[displaySize]', 'true')
      url.searchParams.set('select[heroImage]', 'true')

      try {
        const response = await fetch(url.toString(), {
          credentials: 'include',
          signal: controller.signal,
        })

        if (!response.ok) return

        const data = await response.json()

        if (Array.isArray(data?.docs)) {
          setPublishedPosts(data.docs as PostSummary[])
        }
      } catch (error) {
        if ((error as Error)?.name !== 'AbortError') {
          console.error('Failed to load published posts', error)
        }
      }
    }

    fetchPosts()

    return () => controller.abort()
  }, [clientConfig?.routes?.api, clientConfig?.serverURL])

  const postsById = useMemo(() => {
    const map = new Map<string, PostSummary>()

    publishedPosts.forEach((post) => {
      map.set(String(post.id), post)
    })

    stackItems.forEach((item) => {
      if (typeof item?.post === 'object' && item.post && 'id' in item.post) {
        const postId = String(item.post.id)
        map.set(postId, {
          id: postId,
          displaySize: (item.post as PostSummary).displaySize,
          heroImage: (item.post as PostSummary).heroImage,
          title: (item.post as PostSummary).title,
        })
      }
    })

    return map
  }, [publishedPosts, stackItems])

  const addPostToStack = (post: PostSummary) => {
    const postId = String(post.id)
    if (stackItems.some((item) => getPostId(item.post) === postId)) return

    const newItem: FrontEditorItem = {
      id: `stack-${postId}-${Date.now()}`,
      post: postId,
      displaySize: post.displaySize || 'large',
    }

    setValue([...(stackItems || []), newItem])
  }

  const handleSizeChange = (itemKey: string, size: Post['displaySize']) => {
    const updated = stackItems.map((item, index) =>
      getItemKey(item, index) === itemKey ? { ...item, displaySize: size } : item,
    )

    setValue(updated)
  }

  const handleRemove = (itemKey: string) => {
    const updated = stackItems.filter((item, index) => getItemKey(item, index) !== itemKey)
    setValue(updated)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (!over) return

    const activeType = active.data?.current?.type
    const overId = over.id as string

    if (activeType === 'stack') {
      const oldIndex = stackItemKeys.indexOf(active.id as string)
      const newIndex = stackItemKeys.indexOf(overId)

      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        setValue(arrayMove(stackItems, oldIndex, newIndex))
      }
    }

    if (activeType === 'pool' && typeof active.data?.current?.postId === 'string') {
      const postId = active.data.current.postId
      if (stackItems.some((item) => getPostId(item.post) === postId)) return

      const targetIndex = stackItemKeys.indexOf(overId)
      const newItem: FrontEditorItem = {
        id: `stack-${postId}-${Date.now()}`,
        post: postId,
        displaySize: postsById.get(postId)?.displaySize || 'large',
      }

      if (targetIndex >= 0) {
        const next = [...stackItems]
        next.splice(targetIndex, 0, newItem)
        setValue(next)
      } else {
        setValue([...(stackItems || []), newItem])
      }
    }
  }

  const adminRoute = clientConfig?.routes?.admin || '/admin'

  return (
    <div className="front-editor-field">
      {field?.label && <div className="front-editor-field__label">{field.label}</div>}
      {field?.admin?.description && (
        <div className="front-editor-field__description">{field.admin.description}</div>
      )}
      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd} sensors={sensors}>
        <div className="front-editor-field__columns">
          <div className="front-editor-field__column">
            <div className="front-editor-field__column-header">
              <h3>Forside-stakk</h3>
              <p>Sorter rekkefølge og visningsstørrelse.</p>
            </div>
            <div className="front-editor-field__stack" ref={setStackRef}>
              <SortableContext items={stackItemKeys} strategy={verticalListSortingStrategy}>
                {stackItems.length === 0 && (
                  <div className="front-editor-field__empty">Dra inn en publisert sak for å bygge forsiden.</div>
                )}
                {stackItems.map((item, index) => {
                  const itemKey = stackItemKeys[index]
                  const postId = getPostId(item.post)
                  const post = postId ? postsById.get(postId) : undefined

                  return (
                    <StackRow
                      adminRoute={adminRoute}
                      item={item}
                      itemKey={itemKey}
                      key={itemKey}
                      onRemove={handleRemove}
                      onSizeChange={handleSizeChange}
                      post={post}
                    />
                  )
                })}
              </SortableContext>
            </div>
          </div>
          <div className="front-editor-field__column">
            <div className="front-editor-field__column-header">
              <h3>Publiserte saker</h3>
              <p>Alle publiserte artikler kan dras inn i forsiden.</p>
            </div>
            <div className="front-editor-field__pool">
              <SortableContext
                items={publishedPosts.map((post) => `pool-${post.id}`)}
                strategy={verticalListSortingStrategy}
              >
                {publishedPosts.map((post) => (
                  <PublishedCard key={post.id} onAdd={addPostToStack} post={post} />
                ))}
              </SortableContext>
            </div>
          </div>
        </div>
      </DndContext>
    </div>
  )
}

export default FrontEditorField
