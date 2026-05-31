import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import App from './App';

describe('Smallcode Studio UI', () => {
  it('captures repo path and prompt before enabling a run', async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(screen.getByRole('heading', { name: /Smallcode Studio/i })).toBeInTheDocument();
    const runButton = screen.getByRole('button', { name: /Run Smallcode/i });
    expect(runButton).toBeDisabled();

    await user.type(screen.getByLabelText(/Repository path/i), '/tmp/demo-app');
    await user.type(screen.getByLabelText(/Task prompt/i), 'fix the login bug');

    expect(runButton).toBeEnabled();
    expect(screen.getByText(/Review-first local web console/i)).toBeInTheDocument();
  });
});
