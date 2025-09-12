/**
 * Credential Management Service for Schedule I Developer Environment Utility
 * 
 * Provides secure storage and retrieval of Steam login credentials using
 * SHA512 encryption. Handles credential encryption, storage, and validation
 * with proper security practices.
 * 
 * Key features:
 * - SHA512 encryption for stored credentials
 * - Secure key derivation
 * - Credential validation and cleanup
 * - Integration with configuration system
 * 
 * @author Schedule I Developer Environment Utility Team
 * @version 2.0.3
 */

import * as crypto from 'crypto';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';

export interface SteamCredentials {
  username: string;
  password: string;
  stayLoggedIn: boolean;
  encryptedAt: string;
  lastUsed: string;
}

export interface EncryptedCredentials {
  encryptedData: string;
  salt: string;
  iv: string;
  stayLoggedIn: boolean;
  encryptedAt: string;
  lastUsed: string;
}

export class CredentialService {
  private credentialsPath: string;
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32; // 256 bits
  private readonly ivLength = 16; // 128 bits
  private readonly saltLength = 32; // 256 bits

  constructor() {
    // Store credentials in the same directory as the config
    const configDir = path.join(os.homedir(), 'AppData', 'LocalLow', 'TVGS', 'Development Environment Manager');
    this.credentialsPath = path.join(configDir, 'steam_credentials.enc');
    
    // Ensure the directory exists
    fs.ensureDirSync(configDir);
  }

  /**
   * Encrypts Steam credentials using AES-256-GCM with SHA512 key derivation
   * 
   * @param credentials Steam login credentials to encrypt
   * @returns Promise<EncryptedCredentials> Encrypted credential data
   */
  async encryptCredentials(credentials: SteamCredentials): Promise<EncryptedCredentials> {
    try {
      // Generate random salt and IV
      const salt = crypto.randomBytes(this.saltLength);
      const iv = crypto.randomBytes(this.ivLength);
      
      // Derive key from password using PBKDF2 with SHA512
      const key = crypto.pbkdf2Sync(
        credentials.password, // Use password as the "master password"
        salt,
        100000, // 100,000 iterations
        this.keyLength,
        'sha512'
      );
      
      // Create cipher
      const cipherIv = crypto.randomBytes(16); // Generate random IV
      const cipher = crypto.createCipheriv(this.algorithm, key, cipherIv);
      cipher.setAAD(Buffer.from('schedule-i-dev-env', 'utf8'));
      
      // Encrypt the username (password is used as the key)
      const usernameBuffer = Buffer.from(credentials.username, 'utf8');
      let encrypted = cipher.update(usernameBuffer);
      encrypted = Buffer.concat([encrypted, cipher.final()]);
      
      // Prepend IV to encrypted data
      const result = Buffer.concat([cipherIv, encrypted]);
      
      // Get authentication tag
      const authTag = cipher.getAuthTag();
      
      // Combine encrypted data with auth tag
      const encryptedData = Buffer.concat([result, authTag]).toString('base64');
      
      return {
        encryptedData,
        salt: salt.toString('base64'),
        iv: cipherIv.toString('base64'),
        stayLoggedIn: credentials.stayLoggedIn,
        encryptedAt: credentials.encryptedAt,
        lastUsed: credentials.lastUsed
      };
    } catch (error) {
      console.error('Error encrypting credentials:', error);
      throw new Error('Failed to encrypt credentials');
    }
  }

  /**
   * Decrypts stored Steam credentials
   * 
   * @param encryptedCredentials Encrypted credential data
   * @param password Password used for decryption
   * @returns Promise<SteamCredentials> Decrypted credentials
   */
  async decryptCredentials(encryptedCredentials: EncryptedCredentials, password: string): Promise<SteamCredentials> {
    try {
      // Decode base64 data
      const salt = Buffer.from(encryptedCredentials.salt, 'base64');
      const iv = Buffer.from(encryptedCredentials.iv, 'base64');
      const encryptedData = Buffer.from(encryptedCredentials.encryptedData, 'base64');
      
      // Derive key using same parameters
      const key = crypto.pbkdf2Sync(
        password,
        salt,
        100000,
        this.keyLength,
        'sha512'
      );
      
      // Extract IV (first 16 bytes), auth tag (last 16 bytes), and encrypted data
      const decipherIv = encryptedData.slice(0, 16);
      const authTag = encryptedData.slice(-16);
      const encrypted = encryptedData.slice(16, -16);
      
      // Create decipher
      const decipher = crypto.createDecipheriv(this.algorithm, key, decipherIv);
      decipher.setAAD(Buffer.from('schedule-i-dev-env', 'utf8'));
      decipher.setAuthTag(authTag);
      
      // Decrypt
      let decrypted = decipher.update(encrypted);
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      
      return {
        username: decrypted.toString('utf8'),
        password: password, // Return the password used for decryption
        stayLoggedIn: encryptedCredentials.stayLoggedIn,
        encryptedAt: encryptedCredentials.encryptedAt,
        lastUsed: encryptedCredentials.lastUsed
      };
    } catch (error) {
      console.error('Error decrypting credentials:', error);
      throw new Error('Failed to decrypt credentials - invalid password or corrupted data');
    }
  }

