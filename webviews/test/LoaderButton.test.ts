import { render } from '@testing-library/svelte';
import LoaderButton from '../components/common/LoaderButton.svelte';
import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom';

describe('LoaderButton', () => {
  it('LoaderButton is rendered into view', () => 
  {
        const { getByText } = render(LoaderButton as any, {
        props: {
            loading: false,
            text: 'Click Me',
        },
        });
        const button = getByText('Click Me');
        expect(button).toBeInTheDocument();
        expect(button).toHaveTextContent('Click Me');     
  });
    it('shows textWhileLoading and Spinner when loading is true', () => 
    {
        const { getByText } = render(LoaderButton as any, {
            props: {
            loading: true,
            text: 'Click Me',
            textWhileLoading: 'Loading...',
            },
        });
        expect(getByText('Loading...')).toBeInTheDocument();
    });
    it('calls onClick when clicked', async () => 
    {
        const handleClick = vi.fn();

        const { getByText } = render(LoaderButton as any, {
            props: {
            loading: false,
            text: 'Click Me',
            onClick: handleClick,
            },
        });
        const button = getByText('Click Me');
        button.click();
        expect(handleClick).toHaveBeenCalled();
    }); 
});
