'use client'
/* eslint-disable @next/next/no-img-element */

import type { ArrayFieldClientComponent } from 'payload'
import { useEffect, useMemo, useState } from 'react'

import {
  DndContext,
  PointerSensor,
  closestCenter,
  useDroppable,
  useDraggable,
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

type PostSummary = Pick<Post, 'id' | 'title' | 'displaySize' | 'workflowStatus'> & {
  _status?: Post['_status']
  heroImage?: Post['heroImage']
}

const MAX_FRONT_PAGE_ITEMS = 50

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
  sortableId,
  post,
  adminRoute,
  onRemove,
  onSizeChange,
  disabled,
  status,
}: {
  adminRoute: string
  disabled: boolean
  item: FrontEditorItem
  itemKey: string
  sortableId: string
  onRemove: (key: string) => void
  onSizeChange: (key: string, size: Post['displaySize']) => void
  post?: PostSummary | null
  status: 'unpublished' | 'missing' | null
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: sortableId,
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
        {status === 'unpublished' && (
          <p className="front-editor-field__status front-editor-field__status--warning">
            Denne saken er ikke publisert og vil ikke vises på forsiden.
          </p>
        )}
        {status === 'missing' && (
          <p className="front-editor-field__status front-editor-field__status--error">
            Klarte ikke å finne den valgte saken. Fjern den eller velg en ny.
          </p>
        )}
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
  disabled,
  isPinned,
  onPin,
  post,
}: {
  disabled: boolean
  isPinned: boolean
  onPin: (postId: string, position?: 'start' | 'end') => void
  post: PostSummary
}) => {
  const postId = String(post.id)
  const heroImage = getHeroImage(post)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useDraggable({
    id: `post:${postId}`,
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
      <div className="front-editor-field__pool-actions">
        <button
          className="front-editor-field__pool-button"
          disabled={disabled || isPinned}
          onClick={(event) => {
            event.preventDefault()
            onPin(postId, 'start')
          }}
          type="button"
        >
          {isPinned ? 'Allerede øverst' : 'Pinn til toppen'}
        </button>
        <button
          className="front-editor-field__pool-button"
          disabled={disabled || isPinned}
          onClick={(event) => {
            event.preventDefault()
            onPin(postId, 'end')
          }}
          type="button"
        >
          Sett inn her
        </button>
      </div>
    </div>
  )
}

const FrontEditorField: ArrayFieldClientComponent = (props) => {
  const { path, field } = props
  const { value, setValue } = useField<FrontEditor['items']>({ path })
  const { config: clientConfig } = useConfig()
  const [publishedPosts, setPublishedPosts] = useState<PostSummary[]>([])
  const [search, setSearch] = useState('')

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
  )

  const stackItems = useMemo(() => (Array.isArray(value) ? value : []), [value])
  const stackItemKeys = stackItems.map((item, index) => getItemKey(item, index))
  const stackSortableIds = stackItemKeys.map((key) => `stack:${key}`)

  const isPublishedPost = (post?: PostSummary | null) => {
    if (!post) return false

    return post.workflowStatus === 'published' || post._status === 'published'
  }

  const { isOver: isOverStack, setNodeRef: setStackRef } = useDroppable({ id: 'front-stack' })

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
      url.searchParams.set('select[_status]', 'true')
      url.searchParams.set('select[workflowStatus]', 'true')

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
          _status: (item.post as PostSummary)._status,
          workflowStatus: (item.post as PostSummary).workflowStatus,
        })
      }
    })

    return map
  }, [publishedPosts, stackItems])

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
      const oldIndex = stackSortableIds.indexOf(active.id as string)
      const newIndex = stackSortableIds.indexOf(overId)

      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        setValue(arrayMove(stackItems, oldIndex, newIndex))
      }
    }

    if (activeType === 'pool' && typeof active.data?.current?.postId === 'string') {
      const postId = active.data.current.postId
      if (stackItems.some((item) => getPostId(item.post) === postId)) return

      const targetIndex = stackSortableIds.indexOf(overId)
      const insertIndex = overId === 'front-stack' || targetIndex === -1 ? stackItems.length : targetIndex
      const newItem: FrontEditorItem = {
        id: `stack-${postId}-${Date.now()}`,
        post: postId,
        displaySize: postsById.get(postId)?.displaySize || 'large',
      }

      const next = [...stackItems]
      next.splice(insertIndex, 0, newItem)
      setValue(next)
    }
  }

  const disabled = Boolean(field?.admin?.readOnly)
  const adminRoute = clientConfig?.routes?.admin || '/admin'

  const pinnedIds = useMemo(() => {
    const ids = new Set<string>()

    stackItems.forEach((item) => {
      const postId = getPostId(item.post)
      if (postId) ids.add(postId)
    })

    return ids
  }, [stackItems])

  const pinnedPublishedCount = useMemo(() => {
    return stackItems.reduce((total, item) => {
      const postId = getPostId(item.post)
      if (!postId) return total

      const post = postsById.get(postId)
      return isPublishedPost(post) ? total + 1 : total
    }, 0)
  }, [postsById, stackItems])

  const automaticQueue = useMemo(() => {
    const remainingSlots = Math.max(0, MAX_FRONT_PAGE_ITEMS - pinnedPublishedCount)

    return publishedPosts
      .filter((post) => isPublishedPost(post) && !pinnedIds.has(String(post.id)))
      .slice(0, remainingSlots)
  }, [pinnedIds, pinnedPublishedCount, publishedPosts])

  const totalFrontPageCount = useMemo(() => {
    return Math.min(MAX_FRONT_PAGE_ITEMS, pinnedPublishedCount + automaticQueue.length)
  }, [automaticQueue.length, pinnedPublishedCount])

  const filteredAutomatic = useMemo(() => {
    if (!search.trim()) return automaticQueue

    return automaticQueue.filter((post) =>
      (post.title || '').toLowerCase().includes(search.trim().toLowerCase()),
    )
  }, [automaticQueue, search])

  const handleReset = () => {
    setValue([])
  }

  const handlePin = (postId: string, position: 'start' | 'end' = 'end') => {
    if (!postId) return
    if (stackItems.some((item) => getPostId(item.post) === postId)) return

    const newItem: FrontEditorItem = {
      id: `stack-${postId}-${Date.now()}`,
      post: postId,
      displaySize: postsById.get(postId)?.displaySize || 'large',
    }

    const next = position === 'start' ? [newItem, ...stackItems] : [...stackItems, newItem]
    setValue(next)
  }

  const handleReset = () => {
    setValue([])
  }

  return (
    <div className="front-editor-field">
      {field?.label && <div className="front-editor-field__label">{field.label}</div>}
      {field?.admin?.description && (
        <div className="front-editor-field__description">{field.admin.description}</div>
      )}
      <div className="front-editor-field__logic">
        <div>
          <p className="front-editor-field__logic-text">
            Pinnede saker vises øverst i valgt rekkefølge. Resten av forsiden fylles automatisk med de nyeste
            publiserte sakene (inntil {MAX_FRONT_PAGE_ITEMS} saker totalt).
          </p>
          <p className="front-editor-field__logic-text">
            Du trenger ikke kurere alle {MAX_FRONT_PAGE_ITEMS} – kun det som skal være øverst.
          </p>
          <p className="front-editor-field__logic-text">
            Bruk dra-og-slipp eller knappene for å pinne/avpinne. «Automatisk»-listen under matcher rekkefølgen på forsiden
            (nyeste publisert øverst).
          </p>
        </div>
        <div className="front-editor-field__stats">
          <div className="front-editor-field__stat">📌 Pinnet: {stackItems.length}</div>
          <div className="front-editor-field__stat">📰 På forsiden: {totalFrontPageCount}</div>
          <button
            className="front-editor-field__reset"
            disabled={disabled || stackItems.length === 0}
            onClick={handleReset}
            type="button"
          >
            Nullstill til automatisk
          </button>
        </div>
      </div>
      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd} sensors={sensors}>
        <div className="front-editor-field__columns">
          <div className="front-editor-field__column">
            <div className="front-editor-field__column-header">
              <h3>Pinnet øverst</h3>
              <p>Rekkefølgen her bestemmer toppen av forsiden.</p>
            </div>
            <div
              className={`front-editor-field__stack${isOverStack ? ' is-over' : ''}`}
              ref={setStackRef}
            >
              <SortableContext items={stackSortableIds} strategy={verticalListSortingStrategy}>
                {stackItems.length === 0 && (
                  <div className="front-editor-field__empty">
                    Dra inn eller bruk «Pinn til toppen» for å bygge forsiden.
                  </div>
                )}
                {stackItems.map((item, index) => {
                  const itemKey = stackItemKeys[index]
                  const sortableId = stackSortableIds[index]
                  const postId = getPostId(item.post)
                  const post = postId ? postsById.get(postId) : undefined

                  const status: 'unpublished' | 'missing' | null = post
                    ? isPublishedPost(post)
                      ? null
                      : 'unpublished'
                    : 'missing'

                  return (
                    <StackRow
                      adminRoute={adminRoute}
                      disabled={disabled}
                      item={item}
                      itemKey={itemKey}
                      key={sortableId}
                      onRemove={handleRemove}
                      onSizeChange={handleSizeChange}
                      post={post}
                      status={status}
                      sortableId={sortableId}
                    />
                  )
                })}
              </SortableContext>
            </div>
          </div>
          <div className="front-editor-field__column">
            <div className="front-editor-field__column-header">
              <h3>Automatisk (nyeste først)</h3>
              <p>Rekker som ikke er pinnet, fyller forsiden automatisk i denne rekkefølgen.</p>
              <label className="front-editor-field__search">
                <span className="sr-only">Søk etter tittel</span>
                <input
                  aria-label="Søk etter publisert artikkel"
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Søk etter tittel"
                  type="search"
                  value={search}
                />
              </label>
            </div>
            <div className="front-editor-field__pool">
              {filteredAutomatic.length === 0 && (
                <div className="front-editor-field__empty">Ingen publiserte artikler funnet.</div>
              )}
              {filteredAutomatic.map((post) => (
                <PublishedCard
                  disabled={disabled}
                  isPinned={pinnedIds.has(String(post.id))}
                  key={post.id}
                  onPin={handlePin}
                  post={post}
                />
              ))}
            </div>
          </div>
        </div>
      </DndContext>
    </div>
  )
}

export default FrontEditorField
