import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { AdminPageHeader } from '@/components/layout/admin-page-header';
import { AlbumPhotos } from '@/components/layout/album-photos';
import { EntityForm } from '@/components/layout/entity-form';
import { Button } from '@/components/ui/button';
import { getEntity, resolveEntityConfig } from '@/lib/admin/entities';
import { getAdminDictionary } from '@/lib/auth/admin-locale';
import { requirePermission } from '@/lib/auth/session';
import { getEntityRecord } from '@/server/queries/admin-entity';
import { listAlbumPhotos } from '@/server/queries/admin-photos';

export default async function AdminEntityEditPage({
  params,
}: {
  params: Promise<{ entity: string; id: string }>;
}) {
  const { entity, id } = await params;
  const config = getEntity(entity);
  if (!config) notFound();

  await requirePermission('content.manage');
  const d = await getAdminDictionary();

  const record = await getEntityRecord(config, id);
  if (!record) notFound();

  // Albums are the one descriptor-driven module with children. The photographs are read
  // here and rendered under the form rather than behind their own route — an album is
  // its pictures, and a second screen is a second thing to forget.
  const photos = config.key === 'gallery' ? await listAlbumPhotos(record.id) : [];

  return (
    <div className="mx-auto max-w-4xl">
      <Button asChild variant="ghost" size="sm" className="-ms-3">
        <Link href={`/admin/${config.key}`}>
          <ArrowLeft className="rtl:rotate-180" />
          {config.title(d)}
        </Link>
      </Button>

      <AdminPageHeader
        className="mt-4"
        title={config.editLabel(d)}
        description={record.slug ? `/${record.slug}` : undefined}
      />

      <div className="mt-8 flex flex-col gap-6">
        <EntityForm
          config={resolveEntityConfig(config, d)}
          initial={{
            id: record.id,
            slug: record.slug,
            status: record.status,
            sortOrder: record.sortOrder,
            base: record.base,
            translations: record.translations,
          }}
          dictionary={d}
        />

        {config.key === 'gallery' ? (
          <AlbumPhotos
            albumId={record.id}
            albumSlug={record.slug}
            photos={photos}
            dictionary={d}
          />
        ) : null}
      </div>
    </div>
  );
}
