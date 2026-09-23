// Shapes returned by the CentralPass public API. Numeric money columns arrive
// as strings from Postgres (base_price, price_delta); always parse them.

export type ModifierOption = {
  id: number;
  name: string;
  price_delta: string | number;
  sort_order?: number;
};

export type ModifierGroup = {
  id: number;
  name: string;
  min_selections: number | null;
  max_selections: number | null;
  required: boolean;
  sort_order?: number;
  options: ModifierOption[];
};

export type ItemOffer = {
  id: number;
  type: string;
  badge_label: string;
  discounted_price: number | null;
};

export type MenuItem = {
  id: number;
  category_id: number;
  name: string;
  description: string | null;
  base_price: string | number;
  image_url: string | null;
  dietary_tags: string[] | null;
  is_featured?: boolean;
  modifier_groups: ModifierGroup[];
  offer?: ItemOffer | null;
};

export type MenuCategory = {
  id: number;
  name: string;
  description: string | null;
  available_now?: boolean;
  availability_message?: string | null;
  items: MenuItem[];
};

export type OrderOffer = {
  id: number;
  type: string;
  name: string;
  badge_label: string;
  min_order_value: number;
};

export type MenuResponse = {
  categories: MenuCategory[];
  offers?: OrderOffer[];
};

export type OfferApplied = {
  id: number;
  name: string;
  type: string;
  badge_label: string;
  amount: number;
  free_units?: Array<{ line_index: number; quantity: number; unit_price: number | string }> | null;
};

export type SurchargeApplied = {
  percent: number;
  amount: number;
  label?: string | null;
};

export type Quote = {
  subtotal: number;
  offer_applied: OfferApplied | null;
  offer_discount: number;
  discount_amount: number;
  surcharge_applied: SurchargeApplied | null;
  tax_breakdown?: { gst_total: number } | null;
  total: number;
};

export type DiscountCode = {
  code: string;
  type: "percent" | "fixed" | string;
  value: string | number;
};

export type StoreHour = {
  day_of_week: number;
  is_open: boolean;
  open_time: string | null;
  close_time: string | null;
  day_name?: string;
};

export type TodayInfo = {
  is_open: boolean;
  is_open_now: boolean;
  open_time: string | null;
  close_time: string | null;
  is_special_day: boolean;
  label?: string | null;
  surcharge_percent: number;
  surcharge_label: string | null;
  override_mode?: string | null;
};

export type PickupConfig = { lead_minutes: number; interval_minutes: number };

export type HoursResponse = {
  store_hours: StoreHour[];
  orders_paused: boolean;
  today: TodayInfo;
  accepting_orders: boolean;
  pickup: PickupConfig;
};

export type CreateOrderResponse = {
  client_secret: string | null;
  orderId: number;
  payment_method: "cash" | "card";
  offer_applied: OfferApplied | null;
  surcharge_applied: SurchargeApplied | null;
  tax_summary?: { gst_total: number } | null;
  tracking_url: string | null;
};

export type TrackedOrder = {
  order_number: number;
  status: string;
  pickup_time: string | null;
  placed_at?: string;
  payment: {
    method: "cash" | "card";
    amount_due_at_pickup: number;
    message: string;
    adjustment_reason: string | null;
  };
  items: Array<{ id: number; item_name: string; quantity: number; modifiers: Array<{ name: string; quantity?: number }> }>;
};

export type BookingDepositRules = {
  deposit_enabled: boolean;
  deposit_min_party: number;
  deposit_basis: "fixed" | "per_person";
  deposit_amount_cents: number;
  deposit_hold_minutes: number;
  deposit_refund_hours: number;
  deposit_version: number;
};

export type BookingConfig = {
  provider: "native" | "resos" | string;
  enabled: boolean;
  max_party_size: number;
  max_days_ahead: number;
  auto_confirm: boolean;
  timezone: string;
  default_duration_minutes: number;
  deposits?: BookingDepositRules | null;
  hub_configured: boolean;
};

export type BookingSlot = {
  time: string;
  starts_at?: string;
  available: boolean;
  reason?: string | null;
  seats_left: number;
};

export type BookingAvailability = {
  date: string;
  open: boolean;
  reason?: string | null;
  slots: BookingSlot[];
};

export type Booking = {
  reference: string;
  status: string;
  name: string;
  party_size: number;
  booked_for: string;
  notes?: string | null;
  revision?: number;
  deposit?: { amount_cents: number; status: string; can_pay?: boolean; hold_until?: string } | null;
  manage_token?: string;
  manage_url?: string;
};
