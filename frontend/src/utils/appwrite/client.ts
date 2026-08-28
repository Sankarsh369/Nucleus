import { Client, Account, TablesDB } from 'appwrite';

// NEXT_PUBLIC_* values are safe to expose to the browser -- they identify
// the Appwrite project, they are not secrets. Actual data access is
// governed by Appwrite's per-row permissions (see setup_appwrite.py) plus
// the signed-in user's own session, not by anything secret on the client.
export const APPWRITE_DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'nucleus';
export const TABLE_USER_CHAT_HISTORY = 'user_chat_history';

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '');

export const account = new Account(client);
export const tablesDB = new TablesDB(client);
