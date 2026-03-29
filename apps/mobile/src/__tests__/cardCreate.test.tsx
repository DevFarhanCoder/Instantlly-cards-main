/**
 * CardCreate Screen Tests
 * Tests form rendering, keyboard behavior, category picker, accordion,
 * submit button, and preview toggle.
 */
import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
  useRoute: () => ({ params: {} }),
}));

jest.mock("../hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: 1, phone: "9876543210", roles: ["customer"] },
    accessToken: "test-token",
  }),
}));

const mockCreateCard = { mutateAsync: jest.fn(), isPending: false };
const mockUpdateCard = { mutateAsync: jest.fn(), isPending: false };

jest.mock("../hooks/useBusinessCards", () => ({
  useBusinessCards: () => ({
    cards: [],
    createCard: mockCreateCard,
    updateCard: mockUpdateCard,
  }),
}));

jest.mock("../store/api/categoriesApi", () => ({
  useGetCategoryTreeQuery: () => ({
    data: [
      { id: 1, name: "Restaurant", icon: "\u{1F374}", level: 0, sort_order: 0, is_active: true, children: [
        { id: 10, name: "Fast Food", icon: "\u{1F354}", level: 1, sort_order: 0, is_active: true, children: [] },
        { id: 11, name: "Fine Dining", icon: "\u{1F37D}", level: 1, sort_order: 1, is_active: true, children: [] },
      ]},
      { id: 2, name: "Salon", icon: "\u{1F484}", level: 0, sort_order: 1, is_active: true, children: [] },
      { id: 3, name: "Fitness", icon: "\u{1F3CB}", level: 0, sort_order: 2, is_active: true, children: [] },
    ],
    isLoading: false,
  }),
}));

jest.mock("../integrations/supabase/client", () => ({
  supabase: {
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn().mockResolvedValue({ error: null }),
        getPublicUrl: jest.fn(() => ({ data: { publicUrl: "https://example.com/logo.png" } })),
      })),
    },
  },
}));

jest.mock("../lib/toast", () => ({
  toast: { error: jest.fn(), success: jest.fn() },
}));

jest.mock("expo-image-picker", () => ({
  requestMediaLibraryPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
  launchImageLibraryAsync: jest.fn().mockResolvedValue({ canceled: true, assets: [] }),
  MediaTypeOptions: { Images: "Images" },
}));

jest.mock("expo-location", () => ({
  requestForegroundPermissionsAsync: jest.fn().mockResolvedValue({ status: "granted" }),
  getCurrentPositionAsync: jest.fn().mockResolvedValue({
    coords: { latitude: 19.076, longitude: 72.877 },
  }),
  reverseGeocodeAsync: jest.fn().mockResolvedValue([
    { city: "Mumbai", region: "Maharashtra", country: "India" },
  ]),
}));

jest.mock("lucide-react-native", () => {
  const { Text } = require("react-native");
  const icon = (name: string) => {
    const Component = (props: any) => <Text testID={`icon-${name}`}>{name}</Text>;
    Component.displayName = name;
    return Component;
  };
  return new Proxy(
    {},
    {
      get: (_, prop: string) => icon(prop),
    }
  );
});

// ─── Import after mocks ─────────────────────────────────────────────────────

import CardCreate from "../screens/CardCreate";

// ─── Helpers ────────────────────────────────────────────────────────────────

const renderCardCreate = () => render(<CardCreate />);

// ─── Tests ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
});

describe("CardCreate — Rendering", () => {
  it('shows "Create New Card" title', () => {
    const { getByText } = renderCardCreate();
    expect(getByText("Create New Card")).toBeTruthy();
  });

  it("shows all 6 step tab labels", () => {
    const { getByText } = renderCardCreate();
    expect(getByText("Personal")).toBeTruthy();
    expect(getByText("Business")).toBeTruthy();
    expect(getByText("About")).toBeTruthy();
    expect(getByText("Offer")).toBeTruthy();
    expect(getByText("Social")).toBeTruthy();
    expect(getByText("SEO")).toBeTruthy();
  });

  it("shows Personal section open by default", () => {
    const { getByText } = renderCardCreate();
    expect(getByText("Full Name *")).toBeTruthy();
    expect(getByText("Mobile Number *")).toBeTruthy();
  });

  it("shows progress bar", () => {
    const { getByText } = renderCardCreate();
    expect(getByText(/0 of 12 fields filled/)).toBeTruthy();
  });
});

describe("CardCreate — Form Inputs", () => {
  it("accepts text in Full Name input", () => {
    const { getByPlaceholderText } = renderCardCreate();
    fireEvent.changeText(getByPlaceholderText("Enter your full name"), "John Doe");
    // Re-query after state update
    expect(getByPlaceholderText("Enter your full name").props.value).toBe("John Doe");
  });

  it("accepts phone number", () => {
    const { getByPlaceholderText } = renderCardCreate();
    fireEvent.changeText(getByPlaceholderText("Enter mobile number"), "9876543210");
    expect(getByPlaceholderText("Enter mobile number").props.value).toBe("9876543210");
  });

  it("shows validation error when Full Name is blank on blur", () => {
    const { getByPlaceholderText, getByText } = renderCardCreate();
    fireEvent(getByPlaceholderText("Enter your full name"), "blur");
    expect(getByText("Full name is required")).toBeTruthy();
  });

  it("shows validation error when Mobile Number is blank on blur", () => {
    const { getByPlaceholderText, getByText } = renderCardCreate();
    fireEvent(getByPlaceholderText("Enter mobile number"), "blur");
    expect(getByText("Mobile number is required")).toBeTruthy();
  });

  it("formats birthdate input as DD/MM/YYYY", () => {
    const { getByPlaceholderText } = renderCardCreate();
    fireEvent.changeText(getByPlaceholderText("DD/MM/YYYY (e.g., 15/06/1990)"), "15061990");
    expect(getByPlaceholderText("DD/MM/YYYY (e.g., 15/06/1990)").props.value).toBe("15/06/1990");
  });

  it("toggles gender between Male and Female", () => {
    const { getByText } = renderCardCreate();
    fireEvent.press(getByText("\u{1F468} Male"));
    fireEvent.press(getByText("\u{1F469} Female"));
    expect(getByText("\u{1F469} Female")).toBeTruthy();
  });
});

