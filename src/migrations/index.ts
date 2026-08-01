import * as migration_20260731_132628_init from './20260731_132628_init';

export const migrations = [
  {
    up: migration_20260731_132628_init.up,
    down: migration_20260731_132628_init.down,
    name: '20260731_132628_init'
  },
];
