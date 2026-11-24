import { getTableColumns } from 'drizzle-orm/utils';
import { describe, expect, it } from 'vitest';
import { session } from '../../api/src/db/schema';

describe('Better Auth session schema', () => {
  it('exposes nullable IP address and user agent text columns', () => {
    const columns = getTableColumns(session);

    expect(columns.ipAddress).toMatchObject({
      name: 'ip_address',
      notNull: false,
    });
    expect(columns.ipAddress?.getSQLType()).toBe('text');
    expect(columns.userAgent).toMatchObject({
      name: 'user_agent',
      notNull: false,
    });
    expect(columns.userAgent?.getSQLType()).toBe('text');
  });
});
