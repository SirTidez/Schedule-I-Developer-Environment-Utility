/**
 * Logging Service for Schedule I Developer Environment Utility
 * 
 * Provides comprehensive logging functionality with file output and console logging.
 * Creates daily log files and formats log messages with timestamps and severity levels.
 * 
 * Key features:
 * - Daily log file rotation
 * - Multiple log levels (INFO, WARN, ERROR, DEBUG)
 * - Timestamp formatting
 * - File and console output
 * - Error handling with fallback to console
 * 
 * @author Schedule I Developer Environment Utility Team
 * @version 2.0.3
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { ConfigService } from './ConfigService';

/**
 * Logging Service class for application logging
 * 
 * Handles all logging operations including file output and console logging.
 * Creates daily log files in the configured logs directory.
 */
export class LoggingService {
  /** Configuration service instance for path management */
  private configService: ConfigService;
  
  /** Path to the current log file */
  private logFile: string;
  
  /**
   * Initializes the logging service
   * 
   * Sets up the log file path using the current date and configures
   * the logging service for daily log file rotation.
   * 
   * @param configService Configuration service instance for path management
   */
  constructor(configService: ConfigService) {
    this.configService = configService;
    this.logFile = path.join(configService.getLogsPath(), `app-${new Date().toISOString().split('T')[0]}.log`);
    console.log(`LoggingService initialized. Log file: ${this.logFile}`);
  }
  
  /**
   * Formats a log message with timestamp and level
   * 
   * @param level Log level (INFO, WARN, ERROR, DEBUG)
   * @param message Log message content
   * @returns string Formatted log message
   */
  private formatLogMessage(level: string, message: string): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level}] ${message}`;
  }
  
  /**
   * Writes a log message to the log file
   * 
   * Appends the formatted message to the current log file with error handling.
   * Falls back to console logging if file writing fails.
   * 
   * @param message Formatted log message to write
   */
  private async writeToFile(message: string): Promise<void> {
    try {
      await fs.appendFile(this.logFile, message + '\n');
      console.log(`Log written to: ${this.logFile}`);
    } catch (error) {
      console.error('Failed to write to log file:', error);
      console.error(`Log file path: ${this.logFile}`);
    }
  }
  
  /**
   * Logs an informational message
   * 
   * @param message Information message to log
   */
  async info(message: string): Promise<void> {
    const formattedMessage = this.formatLogMessage('INFO', message);
    console.log(formattedMessage);
    await this.writeToFile(formattedMessage);
  }
  
  /**
   * Logs a warning message
   * 
   * @param message Warning message to log
   */
  async warn(message: string): Promise<void> {
    const formattedMessage = this.formatLogMessage('WARN', message);
    console.warn(formattedMessage);
    await this.writeToFile(formattedMessage);
  }
  
  /**
   * Logs an error message
   * 
   * @param message Error message to log
   * @param error Optional Error object to include details
   */
  async error(message: string, error?: Error): Promise<void> {
    const errorDetails = error ? ` - ${error.message}` : '';
    const formattedMessage = this.formatLogMessage('ERROR', message + errorDetails);
    console.error(formattedMessage);
    await this.writeToFile(formattedMessage);
  }
  
  /**
   * Logs a debug message
   * 
   * @param message Debug message to log
   */
  async debug(message: string): Promise<void> {
    const formattedMessage = this.formatLogMessage('DEBUG', message);
    console.debug(formattedMessage);
    await this.writeToFile(formattedMessage);
  }
  
  getLogsPath(): string {
    return this.configService.getLogsPath();
  }
  
  getLogFile(): string {
    return this.logFile;
  }
}
