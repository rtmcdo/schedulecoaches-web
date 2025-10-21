import { app } from '@azure/functions';

// Import all function handlers
import './functions/health';

// Stripe endpoints (JavaScript - will be migrated to TypeScript in Phase 4 & 5)
import './functions.js';

// This file serves as the entry point for all functions
// Each function registers itself with the app object
