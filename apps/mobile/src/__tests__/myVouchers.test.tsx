/**
 * MyVouchers Screen Tests
 * Verifies the voucher card UI: status badge alignment, action buttons,
 * empty state, and tab filtering.
 */
import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import MyVouchers from "../screens/MyVouchers";
import authReducer from "../store/authSlice";

// ─── Navigation ──────────────────────────────────────────────────────────────
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
}));

// ─── Auth ────────────────────────────────────────────────────────────────────
let mockUser: any = { id: 1, userId: 1, email: "test@test.com" };

jest.mock("../hooks/useAuth", () => ({
  useAuth: () => ({
    user: mockUser,
    signOut: jest.fn(),
    loading: false,
    isAuthenticated: !!mockUser,
  }),
}));

// ─── Vouchers ────────────────────────────────────────────────────────────────
let mockVouchers: any[] = [];
let mockTransfers: any[] = [];
let mockLoading = false;
const mockTransfer = jest.fn();

jest.mock("../hooks/useVouchers", () => ({
  useMyVouchers: () => ({
    data: mockVouchers,
    isLoading: mockLoading,
    refetch: jest.fn(),
  }),
  useTransferVoucher: () => ({
    mutate: mockTransfer,
    isPending: false,
  }),
  useVoucherTransfers: () => ({
    data: mockTransfers,
    refetch: jest.fn(),
  }),
}));

jest.mock("react-native-qrcode-svg", () => "QRCode");

jest.mock("expo-clipboard", () => ({
  setStringAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("../lib/toast", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────
const createStore = () =>
  configureStore({
    reducer: { auth: authReducer },
    middleware: (gd: any) => gd({ serializableCheck: false }),
  });

const renderScreen = () =>
  render(
    <Provider store={createStore()}>
      <MyVouchers />
    </Provider>
  );

const sampleVoucher = (overrides: any = {}) => ({
  id: "1",
  user_id: "1",
  voucher_id: "10",
  status: "active",
  claimed_at: "2026-01-01T00:00:00Z",
  redeemed_at: null,
  voucher: {
    id: "10",
    title: "20% off Pizza",
    subtitle: "At Domino's",
    category: "food",
    original_price: 500,
    discounted_price: 400,
    expires_at: "2026-12-31T00:00:00Z",
  },
  ...overrides,
});

// ─── Tests ───────────────────────────────────────────────────────────────────
describe("MyVouchers", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockGoBack.mockClear();
    mockTransfer.mockClear();
    mockUser = { id: 1, userId: 1, email: "test@test.com" };
    mockVouchers = [];
    mockTransfers = [];
    mockLoading = false;
  });

  it("shows sign-in prompt when unauthenticated", () => {
    mockUser = null;
    const { getByText } = renderScreen();
    expect(getByText("Sign in to view your vouchers")).toBeTruthy();
    fireEvent.press(getByText("Sign In"));
    expect(mockNavigate).toHaveBeenCalledWith("Auth");
  });

  it("renders header and tabs", () => {
    const { getByText, getAllByText } = renderScreen();
    expect(getByText("My Vouchers")).toBeTruthy();
    expect(getByText("All")).toBeTruthy();
    // "Active" / "Redeemed" / "Expired" appear in the stats card too — just
    // assert at least one match exists per tab label.
    expect(getAllByText("Active").length).toBeGreaterThan(0);
    expect(getByText("Redeemed")).toBeTruthy();
    expect(getByText("Expired")).toBeTruthy();
    expect(getByText("Transfers")).toBeTruthy();
  });

  it("shows empty state when there are no vouchers", () => {
    const { getByText } = renderScreen();
    expect(getByText("No vouchers found")).toBeTruthy();
    fireEvent.press(getByText("Browse Vouchers"));
    expect(mockNavigate).toHaveBeenCalledWith("Vouchers");
  });

  it("renders a voucher card with status badge and action buttons", () => {
    mockVouchers = [sampleVoucher()];
    const { getByText, getAllByText, getByTestId } = renderScreen();

    // Title and subtitle
    expect(getByText("20% off Pizza")).toBeTruthy();
    expect(getByText("At Domino's")).toBeTruthy();

    // Status badge — icon + label rendered in one flex-row container
    expect(getByTestId("voucher-status-1")).toBeTruthy();
    // "Active" appears in tab + stats + badge — at least one
    expect(getAllByText("Active").length).toBeGreaterThan(0);

    // Reference + 3 action buttons
    expect(getByText("Voucher Reference")).toBeTruthy();
    expect(getByText("CLM-1")).toBeTruthy();
    expect(getByText("QR")).toBeTruthy();
    expect(getByText("Copy")).toBeTruthy();
    expect(getByText("Transfer")).toBeTruthy();
  });

  it("opens the transfer dialog when Transfer is pressed", () => {
    mockVouchers = [sampleVoucher()];
    const { getByText, getAllByText } = renderScreen();
    fireEvent.press(getByText("Transfer"));
    // Dialog title + dialog submit button both read "Transfer Voucher"
    expect(getAllByText("Transfer Voucher").length).toBeGreaterThan(0);
    expect(getByText("Recipient Mobile Number")).toBeTruthy();
  });

  it("opens the QR dialog when QR is pressed", () => {
    mockVouchers = [sampleVoucher()];
    const { getByText } = renderScreen();
    fireEvent.press(getByText("QR"));
    expect(getByText("Redeem Voucher")).toBeTruthy();
  });

  it("filters by status when a tab is selected", () => {
    mockVouchers = [
      sampleVoucher({ id: "1", status: "active" }),
      sampleVoucher({ id: "2", status: "redeemed" }),
    ];
    const { getAllByText, queryByTestId } = renderScreen();
    // First match is the tab
    fireEvent.press(getAllByText("Redeemed")[0]);
    expect(queryByTestId("voucher-card-1")).toBeNull();
    expect(queryByTestId("voucher-card-2")).toBeTruthy();
  });

  it("shows transfer history under Transfers tab with details", () => {
    mockTransfers = [
      {
        id: "t1",
        sender_id: "1",
        recipient_id: "2",
        sender_phone: "9999999999",
        recipient_phone: "8888888888",
        transferred_at: "2026-02-01T10:30:00Z",
        voucher_id: "10",
        voucher: {
          id: "10",
          title: "20% off Pizza",
          business_name: "Domino's",
          discount_label: "20% OFF",
          image: null,
        },
        sender_name: "Alice",
        recipient_name: "Bob",
      },
    ];
    const { getByText, getByTestId } = renderScreen();
    fireEvent.press(getByText("Transfers"));
    expect(getByTestId("transfer-row-t1")).toBeTruthy();
    expect(getByText("20% off Pizza")).toBeTruthy();
    expect(getByText("Domino's")).toBeTruthy();
    expect(getByText("Sent to")).toBeTruthy();
    expect(getByText("Bob")).toBeTruthy();
    expect(getByText("8888888888")).toBeTruthy();
    expect(getByText("VCH-10")).toBeTruthy();
  });

  it("shows total savings card", () => {
    mockVouchers = [sampleVoucher()];
    const { getByText } = renderScreen();
    expect(getByText("Total Savings")).toBeTruthy();
    expect(getByText("₹100")).toBeTruthy(); // 500 - 400
  });
});
