import { app } from '@azure/functions';

// Import all function handlers
import './functions/health';
import './functions/authMe';
import './functions/createCheckoutSession';
import './functions/stripeWebhook';
import './functions/subscriptionStatus';

// Stripe billing portal endpoint (JavaScript - will be migrated in future phase)
import './functions.js';

// This file serves as the entry point for all functions
// Each function registers itself with the app object

// Deployed to dedicated Azure Function App for better auth control
