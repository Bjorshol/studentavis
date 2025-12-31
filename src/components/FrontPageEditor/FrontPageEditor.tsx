/* eslint-disable @next/next/no-img-element */
'use client'

import React, { useEffect, useMemo, useState } from 'react'

import { Button, FieldError, FieldLabel, useConfig, useField, useTranslation } from '@payloadcms/ui'
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
import { SortableContext, arrayMove, rectSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

import './frontPageEditor.scss'

const STACK_CONTAINER_ID = 'front-page-stack'
const MAX_ITEMS = 50

type PostRow = {
  id: string
  title: string
  image?: string | null
  publishedAt?: string | null
  missing?: boolean
}

type PostWithImages = {
  heroImage?: unknown
  meta?: { image?: unknown }
}

type FieldProps = {
  path?: string
  label?: string
  required?: boolean
}

export const FrontPageEditorField: React.FC<FieldProps> = ({ label, path, required }) => {
  const { value = [], setValue, showError, errorMessage } = useField<string[]>({ path, initialValue: [] })
  const { config } = useConfig()
  const { t } = useTranslation()
  const [posts, setPosts] = useState<PostRow[]>([])
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const stackIds = useMemo(() => (Array.isArray(value) ? value.map(String) : []), [value])

  const stackPosts = useMemo(() => {
    return stackIds.map((id) => {
      return (
        posts.find((post) => post.id === id) || {
          id,
          title: 'Sak ikke publisert',
          missing: true,
        }
      )
    })
  }, [posts, stackIds])

  const poolPosts = useMemo(() => posts.filter((post) => !stackIds.includes(post.id)), [posts, stackIds])

  useEffect(() => {
    const controller = new AbortController()

    const loadPosts = async () => {
      setLoading(true)
      setFetchError(null)

      try {
        const baseURL = config.serverURL || ''
        const searchParams = new URLSearchParams({
          limit: '200',
          depth: '1',
          sort: '-publishedAt',
          'where[_status][equals]': 'published',
          'where[workflowStatus][equals]': 'published',
        })

        const response = await fetch(`${baseURL}/api/posts?${searchParams.toString()}`, {
          credentials: 'include',
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error(`Kunne ikke hente publiserte saker (${response.status})`)
        }

        const payload = await response.json()
        const docs = Array.isArray(payload?.docs) ? payload.docs : []

        const parsedPosts: PostRow[] = docs.map((doc) => ({
          id: String(doc.id),
          title: doc.title || 'Uten tittel',
          image: extractImage(doc),
          publishedAt: doc.publishedAt || doc.updatedAt || null,
        }))

        setPosts(parsedPosts)
      } catch (error) {
        if (controller.signal.aborted) return

        const message = error instanceof Error ? error.message : t('general:unknownError')
        setFetchError(message)
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    void loadPosts()

    return () => controller.abort()
  }, [config.serverURL, t])

  const addToStack = (postId: string, index?: number) => {
    if (stackIds.includes(postId) || stackIds.length >= MAX_ITEMS) return

    const next = [...stackIds]
    const targetIndex = typeof index === 'number' && index >= 0 ? Math.min(index, next.length) : next.length

    next.splice(targetIndex, 0, postId)
    setValue(next)
  }

  const removeFromStack = (postId: string) => {
    const next = stackIds.filter((id) => id !== postId)
    setValue(next)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over) return

    const activeId = String(active.id)
    const overId = String(over.id)

    const activeInStack = stackIds.includes(activeId)
    const overInStack = stackIds.includes(overId)

    if (activeInStack && overInStack && activeId !== overId) {
      const oldIndex = stackIds.indexOf(activeId)
      const newIndex = stackIds.indexOf(overId)
      setValue(arrayMove(stackIds, oldIndex, newIndex))
      return
    }

    if (!activeInStack && (overInStack || overId === STACK_CONTAINER_ID)) {
      const insertIndex = overInStack ? stackIds.indexOf(overId) : stackIds.length
      addToStack(activeId, insertIndex)
    }
  }

  return (
    <div className="field-type front-editor">
      <FieldLabel label={label} path={path} required={required} />

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="front-editor__columns">
          <FrontStack
            items={stackPosts}
            isFull={stackIds.length >= MAX_ITEMS}
            loading={loading}
            onRemove={removeFromStack}
          />
          <PublishedPool
            items={poolPosts}
            loading={loading}
            maxReached={stackIds.length >= MAX_ITEMS}
            onAdd={addToStack}
          />
        </div>
      </DndContext>

      <p className="front-editor__note">Maks {MAX_ITEMS} saker vises på forsiden.</p>
      {fetchError && <div className="front-editor__error">{fetchError}</div>}
      {showError && errorMessage && <FieldError message={errorMessage} showError />}
    </div>
  )
}

const FrontStack: React.FC<{
  items: PostRow[]
  isFull: boolean
  loading: boolean
  onRemove: (postId: string) => void
}> = ({ items, isFull, loading, onRemove }) => {
  const { setNodeRef, isOver } = useDroppable({ id: STACK_CONTAINER_ID })

  return (
    <div className="front-editor__panel">
      <div className="front-editor__panel-header">
        <div>
          Forside-rekkefølge
          <div className="front-editor__panel-subtitle">Dra kort for å endre rekkefølge</div>
        </div>
        {isFull && <span className="front-editor__pill">Fullt</span>}
      </div>

      <div className={`front-editor__list ${isOver ? 'is-over' : ''}`} ref={setNodeRef}>
        {items.length === 0 ? (
          <div className="front-editor__empty">Dra publiserte saker hit for å styre forsiden.</div>
        ) : (
          <SortableContext items={items.map((item) => item.id)} strategy={rectSortingStrategy}>
            {items.map((item) => (
              <SortableStackCard key={item.id} post={item} onRemove={onRemove} />
            ))}
          </SortableContext>
        )}
      </div>
      {loading && <div className="front-editor__note">Laster publiserte saker…</div>}
    </div>
  )
}

const PublishedPool: React.FC<{
  items: PostRow[]
  loading: boolean
  maxReached: boolean
  onAdd: (id: string) => void
}> = ({ items, loading, maxReached, onAdd }) => {
  return (
    <div className="front-editor__panel">
      <div className="front-editor__panel-header">
        <div>
          Publiserte saker
          <div className="front-editor__panel-subtitle">Dra til venstre eller bruk «Legg til»</div>
        </div>
      </div>
      <div className="front-editor__list">
        {loading ? (
          <div className="front-editor__note">Laster publiserte saker…</div>
        ) : items.length === 0 ? (
          <div className="front-editor__empty">Ingen flere publiserte saker å vise.</div>
        ) : (
          items.map((item) => (
            <DraggablePoolCard key={item.id} post={item} disabled={maxReached} onAdd={onAdd} />
          ))
        )}
      </div>
    </div>
  )
}

const SortableStackCard: React.FC<{ post: PostRow; onRemove: (postId: string) => void }> = ({ post, onRemove }) => {
  const { attributes, listeners, setActivatorNodeRef, setNodeRef, transform, transition, isDragging } = useSortable({
    id: post.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div className={`front-editor__card ${isDragging ? 'front-editor__card--dragging' : ''}`} ref={setNodeRef} style={style}>
      <button
        aria-label="Endre rekkefølge"
        className="front-editor__drag-handle"
        ref={setActivatorNodeRef}
        type="button"
        {...attributes}
        {...listeners}
      >
        ↕
      </button>

      <PostPreview post={post} />

      <div className="front-editor__actions">
        <Button buttonStyle="secondary" size="small" onClick={() => onRemove(post.id)} type="button">
          Fjern
        </Button>
      </div>
    </div>
  )
}

const DraggablePoolCard: React.FC<{ post: PostRow; disabled: boolean; onAdd: (postId: string) => void }> = ({
  post,
  disabled,
  onAdd,
}) => {
  const { attributes, listeners, setActivatorNodeRef, setNodeRef, transform, transition, isDragging } = useDraggable({
    id: post.id,
    disabled,
  })

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  }

  return (
    <div className={`front-editor__card ${isDragging ? 'front-editor__card--dragging' : ''}`} ref={setNodeRef} style={style}>
      <button
        aria-label="Dra til forsiden"
        className="front-editor__drag-handle"
        disabled={disabled}
        ref={setActivatorNodeRef}
        type="button"
        {...attributes}
        {...listeners}
      >
        ↔
      </button>

      <PostPreview post={post} />

      <div className="front-editor__actions">
        <Button buttonStyle="secondary" disabled={disabled} onClick={() => onAdd(post.id)} size="small" type="button">
          Legg til
        </Button>
      </div>
    </div>
  )
}

const PostPreview: React.FC<{ post: PostRow }> = ({ post }) => {
  const { title, image, publishedAt, missing } = post
  const date = publishedAt ? new Date(publishedAt).toLocaleDateString('nb-NO') : null

  return (
    <div className="front-editor__card-content">
      <div className={`front-editor__thumb ${image ? '' : 'placeholder'}`}>
        {image ? <img alt={title} src={image} /> : <span>{missing ? 'Ikke publisert' : 'Ingen bilde'}</span>}
      </div>

      <div className="front-editor__text">
        <p className="front-editor__title">{title}</p>
        {date && <span className="front-editor__meta">Publisert {date}</span>}
        {missing && <span className="front-editor__meta">Saken er ikke publisert</span>}
      </div>
    </div>
  )
}

const extractImage = (doc: PostWithImages): string | null => {
  const urlFrom = (value: unknown): string | null => {
    if (value && typeof value === 'object' && 'url' in value) {
      const file = value as { url?: string | null }
      return file.url || null
    }

    return null
  }

  return urlFrom(doc.heroImage) || urlFrom(doc.meta?.image) || null
}

export default FrontPageEditorField
