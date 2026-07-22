import * as inventoryApi from "../api/inventory.js";
import * as deptApi from "../api/departments.js";
import { useState, useMemo, useEffect } from "react";
const stockRegisterSeed = [
  { code: "ITM-001", name: "Sandman Software License (Annual)", category: "Software License", unit: "Units", stock: 9, min: 3, cost: 15000, sell: 18000, supplier: "TechSoft Solutions", description: "" },
  { code: "ITM-002", name: "DigiSmart License (Annual)", category: "Software License", unit: "Units", stock: 6, min: 2, cost: 12000, sell: 14500, supplier: "TechSoft Solutions", description: "" },
  { code: "ITM-003", name: "Bentonite (50kg bag)", category: "Consumables", unit: "Bags", stock: 35, min: 20, cost: 850, sell: 1100, supplier: "Chennai Minerals Ltd", description: "" },
  { code: "ITM-004", name: "Coal Dust (25kg bag)", category: "Consumables", unit: "Bags", stock: 22, min: 15, cost: 420, sell: 580, supplier: "Chennai Minerals Ltd", description: "" },
  { code: "ITM-005", name: "Dell Laptop (Latitude 5520)", category: "Hardware", unit: "Nos", stock: 3, min: 1, cost: 65000, sell: 72000, supplier: "Dell India Pvt Ltd", description: "" },
  { code: "ITM-006", name: "Network Switch (24-port)", category: "Networking", unit: "Nos", stock: 2, min: 1, cost: 8500, sell: 11000, supplier: "Netgear India", description: "" },
  { code: "ITM-007", name: "USB Pen Drive (64GB)", category: "Storage Media", unit: "Pcs", stock: 20, min: 10, cost: 350, sell: 500, supplier: "SanDisk Authorized", description: "" },
  { code: "ITM-008", name: "A4 Paper (500 sheets)", category: "Office Supplies", unit: "Reams", stock: 25, min: 10, cost: 220, sell: 260, supplier: "Paper World Chennai", description: "" },
  { code: "ITM-009", name: "Printer Toner (HP 59A)", category: "Consumables", unit: "Nos", stock: 8, min: 3, cost: 2800, sell: 3500, supplier: "HP Authorized Dealer", description: "" },
  { code: "ITM-010", name: "HDMI Cable (2m)", category: "Accessories", unit: "Pcs", stock: 8, min: 5, cost: 150, sell: 250, supplier: "Cables & More", description: "" },
];

// Each inward row now carries the full receipt detail so the Inward tab
// table can render items / date / received-by / notes like the register does.
const recentInwardSeed = [
  {
    ref: "GRN-005",
    date: "2026-04-25",
    party: "TechSoft Solutions",
    items: [{ item: "Sandman Software License (Annual)", qty: 10 }],
    value: "₹1,45,000",
    status: "Pending",
    receivedBy: "",
    notes: "Awaiting delivery",
  },
  {
    ref: "GRN-004",
    date: "2026-04-18",
    party: "HP Authorized Dealer",
    items: [
      { item: "Printer Toner (HP 59A)", qty: 4 },
      { item: "A4 Paper (500 sheets)", qty: 10 },
    ],
    value: "₹13,400",
    status: "Received",
    receivedBy: "Meena",
    notes: "",
  },
  {
    ref: "GRN-003",
    date: "2026-04-10",
    party: "Dell India Pvt Ltd",
    items: [{ item: "Dell Laptop (Latitude 5520)", qty: 2 }],
    value: "₹1,30,000",
    status: "Received",
    receivedBy: "Karthik",
    notes: "For client delivery",
  },
  {
    ref: "GRN-002",
    date: "2026-04-05",
    party: "Chennai Minerals Ltd",
    items: [
      { item: "Bentonite (50kg bag)", qty: 20 },
      { item: "Coal Dust (25kg bag)", qty: 15 },
    ],
    value: "₹23,300",
    status: "Received",
    receivedBy: "Suresh",
    notes: "Monthly consumables",
  },
  {
    ref: "GRN-001",
    date: "2026-04-01",
    party: "TechSoft Solutions",
    items: [
      { item: "Sandman Software License (Annual)", qty: 5 },
      { item: "DigiSmart License (Annual)", qty: 3 },
    ],
    value: "₹1,11,000",
    status: "Received",
    receivedBy: "Ravi Kumar",
    notes: "Q1 license batch",
  },
];

// Each outward row now carries the full dispatch detail so the Outward tab
// table can render items / date / dispatched-by / notes, mirroring Inward.
const recentOutwardSeed = [
  {
    ref: "DN-005",
    date: "2026-04-26",
    party: "ABC Castings",
    items: [{ item: "Sandman Software License (Annual)", qty: 2 }],
    value: "₹36,000",
    status: "Pending",
    dispatchedBy: "",
    notes: "New client order",
  },
  {
    ref: "DN-004",
    date: "2026-04-20",
    party: "Tirupur Die Cast Ltd",
    items: [
      { item: "Bentonite (50kg bag)", qty: 10 },
      { item: "Coal Dust (25kg bag)", qty: 8 },
    ],
    value: "₹15,640",
    status: "In Transit",
    dispatchedBy: "Suresh",
    notes: "Factory consumables",
  },
  {
    ref: "DN-003",
    date: "2026-04-12",
    party: "Coimbatore Forge Works",
    items: [
      { item: "Dell Laptop (Latitude 5520)", qty: 1 },
      { item: "HDMI Cable (2m)", qty: 2 },
    ],
    value: "₹72,760",
    status: "Delivered",
    dispatchedBy: "Karthik",
    notes: "With accessories",
  },
  {
    ref: "DN-002",
    date: "2026-04-08",
    party: "Salem Alloy Foundry",
    items: [{ item: "DigiSmart License (Annual)", qty: 1 }],
    value: "₹14,500",
    status: "Delivered",
    dispatchedBy: "Anitha",
    notes: "",
  },
  {
    ref: "DN-001",
    date: "2026-04-03",
    party: "Narayanan Castings",
    items: [{ item: "Sandman Software License (Annual)", qty: 1 }],
    value: "₹18,000",
    status: "Delivered",
    dispatchedBy: "Ravi Kumar",
    notes: "Annual renewal",
  },
];

// Full supplier records for the Suppliers tab. Names are also used to
// populate the supplier dropdown in the Inward modal (see supplierOptions).
const supplierSeed = [
  {
    name: "TechSoft Solutions",
    contact: "Ramesh K",
    phone: "9876543210",
    email: "ramesh@techsoft.in",
    city: "Chennai",
    itemsSupplied: "Software Licenses",
    notes: "Primary software partner",
  },
  {
    name: "Dell India Pvt Ltd",
    contact: "Priya S",
    phone: "9080706050",
    email: "priya@dell.in",
    city: "Bangalore",
    itemsSupplied: "Laptops, Servers",
    notes: "Authorized Dell reseller",
  },
  {
    name: "Chennai Minerals Ltd",
    contact: "Sundar M",
    phone: "9011223344",
    email: "sundar@chemins.in",
    city: "Chennai",
    itemsSupplied: "Bentonite, Coal Dust",
    notes: "Monthly supply agreement",
  },
  {
    name: "Netgear India",
    contact: "Vijay R",
    phone: "9955443322",
    email: "vijay@netgear.in",
    city: "Mumbai",
    itemsSupplied: "Network Equipment",
    notes: "",
  },
  {
    name: "SanDisk Authorized",
    contact: "Kavitha L",
    phone: "9988776655",
    email: "kavitha@sandisk.in",
    city: "Chennai",
    itemsSupplied: "Storage Media",
    notes: "",
  },
  {
    name: "HP Authorized Dealer",
    contact: "Murugan P",
    phone: "9944332211",
    email: "murugan@hpdealer.in",
    city: "Chennai",
    itemsSupplied: "Printers, Toners, Laptops",
    notes: "",
  },
  {
    name: "Paper World Chennai",
    contact: "Anand T",
    phone: "9922113344",
    email: "anand@paperworld.in",
    city: "Chennai",
    itemsSupplied: "Paper, Stationery",
    notes: "",
  },
  {
    name: "Cables & More",
    contact: "Deepa V",
    phone: "9977665544",
    email: "deepa@cablesmore.in",
    city: "Chennai",
    itemsSupplied: "Cables, Accessories",
    notes: "",
  },
];

