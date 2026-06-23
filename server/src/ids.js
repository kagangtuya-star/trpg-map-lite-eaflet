import { randomBytes, randomUUID } from 'node:crypto';

export function createId() {
  return randomUUID();
}

export function createCampaignTokens() {
  return {
    edit_token: `edit_${randomBytes(12).toString('hex')}`,
    view_token: `view_${randomBytes(12).toString('hex')}`
  };
}

