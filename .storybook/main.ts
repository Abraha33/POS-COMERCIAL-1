import path from 'node:path';
import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-a11y'],
  framework: '@storybook/react-vite',
  viteFinal: async (cfg) => {
    cfg.resolve = { ...cfg.resolve, alias: { ...cfg.resolve?.alias, '@': path.resolve(import.meta.dirname, '../src') } };
    return cfg;
  },
};

export default config;
