import { AdminPageHeader } from '@/components/layout/admin-page-header';
import { SettingsGroupForm, type SettingsFieldDef } from '@/components/layout/settings-group-form';
import { getAdminDictionary } from '@/lib/auth/admin-locale';
import { requirePermission } from '@/lib/auth/session';
import { createServerSupabase } from '@/lib/supabase/server';

type Group = Record<string, unknown>;

export default async function AdminSettingsPage() {
  await requirePermission('settings.manage');
  const d = await getAdminDictionary();
  const s = d.admin.settings;
  const c = d.admin.common;

  const supabase = await createServerSupabase();
  // `smtp` is intentionally not selected: 0007 revokes the column, and mail credentials
  // belong in environment variables rather than in a table.
  const { data, error } = await supabase
    .from('site_settings')
    .select('branding, contacts, social, seo, analytics, stats')
    .eq('id', 1)
    .maybeSingle();

  if (error) console.warn('[admin:settings]', error.message);

  const row = (data ?? {}) as Record<string, Group | null>;
  const group = (name: string): Group => (row[name] as Group | null) ?? {};

  const labels = {
    save: d.common.save,
    saving: d.admin.registrations.saving,
    saved: s.saved,
    failed: c.saveFailed,
  };

  const contactFields: SettingsFieldDef[] = [
    { name: 'phone', label: d.contact.phone, placeholder: '+998 71 200 00 00' },
    { name: 'email', label: d.contact.email, type: 'email', placeholder: 'info@romansiada.uz' },
    { name: 'address', label: d.contact.address },
    { name: 'workingHours', label: d.contact.workingHours, placeholder: '09:00 – 18:00' },
  ];

  const socialFields: SettingsFieldDef[] = [
    { name: 'instagram', label: 'Instagram', type: 'url', placeholder: 'https://instagram.com/…' },
    { name: 'telegram', label: 'Telegram', type: 'url', placeholder: 'https://t.me/…' },
    { name: 'youtube', label: 'YouTube', type: 'url', placeholder: 'https://youtube.com/@…' },
    { name: 'facebook', label: 'Facebook', type: 'url', placeholder: 'https://facebook.com/…' },
  ];

  const brandingFields: SettingsFieldDef[] = [
    { name: 'siteName', label: d.meta.siteName },
    { name: 'tagline', label: d.meta.tagline },
    { name: 'logoPath', label: s.logo },
    { name: 'faviconPath', label: s.favicon },
  ];

  const seoFields: SettingsFieldDef[] = [
    { name: 'defaultTitle', label: c.seoTitle },
    { name: 'defaultDescription', label: c.seoDescription },
  ];

  const analyticsFields: SettingsFieldDef[] = [
    { name: 'googleAnalyticsId', label: 'Google Analytics ID', placeholder: 'G-XXXXXXXXXX' },
    { name: 'yandexMetricaId', label: 'Yandex Metrica ID', placeholder: '12345678' },
  ];

  const statsFields: SettingsFieldDef[] = [
    { name: 'years', label: d.home.stats.years, type: 'number' },
    { name: 'participants', label: d.home.stats.participants, type: 'number' },
    { name: 'countries', label: d.home.stats.countries, type: 'number' },
    { name: 'goal', label: d.home.stats.goal, type: 'number' },
    {
      name: 'festivalDate',
      label: d.home.stats.festivalDate,
      type: 'datetime-local',
    },
  ];

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <AdminPageHeader title={s.title} />

      <SettingsGroupForm
        group="branding"
        title={s.branding}
        fields={brandingFields}
        initial={group('branding')}
        labels={labels}
      />
      <SettingsGroupForm
        group="contacts"
        title={s.contacts}
        fields={contactFields}
        initial={group('contacts')}
        labels={labels}
      />
      <SettingsGroupForm
        group="social"
        title={s.social}
        fields={socialFields}
        initial={group('social')}
        labels={labels}
      />
      <SettingsGroupForm
        group="stats"
        title={s.stats}
        fields={statsFields}
        initial={group('stats')}
        labels={labels}
      />
      <SettingsGroupForm
        group="seo"
        title={s.seo}
        fields={seoFields}
        initial={group('seo')}
        labels={labels}
      />
      <SettingsGroupForm
        group="analytics"
        title={s.analytics}
        fields={analyticsFields}
        initial={group('analytics')}
        labels={labels}
      />
    </div>
  );
}