const categories = [
  "All Categories",
  "Software License",
  "Hardware",
  "Office Supplies",
  "Consumables",
  "Electronic Components",
  "Packaging",
  "Networking",
  "Storage Media",
  "Accessories",
  "Other",
];

// Same list as `categories` minus the "All Categories" filter option — used
// in the Add/Edit Item modal where a real category must be chosen.
const itemCategories = categories.filter((c) => c !== "All Categories");

const inwardStatusOptions = ["Pending", "Received", "Partial", "Returned"];
const outwardStatusOptions = ["Pending", "In Transit", "Delivered", "Returned"];

const statusStyles = {
  Pending: { bg: "#fef3c7", color: "#b45309", dot: "#f59e0b" },
  Received: { bg: "#d1fae5", color: "#047857", dot: "#10b981" },
  "In Stock": { bg: "#d1fae5", color: "#047857", dot: "#10b981" },
  "Low Stock": { bg: "#fee2e2", color: "#b91c1c", dot: "#ef4444" },
  "In Transit": { bg: "#dbeafe", color: "#1d4ed8", dot: "#3b82f6" },
  Delivered: { bg: "#d1fae5", color: "#047857", dot: "#10b981" },
  Partial: { bg: "#fef3c7", color: "#b45309", dot: "#f59e0b" },
  Returned: { bg: "#fee2e2", color: "#b91c1c", dot: "#ef4444" },
};

function StatusBadge({ status }) {
  const s = statusStyles[status] || statusStyles["In Stock"];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 10px",
        borderRadius: 999,
        background: s.bg,
        color: s.color,
        fontSize: 12,
        fontWeight: 600,
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.dot }} />
      {status}
    </span>
  );
}

const tabs = ["Dashboard", "Inward", "Outward", "Items", "Suppliers"];
const tabLabels = { Items: "Items/Products" };

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function makeEmptyItem() {
  return { id: Math.random().toString(36).slice(2), item: "", price: 0, qty: 1 };
}

const inputStyle = {
  width: "100%",
  padding: "9px 12px",
  borderRadius: 8,
  border: "1px solid #d1d5db",
  fontSize: 14,
  color: "#111827",
  boxSizing: "border-box",
};

const labelStyle = {
  display: "block",
  fontSize: 11,
  fontWeight: 700,
  color: "#6b7280",
  letterSpacing: 0.4,
  marginBottom: 6,
};

/* ---------------- Shared modal shell ---------------- */
function ModalShell({ title, onClose, children, footer }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(17,24,39,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 12,
          width: 820,
          maxWidth: "92vw",
          maxHeight: "88vh",
          overflowY: "auto",
          boxShadow: "0 20px 50px rgba(0,0,0,0.25)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "20px 24px",
            borderBottom: "1px solid #e5e7eb",
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 700, color: "#111827" }}>{title}</div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", fontSize: 20, color: "#6b7280", cursor: "pointer", lineHeight: 1 }}
          >
            ×
          </button>
        </div>
        <div style={{ padding: 24 }}>{children}</div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, padding: "16px 24px", borderTop: "1px solid #e5e7eb" }}>
          {footer}
        </div>
      </div>
    </div>
  );
}

function ItemsTable({ items, priceLabel, onUpdate, onAdd, onRemove, itemOptions, allItems }) {
  const total = items.reduce((sum, it) => sum + (Number(it.price) || 0) * (Number(it.qty) || 0), 0);

  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: 16, marginBottom: 20 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#6b7280", letterSpacing: 0.5, marginBottom: 12 }}>
        ITEMS {priceLabel === "UNIT COST (₹)" ? "RECEIVED" : "DISPATCHED"}
      </div>

      {items.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 140px 90px 100px 28px",
            gap: 10,
            fontSize: 11,
            fontWeight: 700,
            color: "#6b7280",
            letterSpacing: 0.4,
            marginBottom: 8,
          }}
        >
          <div>ITEM</div>
          <div>{priceLabel}</div>
          <div>QTY</div>
          <div style={{ textAlign: "right" }}>TOTAL (₹)</div>
          <div />
        </div>
      )}

      {items.length === 0 && (
        <div style={{ fontSize: 13, color: "#9ca3af", padding: "8px 0" }}>
          No items added yet. Click "+ Add Item" to add one.
        </div>
      )}

      {items.map((it) => {
        const rowTotal = (Number(it.price) || 0) * (Number(it.qty) || 0);
        return (
          <div
            key={it.id}
            style={{ display: "grid", gridTemplateColumns: "1fr 140px 90px 100px 28px", gap: 10, alignItems: "center", marginBottom: 10 }}
          >
            <select
  style={inputStyle}
  value={it.item}
  onChange={(e) => {
    const selectedName = e.target.value;
    onUpdate(it.id, "item", selectedName);
    const match = allItems.find((i) => i.name === selectedName);
    if (match) {
      const autoPrice = priceLabel === "UNIT COST (₹)" ? match.cost : match.sell;
      onUpdate(it.id, "price", autoPrice);
    }
  }}
>
              <option value="">-- Select --</option>
              {itemOptions.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
            <input type="number" style={inputStyle} value={it.price} onChange={(e) => onUpdate(it.id, "price", e.target.value)} />
            <input type="number" style={inputStyle} value={it.qty} onChange={(e) => onUpdate(it.id, "qty", e.target.value)} />
            <div style={{ textAlign: "right", fontWeight: 700, color: "#111827" }}>₹{rowTotal.toLocaleString("en-IN")}</div>
            <button
              onClick={() => onRemove(it.id)}
              style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer", fontSize: 16, fontWeight: 700 }}
              title="Remove item"
            >
              ×
            </button>
          </div>
        );
      })}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
        <button onClick={onAdd} style={{ background: "none", border: "none", color: "#2563eb", fontWeight: 600, fontSize: 13, cursor: "pointer", padding: 0 }}>
          + Add Item
        </button>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>Total: ₹{total.toLocaleString("en-IN")}</div>
      </div>
    </div>
  );
}

