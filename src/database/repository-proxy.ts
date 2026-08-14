import type { SettingsService } from '@/database/settings.service';
import type { DbProvider } from '@/database/types';

const NEST_HOOK_PROPS = new Set([
  'onModuleInit',
  'onModuleDestroy',
  'onApplicationBootstrap',
  'onApplicationShutdown',
  'beforeApplicationShutdown',
  'constructor',
]);

/** Runtime proxy — each call goes to the currently active DB adapter. */
export function createSwitchingRepository<T extends object>(
  settings: SettingsService,
  adapters: Partial<Record<DbProvider, T>>,
): T {
  return new Proxy({} as T, {
    get(_target, prop) {
      // Nest DI / Promise introspection — never throw here
      if (prop === 'then' || typeof prop === 'symbol') return undefined;
      if (typeof prop === 'string' && NEST_HOOK_PROPS.has(prop)) {
        return undefined;
      }

      const provider = settings.getProvider();
      const impl = adapters[provider];
      if (!impl) {
        const available = Object.keys(adapters).join(', ') || 'none';
        throw new Error(
          `Database provider "${provider}" is not connected. Available: ${available}. Add the URI in .env (no need to change DB_PROVIDER).`,
        );
      }

      const value = Reflect.get(impl as object, prop, impl);
      return typeof value === 'function'
        ? (value as (...args: unknown[]) => unknown).bind(impl)
        : value;
    },
  });
}
