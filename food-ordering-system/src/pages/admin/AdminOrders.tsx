import { useEffect, useState, useMemo } from "react";
import AdminSidebar from "../../components/admin/AdminSidebar";
import AdminHeader from "../../components/admin/AdminHeader";
import AdminModal from "../../components/admin/AdminModal";
import ConfirmDialog from "../../components/admin/ConfirmDialog";
import LoadingSpinner from "../../components/admin/LoadingSpinner";
import Pagination from "../../components/Pagination";
import { useAdmin } from "../../context/AdminContext";
import { getErrorMessage } from "../../services/api";
import type { Order, OrderStatus } from "../../types";
import { formatOrderNumber, getOrderTime, matchesOrderNumber, sortNewestFirst } from "../../utils/orderHelpers";
import { formatPricePHP } from "../../utils/textHelpers";
import { usePagination } from "../../utils/usePagination";
import "./AdminOrders.css";

type FilterStatus = OrderStatus | "All";

const PAGE_SIZE = 10;
const FALLBACK_TEXT = "Not provided";

function displayValue(value?: string) {
  return value?.trim() || FALLBACK_TEXT;
}

function getOrderItemsPreview(order: Order) {
  if (!order.items.length) return "Item details unavailable";

  return order.items
    .slice(0, 2)
    .map((item) => `${item.name || "Unnamed item"} x${item.quantity || 0}`)
    .join(", ");
}