/* ---------------- Inward Modal ---------------- */
function InwardModal({ onClose, onSave, nextGrnNumber, initial, itemOptions, allItems, supplierOptions }) {
  const [grnNumber] = useState(initial?.ref || nextGrnNumber);
  const [date, setDate] = useState(initial?.date || todayISO());
  const [status, setStatus] = useState(initial?.status || "Received");
  const [supplier, setSupplier] = useState(initial?.party || "");
  const [invoiceNo, setInvoiceNo] = useState(initial?.invoiceNo || "");
  const [receivedBy, setReceivedBy] = useState(initial?.receivedBy || "");
  const [items, setItems] = useState(
    initial?.items
      ? initial.items.map((it) => ({ id: Math.random().toString(36).slice(2), item: it.item, price: it.price || 0, qty: it.qty }))
      : []
  );
  const [notes, setNotes] = useState(initial?.notes || "");

  const total = items.reduce((sum, it) => sum + (Number(it.price) || 0) * (Number(it.qty) || 0), 0);

  const updateItem = (id, field, value) => setItems((prev) => prev.map((it) => (it.id === id ? { ...it, [field]: value } : it)));
  const addItem = () => setItems((prev) => [...prev, makeEmptyItem()]);
  const removeItem = (id) => setItems((prev) => prev.filter((it) => it.id !== id));

  const handleSave = () => {
    if (!supplier) {
      alert("Please select a supplier.");
      return;
    }
    if (items.length === 0 || items.some((it) => !it.item)) {
      alert("Please add at least one item and select an item for every row.");
      return;
    }
    onSave({
      ref: grnNumber,
      date,
      party: supplier,
      invoiceNo,
      receivedBy,
      notes,
      items: items.map((it) => ({ item: it.item, qty: Number(it.qty) || 0, price: Number(it.price) || 0 })),
      value: `₹${total.toLocaleString("en-IN")}`,
      status,
    });
    onClose();
  };

  return (
    <ModalShell
      title={initial ? "Edit Inward — Goods Receipt" : "New Inward — Goods Receipt"}
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose} style={{ padding: "10px 18px", borderRadius: 8, border: "1px solid #d1d5db", background: "#fff", fontWeight: 600, fontSize: 13, color: "#111827", cursor: "pointer" }}>
            Cancel
          </button>
          <button onClick={handleSave} style={{ padding: "10px 18px", borderRadius: 8, border: "none", background: "#2563eb", fontWeight: 600, fontSize: 13, color: "#fff", cursor: "pointer" }}>
            Save Inward
          </button>
        </>
      }
    >
      <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>GRN NUMBER</label>
          <input style={{ ...inputStyle, background: "#f3f4f6", color: "#6b7280" }} value={grnNumber} readOnly />
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>DATE</label>
          <input type="date" style={inputStyle} value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>STATUS</label>
          <select style={inputStyle} value={status} onChange={(e) => setStatus(e.target.value)}>
            {inwardStatusOptions.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>SUPPLIER *</label>
          <select style={inputStyle} value={supplier} onChange={(e) => setSupplier(e.target.value)}>
            <option value="">-- Select Supplier --</option>
            {supplierOptions.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>SUPPLIER INVOICE NO.</label>
          <input style={inputStyle} placeholder="e.g. INV-2026-001" value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>RECEIVED BY</label>
          <input style={inputStyle} placeholder="Employee name" value={receivedBy} onChange={(e) => setReceivedBy(e.target.value)} />
        </div>
      </div>

      <ItemsTable items={items} priceLabel="UNIT COST (₹)" onUpdate={updateItem} onAdd={addItem} onRemove={removeItem} itemOptions={itemOptions} allItems={allItems} />

      <div>
        <label style={labelStyle}>NOTES</label>
        <textarea
          style={{ ...inputStyle, minHeight: 70, resize: "vertical", fontFamily: "inherit" }}
          placeholder="Notes..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
    </ModalShell>
  );
}

/* ---------------- Outward Modal ---------------- */
function OutwardModal({ onClose, onSave, nextDnNumber, initial, itemOptions, allItems }) {
  const [dnNumber] = useState(initial?.ref || nextDnNumber);
  const [date, setDate] = useState(initial?.date || todayISO());
  const [status, setStatus] = useState(initial?.status || "Pending");
  const [customer, setCustomer] = useState(initial?.party || "");
  const [orderRef, setOrderRef] = useState(initial?.orderRef || "");
  const [dispatchedBy, setDispatchedBy] = useState(initial?.dispatchedBy || "");
  const [items, setItems] = useState(
    initial?.items
      ? initial.items.map((it) => ({ id: Math.random().toString(36).slice(2), item: it.item, price: it.price || 0, qty: it.qty }))
      : []
  );
  const [notes, setNotes] = useState(initial?.notes || "");

  const total = items.reduce((sum, it) => sum + (Number(it.price) || 0) * (Number(it.qty) || 0), 0);

  const updateItem = (id, field, value) => setItems((prev) => prev.map((it) => (it.id === id ? { ...it, [field]: value } : it)));
  const addItem = () => setItems((prev) => [...prev, makeEmptyItem()]);
  const removeItem = (id) => setItems((prev) => prev.filter((it) => it.id !== id));

  const handleSave = () => {
    if (!customer.trim()) {
      alert("Please enter a customer name.");
      return;
    }
    if (items.length === 0 || items.some((it) => !it.item)) {
      alert("Please add at least one item and select an item for every row.");
      return;
    }
    onSave({
      ref: dnNumber,
      date,
      party: customer.trim(),
      orderRef,
      dispatchedBy,
      notes,
      items: items.map((it) => ({ item: it.item, qty: Number(it.qty) || 0, price: Number(it.price) || 0 })),
      value: `₹${total.toLocaleString("en-IN")}`,
      status,
    });
    onClose();
  };

  return (
    <ModalShell
      title={initial ? "Edit Outward — Dispatch" : "New Outward — Dispatch"}
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose} style={{ padding: "10px 18px", borderRadius: 8, border: "1px solid #d1d5db", background: "#fff", fontWeight: 600, fontSize: 13, color: "#111827", cursor: "pointer" }}>
            Cancel
          </button>
          <button onClick={handleSave} style={{ padding: "10px 18px", borderRadius: 8, border: "none", background: "#2563eb", fontWeight: 600, fontSize: 13, color: "#fff", cursor: "pointer" }}>
            Save Outward
          </button>
        </>
      }
    >
      <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>DELIVERY NOTE NO.</label>
          <input style={{ ...inputStyle, background: "#f3f4f6", color: "#6b7280" }} value={dnNumber} readOnly />
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>DATE</label>
          <input type="date" style={inputStyle} value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>STATUS</label>
          <select style={inputStyle} value={status} onChange={(e) => setStatus(e.target.value)}>
            {outwardStatusOptions.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>CUSTOMER *</label>
          <input style={inputStyle} placeholder="Customer name" value={customer} onChange={(e) => setCustomer(e.target.value)} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>ORDER REFERENCE</label>
          <input style={inputStyle} placeholder="e.g. ORD-001" value={orderRef} onChange={(e) => setOrderRef(e.target.value)} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>DISPATCHED BY</label>
          <input style={inputStyle} placeholder="Employee name" value={dispatchedBy} onChange={(e) => setDispatchedBy(e.target.value)} />
        </div>
      </div>

      <ItemsTable items={items} priceLabel="UNIT PRICE (₹)" onUpdate={updateItem} onAdd={addItem} onRemove={removeItem} itemOptions={itemOptions} allItems={allItems} />

      <div>
        <label style={labelStyle}>NOTES</label>
        <textarea
          style={{ ...inputStyle, minHeight: 70, resize: "vertical", fontFamily: "inherit" }}
          placeholder="Delivery instructions..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
    </ModalShell>
  );
}

