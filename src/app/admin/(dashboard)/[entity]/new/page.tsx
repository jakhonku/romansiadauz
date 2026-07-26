import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { AdminPageHeader } from '@/components/layout/admin-page-header';
import { EntityForm } from '@/components/layout/entity-form';
import { Button } from '@/components/ui/button';
import { getEntity, resolveEntityConfig } from '@/lib/admin/entities';
import { getAdminDictionary } from '@/lib/auth/admin-locale';
import { requirePermission } from '@/lib/auth/session';
import { emptyEntityRecord } from '@/server/queries/admin-entity';

export default async function AdminEntityNewPage({
  params,
}: {
  params: Promise<{ entity: string }>;
}) {
  const { entity } = await params;
  const config = getEntity(entity);
  if (!config) notFound();

  await requirePermission('content.manage');
  const d = await getAdminDictionary();

  const blank = emptyEntityRecord(config);

  return (
    <div className="mx-auto max-w-4xl">
      <Button asChild variant="ghost" size="sm" className="-ms-3">
        <Link href={`/admin/${config.key}`}>
          <ArrowLeft className="rtl:rotate-180" />
          {config.title(d)}
        </Link>
      </Button>

      <AdminPageHeader className="mt-4" title={config.newLabel(d)} />

      <div className="mt-8">
        <EntityForm
          config={resolveEntityConfig(config, d)}
          initial={{
            id: '',
            slug: blank.slug,
            status: blank.status,
            sortOrder: blank.sortOrder,
            base: blank.base,
            translations: blank.translations,
          }}
          dictionary={d}
        />
      </div>
    </div>
  );
}