export default function AdminOrders() {
  const {
    orders,
    fetchOrders,
    updateOrderStatus,
    cancelOrder,
    loading,
    error,
    setError,
  } = useAdmin();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("All");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    orderId?: string;
  }>({ isOpen: false });
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Debounce search input to avoid heavy filtering on every keystroke
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearchQuery(searchQuery.trim());
    }, 250);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  // ==================== FILTERING ====================
  const filteredOrders = useMemo(() => {
    return sortNewestFirst(
      orders
        .filter((order) => {
          const query = debouncedSearchQuery.toLowerCase();
          const itemText = order.items
            .map((item) => item.name)
            .join(" ")
            .toLowerCase();
          const matchesSearch =
            !query ||
            matchesOrderNumber(order, query) ||
            order.id.toLowerCase().includes(query) ||
            order.customerName.toLowerCase().includes(query) ||
            order.customerEmail.toLowerCase().includes(query) ||
            itemText.includes(query);

          const matchesStatus =
            filterStatus === "All" || order.status === filterStatus;

          return matchesSearch && matchesStatus;
        }),
    );
  }, [orders, debouncedSearchQuery, filterStatus]);

  const pagination = usePagination(
    filteredOrders,
    PAGE_SIZE,
    JSON.stringify([debouncedSearchQuery, filterStatus]),
  );

  // ==================== HANDLERS ====================
  const handleOpenDetails = (order: Order) => {
    setSelectedOrder(order);
    setIsDetailsOpen(true);
  };

  const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      setActionLoading(true);
      setError(null);
      const updatedOrder = await updateOrderStatus(orderId, newStatus);
      setSelectedOrder(updatedOrder);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to update order status."));
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelOrder = (orderId: string) => {
    setConfirmDialog({
      isOpen: true,
      orderId,
    });
  };

  const handleConfirmAction = async () => {
    if (!confirmDialog.orderId) return;

    try {
      setActionLoading(true);
      setError(null);
      await cancelOrder(confirmDialog.orderId);
      if (selectedOrder?.id === confirmDialog.orderId) {
        setIsDetailsOpen(false);
      }
      setConfirmDialog({ isOpen: false });
    } catch (err) {
      setError(getErrorMessage(err, "Failed to cancel order."));
    } finally {
      setActionLoading(false);
    }
  };

  const statusTabs: FilterStatus[] = [
    "All",
    "Pending",
    "Preparing",
    "Ready",
    "Delivered",
    "Cancelled",
  ];

  return (
    <div className="admin-layout">
      <AdminSidebar />
      <div className="admin-content">
        <AdminHeader
          title="Orders Management"
          subtitle="Manage and track all customer orders"
        />

        {error && <div className="admin-error-banner">{error}</div>}

        {/* ==================== SEARCH BAR ==================== */}
        <div className="orders-search-bar">
          <div className="admin-search-control">
            <input
              type="text"
              placeholder="Search by order no. (e.g. 0-01) or customer name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="admin-search-input"
            />
            <button
              type="button"
              className="admin-search-button"
              aria-label="Search orders"
            />
          </div>
        </div>

        {/* ==================== STATUS TABS ==================== */}
        <div className="status-tabs">
          {statusTabs.map((status) => (
            <button
              key={status}
              className={`tab ${filterStatus === status ? "active" : ""}`}
              onClick={() => setFilterStatus(status)}
            >
              {status}
              <span className="tab-count">
                {status === "All"
                  ? orders.length
                  : orders.filter((o) => o.status === status).length}
              </span>
            </button>
          ))}
        </div>

        {/* ==================== ORDERS TABLE ==================== */}
        {loading ? (
          <div className="loading-container">
            <LoadingSpinner />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="empty-state-container">
            <p className="empty-state">No orders found</p>
          </div>
        ) : (
          <div className="orders-table-container">
            <table className="orders-table">
              <thead>
                <tr>
                  <th>Order No.</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Date/Time</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagination.pageItems.map((order) => (
                  <tr key={order.id}>
                    <td className="order-id">
                      {formatOrderNumber(order)}
                      {/* Full ID stays visible to admins for tracking; customers only see the short number. */}
                      <span className="order-full-id" title={order.id}>
                        {order.id}
                      </span>
                    </td>
                    <td>
                      <div className="customer-info">
                        <div>{displayValue(order.customerName)}</div>
                        <div className="customer-email">
                          {displayValue(order.customerEmail)}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="order-items-summary">
                        <span>{getOrderItemsPreview(order)}</span>
                        {order.items.length > 2 && (
                          <span className="order-items-more">
                            +{order.items.length - 2} more
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="order-total">{formatPricePHP(order.total)}</td>
                    <td>
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="order-datetime">
                      {getOrderTime(order) ? (
                        <>
                          {new Date(order.createdAt).toLocaleDateString()} <br />
                          {new Date(order.createdAt).toLocaleTimeString()}
                        </>
                      ) : (
                        FALLBACK_TEXT
                      )}
                    </td>
                    <td>
                      <button
                        className="action-btn view-btn"
                        onClick={() => handleOpenDetails(order)}
                        title="View Details"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {pagination.totalPages > 1 && (
              <div className="orders-pagination">
                <Pagination
                  page={pagination.page}
                  totalPages={pagination.totalPages}
                  onPageChange={pagination.setPage}
                  firstItem={pagination.firstItem}
                  lastItem={pagination.lastItem}
                  totalItems={pagination.totalItems}
                  itemLabel="orders"
                />
              </div>
            )}
          </div>
        )}

        {/* ==================== ORDER DETAILS MODAL ==================== */}
        {selectedOrder && (
          <AdminModal
            isOpen={isDetailsOpen}
            title={`Order ${formatOrderNumber(selectedOrder)}`}
            onClose={() => setIsDetailsOpen(false)}
            size="large"
          >
            <div className="order-details">
              <div className="details-section">
                <h3>Order Reference</h3>
                <div className="details-grid">
                  <div className="detail-item">
                    <label>Order No.</label>
                    <p>{formatOrderNumber(selectedOrder)}</p>
                  </div>
                  <div className="detail-item">
                    <label>Full Order ID</label>
                    <p className="order-full-id-detail">{selectedOrder.id}</p>
                  </div>
                </div>
              </div>

              <div className="details-section">
                <h3>Customer Information</h3>
                <div className="details-grid">
                  <div className="detail-item">
                    <label>Name</label>
                    <p>{displayValue(selectedOrder.customerName)}</p>
                  </div>
                  <div className="detail-item">
                    <label>Email</label>
                    <p>{displayValue(selectedOrder.customerEmail)}</p>
                  </div>
                  <div className="detail-item">
                    <label>Phone</label>
                    <p>{displayValue(selectedOrder.customerPhone)}</p>
                  </div>
                  <div className="detail-item">
                    <label>Address</label>
                    <p>{displayValue(selectedOrder.customerAddress)}</p>
                  </div>
                </div>
              </div>

              <div className="details-section">
                <h3>Order Items</h3>
                <div className="items-list">
                  {selectedOrder.items.length === 0 ? (
                    <p className="items-unavailable">
                      Item details unavailable
                    </p>
                  ) : (
                    selectedOrder.items.map((item, index) => (
                      <div
                        key={item.id || `${selectedOrder.id}-${index}`}
                        className="order-item-detail"
                      >
                        <div className="item-name-qty">
                          <span className="item-name">
                            {item.name || "Unnamed item"}
                          </span>
                          <span className="item-qty">x{item.quantity || 0}</span>
                        </div>
                        <div className="item-prices">
                          <span className="item-subtotal">
                            {formatPricePHP(item.price * item.quantity)}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="details-section">
                <h3>Order Summary</h3>
                <div className="summary-items">
                  <div className="summary-row total">
                    <span>Total</span>
                    <span>{formatPricePHP(selectedOrder.total)}</span>
                  </div>
                </div>
              </div>

              <div className="details-section">
                <h3>Order Status</h3>
                <div className="status-info">
                  <div className="status-current">
                    <label>Current Status</label>
                    <StatusBadge status={selectedOrder.status} />
                  </div>
                  <div className="status-datetime">
                    <label>Created</label>
                    <p>
                      {getOrderTime(selectedOrder)
                        ? new Date(selectedOrder.createdAt).toLocaleString()
                        : FALLBACK_TEXT}
                    </p>
                  </div>
                  <div className="status-datetime">
                    <label>Updated</label>
                    <p>
                      {selectedOrder.updatedAt
                        ? new Date(selectedOrder.updatedAt).toLocaleString()
                        : FALLBACK_TEXT}
                    </p>
                  </div>
                </div>
              </div>

              {selectedOrder.paymentMethod && (
                <div className="details-section">
                  <h3>Payment & Delivery</h3>
                  <div className="payment-info">
                    <div className="info-row">
                      <label>Payment Method</label>
                      <p>
                        {selectedOrder.paymentMethod === "gcash"
                          ? "GCash"
                          : selectedOrder.paymentMethod === "maya"
                            ? "Maya"
                            : displayValue(selectedOrder.paymentMethod)}
                      </p>
                    </div>
                    {selectedOrder.deliveryNotes && (
                      <div className="info-row">
                        <label>Delivery Notes</label>
                        <p>{selectedOrder.deliveryNotes}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ==================== ACTION BUTTONS ==================== */}
              <div className="details-actions">
                {selectedOrder.status === "Pending" && (
                  <>
                    <button
                      type="button"
                      className="action-btn primary-btn"
                      disabled={actionLoading}
                      onClick={() =>
                        handleUpdateStatus(selectedOrder.id, "Preparing")
                      }
                    >
                      Start Preparing
                    </button>
                  </>
                )}

                {selectedOrder.status === "Preparing" && (
                  <>
                    <button
                      type="button"
                      className="action-btn primary-btn"
                      disabled={actionLoading}
                      onClick={() =>
                        handleUpdateStatus(selectedOrder.id, "Ready")
                      }
                    >
                      Ready for Pickup
                    </button>
                  </>
                )}

                {selectedOrder.status === "Ready" && (
                  <>
                    <button
                      type="button"
                      className="action-btn primary-btn"
                      disabled={actionLoading}
                      onClick={() =>
                        handleUpdateStatus(selectedOrder.id, "Delivered")
                      }
                    >
                      Mark Delivered
                    </button>
                  </>
                )}

                {(selectedOrder.status === "Pending" ||
                  selectedOrder.status === "Preparing") && (
                  <>
                    <button
                      type="button"
                      className="action-btn danger-btn"
                      disabled={actionLoading}
                      onClick={() => handleCancelOrder(selectedOrder.id)}
                    >
                      Cancel Order
                    </button>
                  </>
                )}

                {selectedOrder.status === "Cancelled" && (
                  <p className="info-text">This order has been cancelled</p>
                )}
              </div>
            </div>
          </AdminModal>
        )}

        {/* ==================== CONFIRM DIALOG ==================== */}
        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          title="Cancel Order?"
          message="Are you sure you want to cancel this order? This action cannot be undone."
          confirmText="Cancel Order"
          isDangerous
          onConfirm={handleConfirmAction}
          onCancel={() => setConfirmDialog({ isOpen: false })}
          isLoading={actionLoading}
        />
      </div>
    </div>
  );
}

// ==================== STATUS BADGE ====================
function StatusBadge({ status }: { status: string }) {
  const normalizedStatus = String(status || "").toLowerCase();
  const statusClass =
    {
      pending: "badge-pending",
      preparing: "badge-preparing",
      ready: "badge-ready",
      delivered: "badge-delivered",
      cancelled: "badge-cancelled",
      canceled: "badge-cancelled",
    }[normalizedStatus] || "badge-default";

  return <span className={`status-badge ${statusClass}`}>{status}</span>;
}