/* ---------------- Inward tab table ---------------- */
function InwardTab({ rows, onAddNew, onEdit, onDelete }) {
  const [search, setSearch] = useState("");

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(
      (r) =>
        r.ref.toLowerCase().includes(term) ||
        r.party.toLowerCase().includes(term) ||
        (r.receivedBy || "").toLowerCase().includes(term) ||
        (r.items || []).some((it) => it.item.toLowerCase().includes(term))
    );
  }, [rows, search]);

  const thStyle = {
    textAlign: "left",
    fontSize: 11,
    fontWeight: 700,
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    padding: "10px 16px",
    borderBottom: "1px solid #e5e7eb",
    whiteSpace: "nowrap",
  };

  const tdStyle = { padding: "12px 16px", fontSize: 14, color: "#111827", borderBottom: "1px solid #f3f4f6", verticalAlign: "top" };

  return (
    <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb", overflow: "hidden" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: 16,
          gap: 16,
          background: "#f9fafb",
          borderBottom: "1px solid #e5e7eb",
        }}
      >
        <div style={{ position: "relative", maxWidth: 320, flex: 1 }}>
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#9ca3af", fontSize: 14 }}>
            🔍
          </span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            style={{ ...inputStyle, paddingLeft: 34, background: "#fff" }}
          />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16, whiteSpace: "nowrap" }}>
          <div style={{ fontSize: 13, color: "#6b7280" }}>{filteredRows.length} entries</div>
          <button
            onClick={onAddNew}
            style={{ padding: "10px 16px", borderRadius: 8, border: "none", background: "#2563eb", fontWeight: 600, fontSize: 13, color: "#fff", cursor: "pointer" }}
          >
            + New Inward
          </button>
        </div>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={thStyle}>GRN</th>
              <th style={thStyle}>Date</th>
              <th style={thStyle}>Supplier</th>
              <th style={thStyle}>Items</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Total Value</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Received By</th>
              <th style={thStyle}>Notes</th>
              <th style={thStyle} />
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((r, i) => (
              <tr key={`${r.ref}-${i}`}>
                <td style={{ ...tdStyle, color: "#2563eb", fontWeight: 700, whiteSpace: "nowrap" }}>{r.ref}</td>
                <td style={{ ...tdStyle, color: "#6b7280", whiteSpace: "nowrap" }}>{r.date || "—"}</td>
                <td style={{ ...tdStyle, fontWeight: 600 }}>{r.party}</td>
                <td style={{ ...tdStyle, color: "#374151" }}>
                  {(r.items || []).length === 0
                    ? "—"
                    : r.items.map((it, idx) => (
                        <div key={idx}>
                          {it.item} ×{it.qty}
                        </div>
                      ))}
                </td>
                <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700, whiteSpace: "nowrap" }}>{r.value}</td>
                <td style={tdStyle}><StatusBadge status={r.status} /></td>
                <td style={{ ...tdStyle, color: "#6b7280" }}>{r.receivedBy || "—"}</td>
                <td style={{ ...tdStyle, color: "#6b7280" }}>{r.notes || "—"}</td>
                <td style={tdStyle}>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => onEdit(r)}
                      style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #d1d5db", background: "#fff", fontWeight: 600, fontSize: 12, color: "#111827", cursor: "pointer" }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => onDelete(r)}
                      style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #fecaca", background: "#fee2e2", fontWeight: 600, fontSize: 12, color: "#b91c1c", cursor: "pointer" }}
                    >
                      Del
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredRows.length === 0 && (
              <tr>
                <td colSpan={9} style={{ ...tdStyle, textAlign: "center", color: "#9ca3af", padding: 32 }}>
                  No inward entries match your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------------- Outward tab table ---------------- */
function OutwardTab({ rows, onAddNew, onEdit, onDelete }) {
  const [search, setSearch] = useState("");

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(
      (r) =>
        r.ref.toLowerCase().includes(term) ||
        r.party.toLowerCase().includes(term) ||
        (r.dispatchedBy || "").toLowerCase().includes(term) ||
        (r.items || []).some((it) => it.item.toLowerCase().includes(term))
    );
  }, [rows, search]);

  const thStyle = {
    textAlign: "left",
    fontSize: 11,
    fontWeight: 700,
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    padding: "10px 16px",
    borderBottom: "1px solid #e5e7eb",
    whiteSpace: "nowrap",
  };

  const tdStyle = { padding: "12px 16px", fontSize: 14, color: "#111827", borderBottom: "1px solid #f3f4f6", verticalAlign: "top" };

  return (
    <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb", overflow: "hidden" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: 16,
          gap: 16,
          background: "#f9fafb",
          borderBottom: "1px solid #e5e7eb",
        }}
      >
        <div style={{ position: "relative", maxWidth: 320, flex: 1 }}>
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#9ca3af", fontSize: 14 }}>
            🔍
          </span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            style={{ ...inputStyle, paddingLeft: 34, background: "#fff" }}
          />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16, whiteSpace: "nowrap" }}>
          <div style={{ fontSize: 13, color: "#6b7280" }}>{filteredRows.length} entries</div>
          <button
            onClick={onAddNew}
            style={{ padding: "10px 16px", borderRadius: 8, border: "none", background: "#2563eb", fontWeight: 600, fontSize: 13, color: "#fff", cursor: "pointer" }}
          >
            + New Outward
          </button>
        </div>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={thStyle}>DN</th>
              <th style={thStyle}>Date</th>
              <th style={thStyle}>Customer</th>
              <th style={thStyle}>Items</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Total Value</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Dispatched By</th>
              <th style={thStyle}>Notes</th>
              <th style={thStyle} />
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((r, i) => (
              <tr key={`${r.ref}-${i}`}>
                <td style={{ ...tdStyle, color: "#2563eb", fontWeight: 700, whiteSpace: "nowrap" }}>{r.ref}</td>
                <td style={{ ...tdStyle, color: "#6b7280", whiteSpace: "nowrap" }}>{r.date || "—"}</td>
                <td style={{ ...tdStyle, fontWeight: 600 }}>{r.party}</td>
                <td style={{ ...tdStyle, color: "#374151" }}>
                  {(r.items || []).length === 0
                    ? "—"
                    : r.items.map((it, idx) => (
                        <div key={idx}>
                          {it.item} ×{it.qty}
                        </div>
                      ))}
                </td>
                <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700, whiteSpace: "nowrap" }}>{r.value}</td>
                <td style={tdStyle}><StatusBadge status={r.status} /></td>
                <td style={{ ...tdStyle, color: "#6b7280" }}>{r.dispatchedBy || "—"}</td>
                <td style={{ ...tdStyle, color: "#6b7280" }}>{r.notes || "—"}</td>
                <td style={tdStyle}>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => onEdit(r)}
                      style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #d1d5db", background: "#fff", fontWeight: 600, fontSize: 12, color: "#111827", cursor: "pointer" }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => onDelete(r)}
                      style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #fecaca", background: "#fee2e2", fontWeight: 600, fontSize: 12, color: "#b91c1c", cursor: "pointer" }}
                    >
                      Del
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredRows.length === 0 && (
              <tr>
                <td colSpan={9} style={{ ...tdStyle, textAlign: "center", color: "#9ca3af", padding: 32 }}>
                  No outward entries match your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------------- Add/Edit Item Modal ---------------- */
function ItemModal({ onClose, onSave, nextItemCode, initial, supplierOptions = [], departments = [] }) {
  const [code] = useState(initial?.code || nextItemCode);
  const [category, setCategory] = useState(initial?.category || itemCategories[0]);
  const [name, setName] = useState(initial?.name || "");
  // Unit and Min Stock are no longer editable in this form, but their existing values are
  // passed through unchanged (on edit) so the Low Stock feature elsewhere keeps working.
  const unit = initial?.unit || "Units";
  const min = initial?.min ?? 0;
  const [supplier, setSupplier] = useState(initial?.supplier || "");
  const [departmentId, setDepartmentId] = useState(initial?.department_id ? String(initial.department_id) : "");
  const [dateAdded, setDateAdded] = useState(initial?.dateAdded || todayISO());
  const [invoiceNo, setInvoiceNo] = useState(initial?.invoiceNo || "");
  const [cost, setCost] = useState(initial?.cost ?? "");
  const [sell, setSell] = useState(initial?.sell ?? "");
  const [stock, setStock] = useState(initial?.stock ?? 0);
  const [remarks, setRemarks] = useState(initial?.remarks || "");
  const [description, setDescription] = useState(initial?.description || "");

  const handleSave = () => {
    if (!name.trim()) {
      alert("Please enter an item name.");
      return;
    }
    onSave({
      code,
      category,
      name: name.trim(),
      unit,
      supplier,
      department_id: departmentId || null,
      dateAdded,
      invoiceNo,
      cost: Number(cost) || 0,
      sell: Number(sell) || 0,
      stock: Number(stock) || 0,
      min,
      remarks,
      description,
    });
    onClose();
  };

  return (
    <ModalShell
      title={initial ? "Edit Item" : "Add Item"}
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose} style={{ padding: "10px 18px", borderRadius: 8, border: "1px solid #d1d5db", background: "#fff", fontWeight: 600, fontSize: 13, color: "#111827", cursor: "pointer" }}>
            Cancel
          </button>
          <button onClick={handleSave} style={{ padding: "10px 18px", borderRadius: 8, border: "none", background: "#2563eb", fontWeight: 600, fontSize: 13, color: "#fff", cursor: "pointer" }}>
            Save
          </button>
        </>
      }
    >
      <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>ITEM CODE</label>
          <input style={{ ...inputStyle, background: "#f3f4f6", color: "#6b7280", fontFamily: "monospace" }} value={code} readOnly />
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>CATEGORY</label>
          <select style={inputStyle} value={category} onChange={(e) => setCategory(e.target.value)}>
            {itemCategories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>ITEM / PRODUCT NAME *</label>
        <input style={inputStyle} placeholder="e.g. Sandman License (Annual)" value={name} onChange={(e) => setName(e.target.value)} />
      </div>

      <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>PRIMARY SUPPLIER</label>
          <select style={inputStyle} value={supplier} onChange={(e) => setSupplier(e.target.value)}>
            <option value="">Select supplier</option>
            {supplierOptions.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>INVOICE NUMBER</label>
          <input style={inputStyle} placeholder="e.g. INV-2026-001" value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} />
        </div>
      </div>

      <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>DEPARTMENT</label>
          <select style={inputStyle} value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
            <option value="">Select department</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>DATE PURCHASED</label>
          <input type="date" style={inputStyle} value={dateAdded} onChange={(e) => setDateAdded(e.target.value)} />
        </div>
      </div>

      <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>COST PRICE (₹)</label>
          <input type="number" style={inputStyle} value={cost} onChange={(e) => setCost(e.target.value)} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>SELLING PRICE (₹)</label>
          <input type="number" style={inputStyle} value={sell} onChange={(e) => setSell(e.target.value)} />
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>QUANTITY</label>
        <input type="number" style={inputStyle} value={stock} onChange={(e) => setStock(e.target.value)} />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>DESCRIPTION</label>
        <textarea
          style={{ ...inputStyle, minHeight: 70, resize: "vertical", fontFamily: "inherit" }}
          placeholder="Notes about this item..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div>
        <label style={labelStyle}>REMARKS</label>
        <textarea
          style={{ ...inputStyle, minHeight: 70, resize: "vertical", fontFamily: "inherit" }}
          placeholder="Any other remarks..."
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
        />
      </div>
    </ModalShell>
  );
}

