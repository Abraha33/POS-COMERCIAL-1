import type { Preview } from '@storybook/react-vite';
import 'primereact/resources/themes/lara-light-blue/theme.css';
import 'primereact/resources/primereact.min.css';
import 'primeicons/primeicons.css';
import 'primeflex/primeflex.css';
import '@/shared/ui/tokens.css';
import { PrimeReactProvider } from 'primereact/api';

const preview: Preview = {
  decorators: [
    (Story) => (
      <PrimeReactProvider>
        <div style={{ padding: '1rem' }}>
          <Story />
        </div>
      </PrimeReactProvider>
    ),
  ],
};

export default preview;
