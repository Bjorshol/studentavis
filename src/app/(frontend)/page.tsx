import Topbar from '@/components/Topbar'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

export default async function Home() {
  const payload = await getPayload({ config: configPromise })

  const posts = await payload.find({
    collection: 'posts',
    limit: 20,
    sort: '-publishedDate',
  })

  return (
    <>
      <Topbar />
      <main className="mx-auto max-w-4xl px-4">
        <h1 className="sr-only">Studentavisa</h1>

        <section className="space-y-6">
          {posts.docs.map((post) => (
            <article key={post.id}>
              <a href={`/posts/${post.slug}`}>
                <h2 className="text-xl font-semibold">{post.title}</h2>
                {post.excerpt && (
                  <p className="text-gray-600">{post.excerpt}</p>
                )}
              </a>
            </article>
          ))}
        </section>
      </main>
    </>
  )
}