/* ---------------- Items tab table ---------------- */
function ItemsCatalogTab({ rows, onAddNew, onEdit, onDelete }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 6;

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(
      (r) =>
        r.code.toLowerCase().includes(term) ||
        r.name.toLowerCase().includes(term) ||
        r.category.toLowerCase().includes(term) ||
        r.supplier.toLowerCase().includes(term)
    );
  }, [rows, search]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedRows = useMemo(
    () => filteredRows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filteredRows, currentPage]
  );

  const thStyle = {
    textAlign: "left",
    fontSize: 11,
    fontWeight: 700,
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    padding: "10px 16px",
    borderBottom: "1px solid #e5e7eb",
    whiteSpace: "nowrap",
  };

  const tdStyle = { padding: "12px 16px", fontSize: 14, color: "#111827", borderBottom: "1px solid #f3f4f6", verticalAlign: "top" };

  return (
    <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb", overflow: "hidden" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: 16,
          gap: 16,
          background: "#f9fafb",
          borderBottom: "1px solid #e5e7eb",
        }}
      >
        <div style={{ position: "relative", maxWidth: 320, flex: 1 }}>
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#9ca3af", fontSize: 14 }}>
            🔍
          </span>
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search items..."
            style={{ ...inputStyle, paddingLeft: 34, background: "#fff" }}
          />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16, whiteSpace: "nowrap" }}>
          <div style={{ fontSize: 13, color: "#6b7280" }}>{filteredRows.length} items</div>
          <button
            onClick={onAddNew}
            style={{ padding: "10px 16px", borderRadius: 8, border: "none", background: "#2563eb", fontWeight: 600, fontSize: 13, color: "#fff", cursor: "pointer" }}
          >
            + New Item
          </button>
        </div>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={thStyle}>Code</th>
              <th style={thStyle}>Item Name</th>
              <th style={thStyle}>Category</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Quantity</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Min Stock</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Cost</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Sell Price</th>
              <th style={thStyle}>Supplier</th>
              <th style={thStyle}>Date Purchased</th>
              <th style={thStyle} />
            </tr>
          </thead>
          <tbody>
            {paginatedRows.map((item) => (
              <tr key={item.code}>
                <td style={{ ...tdStyle, color: "#2563eb", fontWeight: 700, whiteSpace: "nowrap" }}>{item.code}</td>
                <td style={{ ...tdStyle, fontWeight: 600 }}>{item.name}</td>
                <td style={{ ...tdStyle, color: "#6b7280" }}>{item.category}</td>
                <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700 }}>{item.stock}</td>
                <td style={{ ...tdStyle, textAlign: "right", color: "#9ca3af" }}>{item.min}</td>
                <td style={{ ...tdStyle, textAlign: "right", color: "#059669" }}>₹{item.cost.toLocaleString("en-IN")}</td>
                <td style={{ ...tdStyle, textAlign: "right", color: "#059669" }}>₹{item.sell.toLocaleString("en-IN")}</td>
                <td style={{ ...tdStyle, color: "#6b7280" }}>{item.supplier}</td>
                <td style={{ ...tdStyle, color: "#6b7280", whiteSpace: "nowrap" }}>{item.dateAdded || "—"}</td>
                <td style={tdStyle}>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => onEdit(item)}
                      style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #d1d5db", background: "#fff", fontWeight: 600, fontSize: 12, color: "#111827", cursor: "pointer" }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => onDelete(item)}
                      style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #fecaca", background: "#fee2e2", fontWeight: 600, fontSize: 12, color: "#b91c1c", cursor: "pointer" }}
                    >
                      Del
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredRows.length === 0 && (
              <tr>
                <td colSpan={10} style={{ ...tdStyle, textAlign: "center", color: "#9ca3af", padding: 32 }}>
                  No items match your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {filteredRows.length > PAGE_SIZE && (
        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 12, padding: 16, borderTop: "1px solid #e5e7eb" }}>
          <span style={{ fontSize: 13, color: "#6b7280" }}>
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #d1d5db", background: currentPage === 1 ? "#f3f4f6" : "#fff", fontWeight: 600, fontSize: 12, color: currentPage === 1 ? "#9ca3af" : "#111827", cursor: currentPage === 1 ? "not-allowed" : "pointer" }}
          >
            Prev
          </button>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #d1d5db", background: currentPage === totalPages ? "#f3f4f6" : "#fff", fontWeight: 600, fontSize: 12, color: currentPage === totalPages ? "#9ca3af" : "#111827", cursor: currentPage === totalPages ? "not-allowed" : "pointer" }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

/* ---------------- Add/Edit Supplier Modal ---------------- */
function SupplierModal({ onClose, onSave, initial }) {
  const [name, setName] = useState(initial?.name || "");
  const [contact, setContact] = useState(initial?.contact || "");
  const [city, setCity] = useState(initial?.city || "Chennai");
  const [phone, setPhone] = useState(initial?.phone || "");
  const [email, setEmail] = useState(initial?.email || "");
  const [itemsSupplied, setItemsSupplied] = useState(initial?.itemsSupplied || "");
  const [notes, setNotes] = useState(initial?.notes || "");

  const handleSave = () => {
    if (!name.trim()) {
      alert("Please enter a supplier name.");
      return;
    }
    onSave({
      name: name.trim(),
      contact,
      city,
      phone,
      email,
      itemsSupplied,
      notes,
    });
    onClose();
  };

  return (
    <ModalShell
      title={initial ? "Edit Supplier" : "Add Supplier"}
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose} style={{ padding: "10px 18px", borderRadius: 8, border: "1px solid #d1d5db", background: "#fff", fontWeight: 600, fontSize: 13, color: "#111827", cursor: "pointer" }}>
            Cancel
          </button>
          <button onClick={handleSave} style={{ padding: "10px 18px", borderRadius: 8, border: "none", background: "#2563eb", fontWeight: 600, fontSize: 13, color: "#fff", cursor: "pointer" }}>
            Save
          </button>
        </>
      }
    >
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>SUPPLIER NAME *</label>
        <input style={inputStyle} placeholder="Company name" value={name} onChange={(e) => setName(e.target.value)} />
      </div>

      <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>CONTACT PERSON</label>
          <input style={inputStyle} value={contact} onChange={(e) => setContact(e.target.value)} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>CITY</label>
          <input style={inputStyle} value={city} onChange={(e) => setCity(e.target.value)} />
        </div>
      </div>

      <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>PHONE</label>
          <input style={inputStyle} value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>EMAIL</label>
          <input type="email" style={inputStyle} value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>ITEMS SUPPLIED</label>
        <input style={inputStyle} placeholder="e.g. Laptops, Licenses" value={itemsSupplied} onChange={(e) => setItemsSupplied(e.target.value)} />
      </div>

      <div>
        <label style={labelStyle}>NOTES</label>
        <textarea
          style={{ ...inputStyle, minHeight: 70, resize: "vertical", fontFamily: "inherit" }}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
    </ModalShell>
  );
}

