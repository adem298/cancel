/**
 * Service adapters. Each entry describes how to cancel one subscription service.
 *
 * ADAPTERS starts EMPTY on purpose. A service is added here only after its terms of
 * service have been reviewed and the owner has approved automated steps for it.
 *
 * Shape of an adapter:
 * {
 *   id: 'example',                       // unique, lowercase
 *   name: 'Example Service',             // shown in the popup
 *   hosts: ['example.com'],              // the extension only runs steps on these hosts
 *   steps: [
 *     { label: 'Open billing settings', url: 'https://example.com/settings/billing' },
 *     { label: 'Click "Cancel plan"', selector: 'button[data-test="cancel-plan"]' }
 *   ]
 * }
 *
 * Every step runs only after the customer clicks it in the popup.
 */
export const ADAPTERS = [];
