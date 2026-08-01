import * as migration_20260731_132628_init from './20260731_132628_init';
import * as migration_20260801_052203_users_auth from './20260801_052203_users_auth';
import * as migration_20260801_120934_avatar_upload from './20260801_120934_avatar_upload';

export const migrations = [
  {
    up: migration_20260731_132628_init.up,
    down: migration_20260731_132628_init.down,
    name: '20260731_132628_init',
  },
  {
    up: migration_20260801_052203_users_auth.up,
    down: migration_20260801_052203_users_auth.down,
    name: '20260801_052203_users_auth',
  },
  {
    up: migration_20260801_120934_avatar_upload.up,
    down: migration_20260801_120934_avatar_upload.down,
    name: '20260801_120934_avatar_upload'
  },
];
