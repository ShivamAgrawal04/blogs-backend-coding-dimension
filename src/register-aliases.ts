import moduleAlias = require('module-alias');
import { join } from 'path';

/** Maps `@/*` → compiled `dist/*` at runtime (Nest watch + production). */
moduleAlias.addAlias('@', join(__dirname));