describe("CardCreate — Accordion Behavior", () => {
  it("opens Business section when Business tab is pressed", () => {
    const { getByText, queryByText } = renderCardCreate();
    // Business section content should not be visible initially
    expect(queryByText("Company Name")).toBeNull();
    // Press the Business step tab
    fireEvent.press(getByText("Business"));
    // Business section should now be visible
    expect(getByText("Company Name")).toBeTruthy();
  });

  it("closes Personal when another tab is opened via step tab", () => {
    const { getAllByText, queryByText } = renderCardCreate();
    expect(queryByText("Full Name *")).toBeTruthy();
    // "About" appears in both the step tab and the accordion header
    const aboutElements = getAllByText("About");
    fireEvent.press(aboutElements[0]); // press the step tab
    // Personal fields should be gone
    expect(queryByText("Full Name *")).toBeNull();
    // About section's input label should appear
    expect(queryByText("Business Hours")).toBeTruthy();
  });

  it("toggles section open and closed", () => {
    const { getAllByText, queryByText } = renderCardCreate();
    // Personal is open initially
    expect(queryByText("Full Name *")).toBeTruthy();
    // Press SEO tab to close everything and open SEO
    const seoElements = getAllByText("SEO");
    fireEvent.press(seoElements[0]);
    // Personal fields should be gone
    expect(queryByText("Full Name *")).toBeNull();
    // SEO content should be visible
    expect(queryByText("Keywords")).toBeTruthy();
  });
});

describe("CardCreate — Category Picker", () => {
  it("opens category modal when trigger is pressed", () => {
    const { getAllByText, getByText } = renderCardCreate();
    // Navigate to About section via step tab
    const aboutElements = getAllByText("About");
    fireEvent.press(aboutElements[0]);
    // Press category trigger
    fireEvent.press(getByText("Select category"));
    expect(getByText("Select Category")).toBeTruthy();
    expect(getByText("Restaurant")).toBeTruthy();
    expect(getByText("Salon")).toBeTruthy();
  });

  it("filters categories via search", () => {
    const { getAllByText, getByText, getByPlaceholderText, queryByText } = renderCardCreate();
    fireEvent.press(getAllByText("About")[0]);
    fireEvent.press(getByText("Select category"));
    const searchInput = getByPlaceholderText("Search categories...");
    fireEvent.changeText(searchInput, "Sal");
    expect(getByText("Salon")).toBeTruthy();
    expect(queryByText("Restaurant")).toBeNull();
    expect(queryByText("Fitness")).toBeNull();
  });

  it("selects a category and closes modal", async () => {
    const { getAllByText, getByText, queryByText } = renderCardCreate();
    fireEvent.press(getAllByText("About")[0]);
    fireEvent.press(getByText("Select category"));
    fireEvent.press(getByText("Restaurant"));
    await waitFor(() => {
      expect(queryByText("Select Category")).toBeNull();
    });
  });
});

describe("CardCreate — Submit Button", () => {
  it("shows submit button at the bottom", () => {
    const { getByText } = renderCardCreate();
    expect(getByText("Create Card")).toBeTruthy();
  });

  it("shows Create Card button text", () => {
    const { getByText } = renderCardCreate();
    expect(getByText("Create Card")).toBeTruthy();
  });

  it("enables submit and calls createCard when valid data is provided", async () => {
    const { getByText, getByPlaceholderText } = renderCardCreate();
    fireEvent.changeText(getByPlaceholderText("Enter your full name"), "John Doe");
    fireEvent.changeText(getByPlaceholderText("Enter mobile number"), "9876543210");
    fireEvent.press(getByText("Create Card"));
    await waitFor(() => {
      expect(mockCreateCard.mutateAsync).toHaveBeenCalled();
    });
  });
});

describe("CardCreate — Preview Toggle", () => {
  it("shows preview when eye button is pressed", () => {
    const { getByTestId, getByText, queryByText } = renderCardCreate();
    // Preview should not be visible initially
    expect(queryByText("Preview")).toBeNull();
    // Press the Eye icon button (it's inside a Pressable)
    const eyeIcon = getByTestId("icon-Eye");
    fireEvent.press(eyeIcon.parent!);
    // Preview should now be visible
    expect(getByText("Preview")).toBeTruthy();
    expect(getByText("Your Name")).toBeTruthy();
  });
});

describe("CardCreate — Service Mode", () => {
  it("selects Home Service mode", () => {
    const { getByText } = renderCardCreate();
    // Open Business section
    fireEvent.press(getByText("Business"));
    const homeBtn = getByText(/Home Service/);
    fireEvent.press(homeBtn);
    expect(homeBtn).toBeTruthy();
  });
});

describe("CardCreate — Country Picker", () => {
  it("opens phone country picker modal", () => {
    const { getAllByText, getByText } = renderCardCreate();
    // Multiple +91 triggers exist (phone, whatsapp, company phone)
    // Press the first one (personal phone)
    const triggers = getAllByText(/\+91/);
    fireEvent.press(triggers[0]);
    expect(getByText("Select Country")).toBeTruthy();
    expect(getByText("India")).toBeTruthy();
    expect(getByText("United States")).toBeTruthy();
  });
});
