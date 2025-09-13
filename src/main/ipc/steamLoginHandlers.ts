/**
 * Steam Login IPC Handlers for Schedule I Developer Environment Utility
 * 
 * Provides IPC handlers for Steam login and credential management including
 * credential storage, retrieval, and validation. Handles secure communication
 * between the main process and renderer process for Steam authentication.
 * 
 * Key features:
 * - Secure credential storage and retrieval
 * - Steam login validation
 * - Credential encryption and decryption
 * - Integration with SteamCMD operations
 * 
 * @author Schedule I Developer Environment Utility Team
 * @version 2.0.3
 */

import { ipcMain } from 'electron';
import { CredentialService, SteamCredentials } from '../services/CredentialService';

const credentialService = new CredentialService();

/**
 * Stores Steam credentials securely
 * 
 * @param event IPC event object
 * @param credentials Steam credentials to store
 * @returns Promise<{success: boolean, error?: string}> Storage result
 */
async function handleStoreCredentials(event: any, credentials: SteamCredentials & { mode?: 'steam-password'|'master-password'; masterPassword?: string }): Promise<{success: boolean, error?: string}> {
  try {
    console.log('Storing Steam credentials for user:', credentials.username);
    
    if (!credentials.username || !credentials.password) {
      return { success: false, error: 'Username and password are required' };
    }

    // Add timestamps
    const now = new Date().toISOString();
    const credentialsWithTimestamps: SteamCredentials & { mode?: 'steam-password'|'master-password'; masterPassword?: string } = {
      ...credentials,
      encryptedAt: now,
      lastUsed: now
    };

    const success = await credentialService.storeCredentials(credentialsWithTimestamps);
    
    if (success) {
      console.log('Steam credentials stored successfully');
      return { success: true };
    } else {
      return { success: false, error: 'Failed to store credentials' };
    }
  } catch (error) {
    console.error('Error storing Steam credentials:', error);
    return { 
      success: false, 
      error: `Storage error: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
}

/**
 * Retrieves stored Steam credentials
 * 
 * @param event IPC event object
 * @param password Password for decryption
 * @returns Promise<{success: boolean, credentials?: SteamCredentials, error?: string}> Retrieval result
 */
async function handleGetCredentials(event: any, password: string): Promise<{success: boolean, credentials?: SteamCredentials, error?: string}> {
  try {
    console.log('Retrieving stored Steam credentials');
    
    if (!password) {
      return { success: false, error: 'Password is required for decryption' };
    }

    const credentials = await credentialService.getCredentials(password);
    
    if (credentials) {
      console.log('Steam credentials retrieved successfully');
      return { success: true, credentials };
    } else {
      return { success: false, error: 'Invalid password or no credentials found' };
    }
  } catch (error) {
    console.error('Error retrieving Steam credentials:', error);
    return { 
      success: false, 
      error: `Retrieval error: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
}

/**
 * Checks if stored credentials exist
 * 
 * @param event IPC event object
 * @returns Promise<{exists: boolean, info?: {encryptedAt: string, lastUsed: string}}> Check result
 */
async function handleHasStoredCredentials(event: any): Promise<{exists: boolean, info?: {encryptedAt: string, lastUsed: string, mode?: 'steam-password'|'master-password'}}> {
  try {
    console.log('Checking for stored Steam credentials');
    
    const info = await credentialService.getCredentialInfo();
    
    if (info.exists) {
      console.log('Stored credentials found');
      return { exists: true, info: { encryptedAt: info.encryptedAt || '', lastUsed: info.lastUsed || '', mode: info.mode } };
    } else {
      console.log('No stored credentials found');
      return { exists: false };
    }
  } catch (error) {
    console.error('Error checking for stored credentials:', error);
    return { exists: false };
  }
}

/**
 * Validates stored credentials
 * 
 * @param event IPC event object
 * @param password Password for validation
 * @returns Promise<{valid: boolean, error?: string}> Validation result
 */
async function handleValidateCredentials(event: any, password: string): Promise<{valid: boolean, error?: string}> {
  try {
    console.log('Validating stored Steam credentials');
    
    if (!password) {
      return { valid: false, error: 'Password is required for validation' };
    }

    const isValid = await credentialService.validateStoredCredentials(password);
    
    if (isValid) {
      console.log('Stored credentials are valid');
      return { valid: true };
    } else {
      console.log('Stored credentials are invalid');
      return { valid: false, error: 'Invalid password or corrupted credentials' };
    }
  } catch (error) {
    console.error('Error validating stored credentials:', error);
    return { 
      valid: false, 
      error: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
}

/**
 * Clears stored credentials
 * 
 * @param event IPC event object
 * @returns Promise<{success: boolean, error?: string}> Clear result
 */
async function handleClearCredentials(event: any): Promise<{success: boolean, error?: string}> {
  try {
    console.log('Clearing stored Steam credentials');
    
    const success = await credentialService.clearCredentials();
    
    if (success) {
      console.log('Steam credentials cleared successfully');
      return { success: true };
    } else {
      return { success: false, error: 'Failed to clear credentials' };
    }
  } catch (error) {
    console.error('Error clearing Steam credentials:', error);
    return { 
      success: false, 
      error: `Clear error: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
}

/**
 * Updates the last used timestamp for stored credentials
 * 
 * @param event IPC event object
 * @param password Password for decryption
 * @returns Promise<{success: boolean, error?: string}> Update result
 */
async function handleUpdateLastUsed(event: any, password: string): Promise<{success: boolean, error?: string}> {
  try {
    console.log('Updating last used timestamp for stored credentials');
    
    if (!password) {
      return { success: false, error: 'Password is required for update' };
    }

    const success = await credentialService.updateLastUsed(password);
    
    if (success) {
      console.log('Last used timestamp updated successfully');
      return { success: true };
    } else {
      return { success: false, error: 'Failed to update last used timestamp' };
    }
  } catch (error) {
    console.error('Error updating last used timestamp:', error);
    return { 
      success: false, 
      error: `Update error: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
}

/**
 * Sets up all Steam login IPC handlers
 * 
 * Registers all Steam login-related IPC handlers with the main process.
 * This function should be called during application initialization.
 */
export function setupSteamLoginHandlers(): void {
  console.log('Setting up Steam login IPC handlers');

  // Store credentials
  ipcMain.handle('steam-login:store-credentials', handleStoreCredentials);

  // Get credentials
  ipcMain.handle('steam-login:get-credentials', handleGetCredentials);

  // Check if credentials exist
  ipcMain.handle('steam-login:has-credentials', handleHasStoredCredentials);

  // Validate credentials
  ipcMain.handle('steam-login:validate-credentials', handleValidateCredentials);

  // Clear credentials
  ipcMain.handle('steam-login:clear-credentials', handleClearCredentials);

  // Update last used
  ipcMain.handle('steam-login:update-last-used', handleUpdateLastUsed);

  console.log('Steam login IPC handlers registered successfully');
}