  /**
   * Stores encrypted credentials to disk
   * 
   * @param credentials Steam credentials to store
   * @returns Promise<boolean> True if successful
   */
  async storeCredentials(credentials: SteamCredentials): Promise<boolean> {
    try {
      const encrypted = await this.encryptCredentials(credentials);
      const data = JSON.stringify(encrypted, null, 2);
      
      await fs.writeFile(this.credentialsPath, data, { encoding: 'utf8' });
      
      // Set restrictive file permissions (owner read/write only)
      await fs.chmod(this.credentialsPath, 0o600);
      
      console.log('Credentials stored successfully');
      return true;
    } catch (error) {
      console.error('Error storing credentials:', error);
      return false;
    }
  }

  /**
   * Retrieves and decrypts stored credentials
   * 
   * @param password Password for decryption
   * @returns Promise<SteamCredentials | null> Decrypted credentials or null if not found/invalid
   */
  async getCredentials(password: string): Promise<SteamCredentials | null> {
    try {
      if (!await fs.pathExists(this.credentialsPath)) {
        return null;
      }
      
      const data = await fs.readFile(this.credentialsPath, 'utf8');
      const encryptedCredentials: EncryptedCredentials = JSON.parse(data);
      
      return await this.decryptCredentials(encryptedCredentials, password);
    } catch (error) {
      console.error('Error retrieving credentials:', error);
      return null;
    }
  }

  /**
   * Checks if stored credentials exist
   * 
   * @returns Promise<boolean> True if credentials file exists
   */
  async hasStoredCredentials(): Promise<boolean> {
    return await fs.pathExists(this.credentialsPath);
  }

  /**
   * Removes stored credentials from disk
   * 
   * @returns Promise<boolean> True if successful
   */
  async clearCredentials(): Promise<boolean> {
    try {
      if (await fs.pathExists(this.credentialsPath)) {
        await fs.remove(this.credentialsPath);
        console.log('Credentials cleared successfully');
      }
      return true;
    } catch (error) {
      console.error('Error clearing credentials:', error);
      return false;
    }
  }

  /**
   * Updates the last used timestamp for stored credentials
   * 
   * @param password Password for decryption
   * @returns Promise<boolean> True if successful
   */
  async updateLastUsed(password: string): Promise<boolean> {
    try {
      const credentials = await this.getCredentials(password);
      if (!credentials) {
        return false;
      }
      
      credentials.lastUsed = new Date().toISOString();
      return await this.storeCredentials(credentials);
    } catch (error) {
      console.error('Error updating last used timestamp:', error);
      return false;
    }
  }

  /**
   * Validates that stored credentials are still valid
   * 
   * @param password Password for decryption
   * @returns Promise<boolean> True if credentials are valid
   */
  async validateStoredCredentials(password: string): Promise<boolean> {
    try {
      const credentials = await this.getCredentials(password);
      return credentials !== null;
    } catch (error) {
      console.error('Error validating credentials:', error);
      return false;
    }
  }

  /**
   * Gets information about stored credentials without decrypting
   * 
   * @returns Promise<{ exists: boolean; encryptedAt?: string; lastUsed?: string }> Credential info
   */
  async getCredentialInfo(): Promise<{ exists: boolean; encryptedAt?: string; lastUsed?: string }> {
    try {
      if (!await fs.pathExists(this.credentialsPath)) {
        return { exists: false };
      }
      
      const data = await fs.readFile(this.credentialsPath, 'utf8');
      const encryptedCredentials: EncryptedCredentials = JSON.parse(data);
      
      return {
        exists: true,
        encryptedAt: encryptedCredentials.encryptedAt,
        lastUsed: encryptedCredentials.lastUsed
      };
    } catch (error) {
      console.error('Error getting credential info:', error);
      return { exists: false };
    }
  }
}
