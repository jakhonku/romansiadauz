import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

import { AdminPageHeader } from '@/components/layout/admin-page-header';
import { NewsForm, type NewsFormValue } from '@/components/layout/news-form';
import { Button } from '@/components/ui/button';
import { getAdminDictionary, getAdminLocale } from '@/lib/auth/admin-locale';
import { requirePermission } from '@/lib/auth/session';
import { listNewsCategoryOptions } from '@/server/queries/admin-news';

const BLANK = { title: '', excerpt: '', body: '', seoTitle: '', seoDescription: '' };

export default async function AdminNewArticlePage() {
  await requirePermission('content.manage');

  const [d, locale] = await Promise.all([getAdminDictionary(), getAdminLocale()]);
  const categories = await listNewsCategoryOptions(locale);

  const initial: NewsFormValue = {
    slug: '',
    categoryId: '',
    coverPath: '',
    status: 'draft',
    publishedAt: '',
    isFeatured: false,
    translations: { uz: { ...BLANK }, ru: { ...BLANK }, en: { ...BLANK } },
  };

  return (
    <div className="mx-auto max-w-4xl">
      <Button asChild variant="ghost" size="sm" className="-ms-3">
        <Link href="/admin/news">
          <ArrowLeft className="rtl:rotate-180" />
          {d.admin.news.title}
        </Link>
      </Button>

      <AdminPageHeader className="mt-4" title={d.admin.news.newArticle} />

      <div className="mt-8">
        <NewsForm initial={initial} categories={categories} dictionary={d} />
      </div>
    </div>
  );
}
