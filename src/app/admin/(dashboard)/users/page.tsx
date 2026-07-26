import { UserRound } from 'lucide-react';

import { EmptyState } from '@/components/common/empty-state';
import { AdminPageHeader } from '@/components/layout/admin-page-header';
import { UserInvite } from '@/components/layout/user-invite';
import { UserRowControls } from '@/components/layout/user-row-controls';
import { Badge } from '@/components/ui/badge';
import { Table, TableScroll, Tbody, Td, Th, Thead, Tr } from '@/components/ui/table';
import { getAdminDictionary, getAdminLocale } from '@/lib/auth/admin-locale';
import { requirePermission } from '@/lib/auth/session';
import { formatDateTime } from '@/lib/i18n/format';
import { createServerSupabase } from '@/lib/supabase/server';
import type { AppRole } from '@/types/database.types';

export default async function AdminUsersPage() {
  const session = await requirePermission('users.manage');
  const [d, locale] = await Promise.all([getAdminDictionary(), getAdminLocale()]);
  const u = d.admin.users;

  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, is_active, last_seen_at, created_at')
    .order('created_at', { ascending: true });

  if (error) console.warn('[admin:users]', error.message);
  const users = data ?? [];

  const roleLabels: Record<AppRole, string> = {
    admin: u.roleAdmin,
    editor: u.roleEditor,
    moderator: u.roleModerator,
    viewer: u.roleViewer,
  };

  return (
    <div className="mx-auto max-w-5xl">
      <AdminPageHeader title={u.title} count={users.length} />

      <div className="mt-7">
        <UserInvite
          roles={roleLabels}
          labels={{
            title: u.invite,
            email: u.inviteEmail,
            name: u.inviteName,
            role: u.role,
            submit: u.inviteSubmit,
            sending: d.admin.registrations.saving,
            sent: u.inviteSent,
            failed: u.inviteFailed,
          }}
        />
      </div>

      {users.length ? (
        <TableScroll className="mt-6" label={u.title}>
          <Table>
            <Thead>
              <tr>
                <Th>{u.inviteName}</Th>
                <Th>{u.role}</Th>
                <Th>{u.lastSignIn}</Th>
              </tr>
            </Thead>
            <Tbody>
              {users.map((user) => (
                <Tr key={user.id}>
                  <Td>
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{user.full_name}</span>
                      {!user.is_active ? <Badge variant="muted">{u.inactive}</Badge> : null}
                      {user.id === session.userId ? (
                        <Badge variant="outline">{session.email}</Badge>
                      ) : null}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">{user.email}</span>
                  </Td>
                  <Td>
                    <UserRowControls
                      userId={user.id}
                      role={user.role}
                      isActive={user.is_active}
                      isSelf={user.id === session.userId}
                      labels={{
                        roles: roleLabels,
                        active: u.active,
                        inactive: u.inactive,
                        lastAdmin: u.lastAdmin,
                        selfChange: u.selfChange,
                        error: d.admin.common.saveFailed,
                      }}
                    />
                  </Td>
                  <Td className="whitespace-nowrap text-xs text-muted-foreground">
                    {user.last_seen_at ? formatDateTime(user.last_seen_at, locale) : '—'}
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </TableScroll>
      ) : (
        <EmptyState className="mt-6" message={u.empty} icon={UserRound} />
      )}
    </div>
  );
}
