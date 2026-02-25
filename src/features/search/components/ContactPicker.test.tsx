import { render, screen, fireEvent } from '@testing-library/react';
import { ContactPicker } from './ContactPicker';
import { vi, describe, it, expect } from 'vitest';

vi.mock('../hooks/useUserSearch', () => ({
  useUserSearch: () => ({
    users: [],
    isLoading: false,
  }),
}));

describe('ContactPicker', () => {
  it('calls setSelectedContacts with the contact removed when the x button is clicked', () => {
    const contact = { id: '1', username: 'TestUser', avatar_url: null };
    const setSelectedContacts = vi.fn();

    render(
      <ContactPicker
        selectedContacts={[contact]}
        setSelectedContacts={setSelectedContacts}
      />
    );

    // Find the badge containing the username
    const usernameElement = screen.getByText('TestUser');
    const badge = usernameElement.closest('.items-center'); // Badge is .items-center

    // Find the remove button inside the badge
    const button = badge?.querySelector('button');

    expect(button).toBeTruthy();

    if (button) {
      fireEvent.click(button);
    }

    expect(setSelectedContacts).toHaveBeenCalledWith([]);
  });
});