function parseRupeeValue(value) {
  if (!value) return 0;
  return Number(String(value).replace(/[₹,]/g, "")) || 0;
}

// ---- Frontend <-> Backend field mapping helpers ----
function fromBackendItem(r) {
  return {
    id: r.id,
    code: r.code,
    name: r.name,
    category: r.category,
    unit: r.unit,
    stock: Number(r.stock) || 0,
    min: Number(r.min_stock) || 0,
    cost: Number(r.cost) || 0,
    sell: Number(r.sell_price) || 0,
    supplier: r.supplier || "",
    department_id: r.department_id || "",
    department: r.department || "",
    dateAdded: r.date_added ? String(r.date_added).slice(0, 10) : "",
    invoiceNo: r.invoice_no || "",
    remarks: r.remarks || "",
    description: r.description || "",
  };
}
function toBackendItem(item) {
  return {
    code: item.code,
    name: item.name,
    category: item.category,
    unit: item.unit,
    stock: item.stock,
    min_stock: item.min,
    cost: item.cost,
    sell_price: item.sell,
    supplier: item.supplier,
    department_id: item.department_id || null,
    date_added: item.dateAdded || null,
    invoice_no: item.invoiceNo || null,
    remarks: item.remarks || null,
    description: item.description,
  };
}

function fromBackendSupplier(r) {
  return {
    id: r.id,
    name: r.name,
    contact: r.contact_person || "",
    phone: r.phone || "",
    email: r.email || "",
    city: r.city || "",
    itemsSupplied: r.items_supplied || "",
    notes: r.notes || "",
  };
}
function toBackendSupplier(s) {
  return {
    name: s.name,
    contact_person: s.contact,
    phone: s.phone,
    email: s.email,
    city: s.city,
    items_supplied: s.itemsSupplied,
    notes: s.notes,
  };
}

function fromBackendInward(h) {
  return {
    id: h.id,
    ref: h.grn_number,
    date: h.date ? String(h.date).slice(0, 10) : "",
    party: h.supplier_name || "",
    invoiceNo: h.invoice_no || "",
    receivedBy: h.received_by || "",
    notes: h.notes || "",
    value: `₹${Number(h.total_value || 0).toLocaleString("en-IN")}`,
    status: h.status,
    items: (h.items || []).map((it) => ({ item: it.item_name, qty: it.qty, price: it.unit_cost })),
  };
}
function toBackendInward(row, items, suppliers) {
  const supplier = suppliers.find((s) => s.name === row.party);
  return {
    grn_number: row.ref,
    date: row.date,
    supplier_id: supplier ? supplier.id : null,
    invoice_no: row.invoiceNo || null,
    received_by: row.receivedBy || null,
    status: row.status,
    notes: row.notes || null,
    total_value: parseRupeeValue(row.value),
    items: row.items.map((it) => {
      const match = items.find((i) => i.name === it.item);
      return { item_id: match ? match.id : null, item_name: it.item, unit_cost: it.price, qty: it.qty };
    }),
  };
}

function fromBackendOutward(h) {
  return {
    id: h.id,
    ref: h.dn_number,
    date: h.date ? String(h.date).slice(0, 10) : "",
    party: h.customer_name || "",
    orderRef: h.order_ref || "",
    dispatchedBy: h.dispatched_by || "",
    notes: h.notes || "",
    value: `₹${Number(h.total_value || 0).toLocaleString("en-IN")}`,
    status: h.status,
    items: (h.items || []).map((it) => ({ item: it.item_name, qty: it.qty, price: it.unit_price })),
  };
}
function toBackendOutward(row, items) {
  return {
    dn_number: row.ref,
    date: row.date,
    customer_name: row.party,
    order_ref: row.orderRef || null,
    dispatched_by: row.dispatchedBy || null,
    status: row.status,
    notes: row.notes || null,
    total_value: parseRupeeValue(row.value),
    items: row.items.map((it) => {
      const match = items.find((i) => i.name === it.item);
      return { item_id: match ? match.id : null, item_name: it.item, unit_price: it.price, qty: it.qty };
    }),
  };
}

