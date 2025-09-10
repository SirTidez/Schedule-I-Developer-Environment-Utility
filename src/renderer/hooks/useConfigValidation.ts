import { useState, useEffect } from 'react';

export interface ConfigValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export const useConfigValidation = () => {
  const [validation, setValidation] = useState<ConfigValidationResult>({
    isValid: false,
    errors: [],
    warnings: []
  });
  const [isLoading, setIsLoading] = useState(false);
  const [configExists, setConfigExists] = useState(false);

  const validateConfig = async (): Promise<ConfigValidationResult> => {
    setIsLoading(true);
    try {
      const result = await window.electronAPI.config.validate();
      setValidation(result);
      return result;
    } catch (error) {
      console.error('Failed to validate config:', error);
      const errorResult = {
        isValid: false,
        errors: ['Failed to validate configuration'],
        warnings: []
      };
      setValidation(errorResult);
      return errorResult;
    } finally {
      setIsLoading(false);
    }
  };

  const checkConfigExists = async () => {
    try {
      const exists = await window.electronAPI.config.exists();
      setConfigExists(exists);
      return exists;
    } catch (error) {
      console.error('Failed to check config existence:', error);
      return false;
    }
  };

  const loadConfigFromFile = async () => {
    try {
      const config = await window.electronAPI.config.loadFromFile();
      return config;
    } catch (error) {
      console.error('Failed to load config from file:', error);
      return null;
    }
  };

  const saveConfigToFile = async (config: any) => {
    try {
      const success = await window.electronAPI.config.saveToFile(config);
      return success;
    } catch (error) {
      console.error('Failed to save config to file:', error);
      return false;
    }
  };

  useEffect(() => {
    checkConfigExists();
  }, []);

  return {
    validation,
    isLoading,
    configExists,
    validateConfig,
    checkConfigExists,
    loadConfigFromFile,
    saveConfigToFile
  };
};
