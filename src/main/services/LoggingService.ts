import * as fs from 'fs-extra';
import * as path from 'path';
import { ConfigService } from './ConfigService';

export class LoggingService {
  private configService: ConfigService;
  private logFile: string;
  
  constructor(configService: ConfigService) {
    this.configService = configService;
    this.logFile = path.join(configService.getLogsPath(), `app-${new Date().toISOString().split('T')[0]}.log`);
    console.log(`LoggingService initialized. Log file: ${this.logFile}`);
  }
  
  private formatLogMessage(level: string, message: string): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level}] ${message}`;
  }
  
  private async writeToFile(message: string): Promise<void> {
    try {
      await fs.appendFile(this.logFile, message + '\n');
      console.log(`Log written to: ${this.logFile}`);
    } catch (error) {
      console.error('Failed to write to log file:', error);
      console.error(`Log file path: ${this.logFile}`);
    }
  }
  
  async info(message: string): Promise<void> {
    const formattedMessage = this.formatLogMessage('INFO', message);
    console.log(formattedMessage);
    await this.writeToFile(formattedMessage);
  }
  
  async warn(message: string): Promise<void> {
    const formattedMessage = this.formatLogMessage('WARN', message);
    console.warn(formattedMessage);
    await this.writeToFile(formattedMessage);
  }
  
  async error(message: string, error?: Error): Promise<void> {
    const errorDetails = error ? ` - ${error.message}` : '';
    const formattedMessage = this.formatLogMessage('ERROR', message + errorDetails);
    console.error(formattedMessage);
    await this.writeToFile(formattedMessage);
  }
  
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