/* ---------------- Suppliers tab table ---------------- */
function SuppliersTab({ rows, inwardRows, onAddNew, onEdit, onDelete }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 6;

  const supplierStats = useMemo(() => {
    const stats = {};
    inwardRows.forEach((r) => {
      if (!stats[r.party]) stats[r.party] = { count: 0, total: 0 };
      stats[r.party].count += 1;
      stats[r.party].total += parseRupeeValue(r.value);
    });
    return stats;
  }, [inwardRows]);

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(
      (r) =>
        r.name.toLowerCase().includes(term) ||
        (r.contact || "").toLowerCase().includes(term) ||
        (r.city || "").toLowerCase().includes(term) ||
        (r.itemsSupplied || "").toLowerCase().includes(term)
    );
  }, [rows, search]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedRows = useMemo(
    () => filteredRows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filteredRows, currentPage]
  );

  const thStyle = {
    textAlign: "left",
    fontSize: 11,
    fontWeight: 700,
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    padding: "10px 16px",
    borderBottom: "1px solid #e5e7eb",
    whiteSpace: "nowrap",
  };

  const tdStyle = { padding: "12px 16px", fontSize: 14, color: "#111827", borderBottom: "1px solid #f3f4f6", verticalAlign: "top" };

  return (
    <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb", overflow: "hidden" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: 16,
          gap: 16,
          background: "#f9fafb",
          borderBottom: "1px solid #e5e7eb",
        }}
      >
        <div style={{ position: "relative", maxWidth: 320, flex: 1 }}>
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#9ca3af", fontSize: 14 }}>
            🔍
          </span>
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search suppliers..."
            style={{ ...inputStyle, paddingLeft: 34, background: "#fff" }}
          />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16, whiteSpace: "nowrap" }}>
          <div style={{ fontSize: 13, color: "#6b7280" }}>{filteredRows.length} suppliers</div>
          <button
            onClick={onAddNew}
            style={{ padding: "10px 16px", borderRadius: 8, border: "none", background: "#2563eb", fontWeight: 600, fontSize: 13, color: "#fff", cursor: "pointer" }}
          >
            + New Supplier
          </button>
        </div>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={thStyle}>Supplier Name</th>
              <th style={thStyle}>Contact</th>
              <th style={thStyle}>Phone</th>
              <th style={thStyle}>Email</th>
              <th style={thStyle}>City</th>
              <th style={thStyle}>Items Supplied</th>
              <th style={{ ...thStyle, textAlign: "right" }}>POs</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Total Spend</th>
              <th style={thStyle}>Notes</th>
              <th style={thStyle} />
            </tr>
          </thead>
         <tbody>
            {paginatedRows.map((s) => {
              const stats = supplierStats[s.name];
              return (
                <tr key={s.name}>
                  <td style={{ ...tdStyle, color: "#2563eb", fontWeight: 700 }}>{s.name}</td>
                  <td style={tdStyle}>{s.contact || "—"}</td>
                  <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>{s.phone || "—"}</td>
                  <td style={tdStyle}>
                    {s.email ? (
                      <a href={`mailto:${s.email}`} style={{ color: "#2563eb" }}>{s.email}</a>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td style={tdStyle}>{s.city || "—"}</td>
                  <td style={tdStyle}>{s.itemsSupplied || "—"}</td>
                  <td style={{ ...tdStyle, textAlign: "right", color: "#2563eb", fontWeight: 700 }}>{stats ? stats.count : "—"}</td>
                  <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700, color: "#059669" }}>
                    {stats ? `₹${stats.total.toLocaleString("en-IN")}` : "–"}
                  </td>
                  <td style={{ ...tdStyle, color: "#6b7280" }}>{s.notes || "—"}</td>
                  <td style={tdStyle}>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={() => onEdit(s)}
                        style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #d1d5db", background: "#fff", fontWeight: 600, fontSize: 12, color: "#111827", cursor: "pointer" }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => onDelete(s)}
                        style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #fecaca", background: "#fee2e2", fontWeight: 600, fontSize: 12, color: "#b91c1c", cursor: "pointer" }}
                      >
                        Del
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filteredRows.length === 0 && (
              <tr>
                <td colSpan={10} style={{ ...tdStyle, textAlign: "center", color: "#9ca3af", padding: 32 }}>
                  No suppliers match your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {filteredRows.length > PAGE_SIZE && (
        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 12, padding: 16, borderTop: "1px solid #e5e7eb" }}>
          <span style={{ fontSize: 13, color: "#6b7280" }}>
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #d1d5db", background: currentPage === 1 ? "#f3f4f6" : "#fff", fontWeight: 600, fontSize: 12, color: currentPage === 1 ? "#9ca3af" : "#111827", cursor: currentPage === 1 ? "not-allowed" : "pointer" }}
          >
            Prev
          </button>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #d1d5db", background: currentPage === totalPages ? "#f3f4f6" : "#fff", fontWeight: 600, fontSize: 12, color: currentPage === totalPages ? "#9ca3af" : "#111827", cursor: currentPage === totalPages ? "not-allowed" : "pointer" }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

/* ---------------- Main component ---------------- */
export default function Inventory() {
  const [activeTab, setActiveTab] = useState("Dashboard");
  const [showInwardModal, setShowInwardModal] = useState(false);
  const [showOutwardModal, setShowOutwardModal] = useState(false);
  const [editingInward, setEditingInward] = useState(null);
  const [editingOutward, setEditingOutward] = useState(null);
  const [inwardRows, setInwardRows] = useState([]);
  const [outwardRows, setOutwardRows] = useState([]);
  const [grnCounter, setGrnCounter] = useState(1);
  const [dnCounter, setDnCounter] = useState(1);

  const [items, setItems] = useState([]);
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);


  const [supplierList, setSupplierList] = useState([]);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [departments, setDepartments] = useState([]);

  useEffect(() => {
    inventoryApi.getItems().then((res) => setItems(res.data.map(fromBackendItem))).catch(console.error);
    inventoryApi.getSuppliers().then((res) => setSupplierList(res.data.map(fromBackendSupplier))).catch(console.error);
    inventoryApi.getInward().then((res) => setInwardRows(res.data.map(fromBackendInward))).catch(console.error);
    inventoryApi.getOutward().then((res) => setOutwardRows(res.data.map(fromBackendOutward))).catch(console.error);
    deptApi.getAll().then((res) => setDepartments(res.data || [])).catch(console.error);
  }, []);

  const totalProcurement = inwardRows.reduce((sum, r) => sum + parseRupeeValue(r.value), 0);
  const totalDispatched = outwardRows.reduce((sum, r) => sum + parseRupeeValue(r.value), 0);
  const activeItems = items.length;
  const nextGrnNum = inwardRows.length
    ? Math.max(...inwardRows.map(r => parseInt(r.ref?.replace('GRN-',''))||0)) + 1 : 1;
  const nextDnNum  = outwardRows.length
    ? Math.max(...outwardRows.map(r => parseInt(r.ref?.replace('DN-',''))||0)) + 1 : 1;
  const nextItemNum = items.length
    ? Math.max(...items.map(it => parseInt(it.code?.replace('ITM-',''))||0)) + 1 : 1;
  const itemOptions = items.map((it) => it.name);
  const supplierOptions = supplierList.map((s) => s.name);
  const pendingInward = inwardRows.filter((r) => r.status === "Pending").length;
  const pendingOutward = outwardRows.filter((r) => r.status === "Pending").length;

  const handleSaveInward = async (newRow) => {
    try {
      const payload = toBackendInward(newRow, items, supplierList);
      if (editingInward && editingInward.id) {
        const res = await inventoryApi.updateInward(editingInward.id, payload);
        setInwardRows((prev) => prev.map((r) => (r.id === editingInward.id ? fromBackendInward(res.data) : r)));
      } else {
        const res = await inventoryApi.createInward(payload);
        setInwardRows((prev) => [fromBackendInward(res.data), ...prev]);
      }
    } catch (err) {
      alert(err?.response?.data?.error || "Failed to save inward entry");
    }
    setEditingInward(null);
  };

  const handleEditInward = (row) => {
    setEditingInward(row);
    setShowInwardModal(true);
  };

  const handleDeleteInward = async (row) => {
    if (!window.confirm(`Delete ${row.ref}? This cannot be undone.`)) return;
    try {
      await inventoryApi.removeInward(row.id);
      setInwardRows((prev) => prev.filter((r) => r.id !== row.id));
    } catch (err) {
      alert(err?.response?.data?.error || "Failed to delete inward entry");
    }
  };

  const handleSaveOutward = async (newRow) => {
    try {
      const payload = toBackendOutward(newRow, items);
      if (editingOutward && editingOutward.id) {
        const res = await inventoryApi.updateOutward(editingOutward.id, payload);
        setOutwardRows((prev) => prev.map((r) => (r.id === editingOutward.id ? fromBackendOutward(res.data) : r)));
      } else {
        const res = await inventoryApi.createOutward(payload);
        setOutwardRows((prev) => [fromBackendOutward(res.data), ...prev]);
      }
    } catch (err) {
      alert(err?.response?.data?.error || "Failed to save outward entry");
    }
    setEditingOutward(null);
  };

  const handleEditOutward = (row) => {
    setEditingOutward(row);
    setShowOutwardModal(true);
  };

  const handleDeleteOutward = async (row) => {
    if (!window.confirm(`Delete ${row.ref}? This cannot be undone.`)) return;
    try {
      await inventoryApi.removeOutward(row.id);
      setOutwardRows((prev) => prev.filter((r) => r.id !== row.id));
    } catch (err) {
      alert(err?.response?.data?.error || "Failed to delete outward entry");
    }
  };

  const handleSaveItem = async (newItem) => {
    try {
      const payload = toBackendItem(newItem);
      if (editingItem && editingItem.id) {
        const res = await inventoryApi.updateItem(editingItem.id, payload);
        setItems((prev) => prev.map((it) => (it.id === editingItem.id ? fromBackendItem(res.data) : it)));
      } else {
        const res = await inventoryApi.createItem(payload);
        setItems((prev) => [...prev, fromBackendItem(res.data)]);
      }
    } catch (err) {
      alert(err?.response?.data?.error || "Failed to save item");
    }
    setEditingItem(null);
  };

  const handleEditItem = (item) => {
    setEditingItem(item);
    setShowItemModal(true);
  };

  const handleDeleteItem = async (item) => {
    if (!window.confirm(`Delete ${item.code} — ${item.name}? This cannot be undone.`)) return;
    try {
      await inventoryApi.removeItem(item.id);
      setItems((prev) => prev.filter((it) => it.id !== item.id));
    } catch (err) {
      alert(err?.response?.data?.error || "Failed to delete item");
    }
  };

  const handleSaveSupplier = async (newSupplier) => {
    try {
      const payload = toBackendSupplier(newSupplier);
      if (editingSupplier && editingSupplier.id) {
        const res = await inventoryApi.updateSupplier(editingSupplier.id, payload);
        setSupplierList((prev) => prev.map((s) => (s.id === editingSupplier.id ? fromBackendSupplier(res.data) : s)));
      } else {
        const res = await inventoryApi.createSupplier(payload);
        setSupplierList((prev) => [...prev, fromBackendSupplier(res.data)]);
      }
    } catch (err) {
      alert(err?.response?.data?.error || "Failed to save supplier");
    }
    setEditingSupplier(null);
  };

  const handleEditSupplier = (supplier) => {
    setEditingSupplier(supplier);
    setShowSupplierModal(true);
  };

  const handleDeleteSupplier = async (supplier) => {
    if (!window.confirm(`Delete ${supplier.name}? This cannot be undone.`)) return;
    try {
      await inventoryApi.removeSupplier(supplier.id);
      setSupplierList((prev) => prev.filter((s) => s.id !== supplier.id));
    } catch (err) {
      alert(err?.response?.data?.error || "Failed to delete supplier");
    }
  };

  const cardStyle = { background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb", padding: "16px 20px", flex: 1, minWidth: 180 };

  const thStyle = {
    textAlign: "left",
    fontSize: 12,
    fontWeight: 700,
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    padding: "10px 16px",
    borderBottom: "1px solid #e5e7eb",
  };

  const tdStyle = { padding: "12px 16px", fontSize: 14, color: "#111827", borderBottom: "1px solid #f3f4f6" };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <div style={{ flexShrink: 0, padding: "16px 0 0", zIndex: 5 }}>
      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "flex-start", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ ...cardStyle, minWidth: 100, textAlign: "center", padding: "10px 16px" }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#059669" }}>₹{(totalProcurement/1000).toFixed(0)}K</div>
            <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 600 }}>Inward</div>
          </div>
          <div style={{ ...cardStyle, minWidth: 100, textAlign: "center", padding: "10px 16px" }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#1d4ed8" }}>₹{(totalDispatched/1000).toFixed(0)}K</div>
            <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 600 }}>Outward</div>
          </div>
          <div style={{ ...cardStyle, minWidth: 80, textAlign: "center", padding: "10px 16px" }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#2563eb" }}>{activeItems}</div>
            <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 600 }}>Items</div>
          </div>
          <button
            onClick={() => {
              setEditingInward(null);
              setShowInwardModal(true);
            }}
            style={{ padding: "10px 16px", borderRadius: 8, border: "1px solid #d1d5db", background: "#fff", fontWeight: 600, fontSize: 13, color: "#111827", cursor: "pointer" }}
          >
            + Inward
          </button>
          <button
            onClick={() => {
              setEditingOutward(null);
              setShowOutwardModal(true);
            }}
            style={{ padding: "10px 16px", borderRadius: 8, border: "1px solid #d1d5db", background: "#fff", fontWeight: 600, fontSize: 13, color: "#111827", cursor: "pointer" }}
          >
            + Outward
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 24, borderBottom: "1px solid #e5e7eb", marginBottom: 20 }}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab;
          const badgeCount = tab === "Inward" ? pendingInward : tab === "Outward" ? pendingOutward : 0;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                background: "none",
                border: "none",
                padding: "0 0 12px",
                fontSize: 14,
                fontWeight: 600,
                color: isActive ? "#2563eb" : "#6b7280",
                borderBottom: isActive ? "2px solid #2563eb" : "2px solid transparent",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {tabLabels[tab] || tab}
              {badgeCount > 0 && (
                <span style={{ background: "#fed7aa", color: "#c2410c", fontSize: 11, fontWeight: 700, borderRadius: 999, padding: "1px 7px" }}>
                  {badgeCount}
                </span>
              )}
            </button>
          );
        })}
      </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "0 0 24px" }}>

      {activeTab === "Dashboard" && (
        <>
          <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
            <div style={{ ...cardStyle, borderTop: "3px solid #10b981" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", letterSpacing: 0.5 }}>TOTAL PROCUREMENT</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: "#111827", margin: "6px 0 2px" }}>₹{totalProcurement.toLocaleString("en-IN")}</div>
              <div style={{ fontSize: 12, color: "#9ca3af" }}>{inwardRows.length} GRNs received</div>
            </div>
            <div style={{ ...cardStyle, borderTop: "3px solid #1d4ed8" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", letterSpacing: 0.5 }}>TOTAL DISPATCHED</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: "#111827", margin: "6px 0 2px" }}>₹{totalDispatched.toLocaleString("en-IN")}</div>
              <div style={{ fontSize: 12, color: "#9ca3af" }}>{outwardRows.length} deliveries done</div>
            </div>
            <div style={{ ...cardStyle, borderTop: "3px solid #2563eb" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", letterSpacing: 0.5 }}>ACTIVE ITEMS</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: "#111827", margin: "6px 0 2px" }}>{activeItems} items</div>
              <div style={{ fontSize: 12, color: "#9ca3af" }}>with stock available</div>
            </div>
            <div style={{ ...cardStyle, borderTop: "3px solid #f97316" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", letterSpacing: 0.5 }}>PENDING</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: "#111827", margin: "6px 0 2px" }}>{pendingInward + pendingOutward} entries</div>
              <div style={{ fontSize: 12, color: "#9ca3af" }}>{pendingInward} inward · {pendingOutward} outward</div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 16 }}>
            {[
              { title: "Recent Inward", rows: inwardRows },
              { title: "Recent Outward", rows: outwardRows },
            ].map(({ title, rows }) => (
              <div key={title} style={{ flex: 1, background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb", overflow: "hidden" }}>
                <div style={{ padding: "16px 20px", borderBottom: "1px solid #e5e7eb" }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>{title}</div>
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Ref</th>
                      <th style={thStyle}>Party</th>
                      <th style={{ ...thStyle, textAlign: "right" }}>Value</th>
                      <th style={thStyle}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={`${r.ref}-${i}`}>
                        <td style={{ ...tdStyle, color: "#2563eb", fontWeight: 700 }}>{r.ref}</td>
                        <td style={{ ...tdStyle, fontWeight: 600 }}>{r.party}</td>
                        <td style={{ ...tdStyle, textAlign: "right" }}>{r.value}</td>
                        <td style={tdStyle}><StatusBadge status={r.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </>
      )}

      {activeTab === "Inward" && (
        <InwardTab rows={inwardRows} onAddNew={() => { setEditingInward(null); setShowInwardModal(true); }} onEdit={handleEditInward} onDelete={handleDeleteInward} />
      )}

      {activeTab === "Outward" && (
        <OutwardTab rows={outwardRows} onAddNew={() => { setEditingOutward(null); setShowOutwardModal(true); }} onEdit={handleEditOutward} onDelete={handleDeleteOutward} />
      )}

      {activeTab === "Items" && (
        <ItemsCatalogTab rows={items} onAddNew={() => { setEditingItem(null); setShowItemModal(true); }} onEdit={handleEditItem} onDelete={handleDeleteItem} />
      )}

      {activeTab === "Suppliers" && (
        <SuppliersTab
          rows={supplierList}
          inwardRows={inwardRows}
          onAddNew={() => { setEditingSupplier(null); setShowSupplierModal(true); }}
          onEdit={handleEditSupplier}
          onDelete={handleDeleteSupplier}
        />
      )}

      {activeTab !== "Dashboard" && activeTab !== "Inward" && activeTab !== "Outward" && activeTab !== "Items" && activeTab !== "Suppliers" && (
        <div style={{ padding: 40, textAlign: "center", color: "#9ca3af", fontSize: 14 }}>
          {activeTab} view coming soon.
        </div>
      )}

      </div>

      {showInwardModal && (
        <InwardModal
          onClose={() => { setShowInwardModal(false); setEditingInward(null); }}
          onSave={handleSaveInward}
          nextGrnNumber={`GRN-${String(nextGrnNum).padStart(4, "0")}`}
          initial={editingInward}
          itemOptions={itemOptions}
          allItems={items}
          supplierOptions={supplierOptions}
        />
      )}

      {showOutwardModal && (
        <OutwardModal
          onClose={() => { setShowOutwardModal(false); setEditingOutward(null); }}
          onSave={handleSaveOutward}
          nextDnNumber={`DN-${String(nextDnNum).padStart(4, "0")}`}
          initial={editingOutward}
          itemOptions={itemOptions}
          allItems={items}
        />
      )}

      {showItemModal && (
        <ItemModal
          onClose={() => { setShowItemModal(false); setEditingItem(null); }}
          onSave={handleSaveItem}
          nextItemCode={`ITM-${String(nextItemNum).padStart(3, "0")}`}
          initial={editingItem}
          supplierOptions={supplierOptions}
          departments={departments}
        />
      )}

      {showSupplierModal && (
        <SupplierModal
          onClose={() => { setShowSupplierModal(false); setEditingSupplier(null); }}
          onSave={handleSaveSupplier}
          initial={editingSupplier}
        />
      )}
    </div>
  );
}