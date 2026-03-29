/**
 * Select UI Component Tests
 * Tests the custom Select dropdown built with Modal + Context.
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '../components/ui/select';

// --- Helpers ----------------------------------------------------------------

const renderSelect = ({
  value = '',
  onValueChange = jest.fn(),
  placeholder = 'Pick an option',
} = {}) => {
  return {
    onValueChange,
    ...render(
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="apple">Apple</SelectItem>
          <SelectItem value="banana">Banana</SelectItem>
          <SelectItem value="cherry">Cherry</SelectItem>
        </SelectContent>
      </Select>
    ),
  };
};

// --- Tests ------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Select UI Component', () => {
  it('renders trigger with placeholder', () => {
    const { getByText } = renderSelect();
    expect(getByText('Pick an option')).toBeTruthy();
  });

  it('opens modal on trigger press', () => {
    const { getByText, queryByText } = renderSelect();

    // Modal is closed — items inside should be hidden
    expect(queryByText('Apple')).toBeNull();
    expect(queryByText('Banana')).toBeNull();

    // Press the trigger to open the modal
    fireEvent.press(getByText('Pick an option'));

    // Items should now be visible
    expect(getByText('Apple')).toBeTruthy();
    expect(getByText('Banana')).toBeTruthy();
    expect(getByText('Cherry')).toBeTruthy();
  });

  it('SelectItem renders children text', () => {
    const { getByText } = renderSelect();

    // Open the modal so items become visible
    fireEvent.press(getByText('Pick an option'));

    expect(getByText('Apple')).toBeTruthy();
    expect(getByText('Banana')).toBeTruthy();
    expect(getByText('Cherry')).toBeTruthy();
  });

  it('selecting an item calls onValueChange', () => {
    const onValueChange = jest.fn();
    const { getByText } = renderSelect({ onValueChange });

    // Open modal
    fireEvent.press(getByText('Pick an option'));

    // Select "Banana"
    fireEvent.press(getByText('Banana'));

    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenCalledWith('banana');
  });

  it('selected item shows checkmark indicator', () => {
    // Render with "apple" pre-selected
    const { getByText } = renderSelect({ value: 'apple' });

    // Trigger displays the raw value ("apple") because label has not
    // been set through an interaction yet.
    fireEvent.press(getByText('apple'));

    // The checkmark should appear next to the selected item
    expect(getByText('\u2713')).toBeTruthy();
  });

  it('selected item has highlighted style', () => {
    const { getByText } = renderSelect({ value: 'apple' });

    // Open the modal
    fireEvent.press(getByText('apple'));

    // The selected item's Text should carry the "font-semibold" class
    const selectedText = getByText('Apple');
    expect(selectedText.props.className).toContain('font-semibold');

    // A non-selected item should NOT have the highlighted class
    const unselectedText = getByText('Banana');
    expect(unselectedText.props.className).not.toContain('font-semibold');
  });

  it('modal closes after selecting an item', () => {
    const { getByText, queryByText } = renderSelect();

    // Open modal
    fireEvent.press(getByText('Pick an option'));
    expect(getByText('Cherry')).toBeTruthy();

    // Select an item — the modal should close
    fireEvent.press(getByText('Cherry'));

    // Items that are only inside the modal should no longer be visible
    expect(queryByText('Banana')).toBeNull();
  });
});
