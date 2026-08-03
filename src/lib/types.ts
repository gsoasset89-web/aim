import { Timestamp } from 'firebase/firestore';

export type InventoryItem = {
  id: string;
  userId?: string; 
  type: 'ics' | 'par';
  status: 'active' | 'inactive';
  date_received?: Timestamp;
  article: string;
  brand_model?: string;
  serial_number?: string;
  particulars?: string;
  number?: string;
  engas_property_number_v1?: string;
  engas_property_number_v2?: string;
  acquisition_date?: Timestamp;
  acquisition_cost?: number;
  property_number?: string;
  classification?: string;
  est_useful_life?: string;
  unit_of_measure?: string;
  unit_value?: number;
  balance_per_card?: number;
  on_hand_per_count?: number;
  short_over_qty?: number;
  short_over_val?: number;
  responsibility_center?: string;
  accountable_person?: string;
  prev_condition?: string;
  location?: string;
  current_condition?: string;
  remarks?: string;
  supplier?: string;
  po_number?: string;
  air_ris_number?: string;
  notes?: string;
  jev_number?: string;
  qr_code?: string;
  item_quantity?: number;
  individual_items?: string; // Storing as JSON string
  item_accessories?: string; // Storing as JSON string
  
  date_returned?: Timestamp;
  date_recorded?: Timestamp;
  prs_number?: string;
  iirup_number?: string;
  date_of_iirup?: Timestamp;
  are_mr_number?: string;
  attachment?: string;
  series?: string;
  
  disposition_destroyed?: boolean;
  disposition_sale?: boolean;
  disposition_service?: boolean;
  disposition_salvaged?: boolean;

  auction_date?: Timestamp;
  auction_or_date?: Timestamp;
  auction_or_number?: string;
  auction_amount?: number;

  accounting_status_dropped?: boolean;
  accounting_status_others?: string;

  deadline?: Timestamp;
  deadline_instructions?: string;
  responsible_member_id?: string;
  responsible_member_name?: string;
};

export type UserRole = 'Developer' | 'Admin' | 'Member' | 'View Only';

export type User = {
  id: string;
  name: string;
  email: string;
  number?: string;
  role: UserRole;
  verification: 'Authorized' | 'Unauthorized';
  contributionScore?: number;
  lastActivity?: Timestamp;
};

export type UtilityRecord = {
  id: string;
  userId: string;
  userName: string;
  type: 'fuel' | 'water' | 'electricity';
  date: Timestamp | any;
  amount: number;
  cost: number;
  office: string;
  details?: string;
  // Fuel specific fields
  plateNumber?: string;
  fuelType?: string;
  unitCost?: number;
  odometer?: number;
  orNumber?: string;
  tripTicket?: string;
  day?: number;
  month?: string;
  year?: number;
};

export type WasteItem = {
    id: string;
    userId: string;
    original_item_id: string;
    article: string;
    quantity: number;
    reason: string;
    date_disposed: Timestamp;
};

export type HistoryEvent = {
  id: string;
  timestamp: Timestamp;
  userId: string;
  userName: string;
  action: string;
  details: string;
};

export type Notification = {
  id: string;
  userId: string;
  message: string;
  link?: string;
  isRead: boolean;
  timestamp: Timestamp;
};

export type ApprovalRequest = {
  id: string;
  itemId: string;
  itemArticle: string;
  action: 'create' | 'edit' | 'delete' | 'deactivate' | 'restore';
  requestedByUserId: string;
  requestedByUserName: string;
  status: 'pending' | 'approved' | 'rejected';
  timestamp: Timestamp;
  data?: Partial<InventoryItem>;
  rejectionReason?: string;
  resolvedByUserId?: string;
  resolvedByUserName?: string;
  resolvedAt?: Timestamp;
};