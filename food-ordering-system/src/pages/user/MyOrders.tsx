import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar";
import BgFood from "../../components/BgFood";
import { addReview, getErrorMessage, getOrders, getReviews } from "../../services/api";
import type { Order, OrderItem, Review } from "../../types";
import { findItemReview, sortNewestFirst } from "../../utils/orderHelpers";
import { formatPricePHP } from "../../utils/textHelpers";
import "./MyOrders.css";

const ORDER_STATUSES = ["All", "Pending", "Preparing", "Ready", "Delivered", "Cancelled"];
const REFRESH_INTERVAL_MS = 5000;
const MAX_REVIEW_LENGTH = 180;

const STATUS_COLORS: Record<string, string> = {
  Pending: "#FFC107",
  Preparing: "#2196F3",
  Ready: "#4CAF50",
  Delivered: "#4CAF50",
  Cancelled: "#F44336",
};

const formatDate = (value?: string) =>
  value ? new Date(value).toLocaleDateString() : "No date available";
const displayValue = (value?: string) => value || "Not provided";

type OrderModalMode = "details" | "reviews";

const isOrderFullyReviewed = (reviews: Review[], order: Order) =>
  order.status === "Delivered" &&
  order.items.length > 0 &&
  order.items.every((item) => findItemReview(reviews, order.id, item.id));

const renderStars = (rating: number) => {
  const stars = Math.max(0, Math.min(5, Math.round(rating)));
  return `${"★".repeat(stars)}${"☆".repeat(5 - stars)}`;
};

export default function MyOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const selectedOrder = orders.find((order) => order.id === selectedOrderId);
  const [selectedOrderMode, setSelectedOrderMode] = useState<OrderModalMode>("details");
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reloadKey, setReloadKey] = useState(0);
  const navigate = useNavigate();
  const previousStatusRef = useRef<Record<string, string>>({});

  useEffect(() => {
    if (!toastMessage) return;
    const t = window.setTimeout(() => setToastMessage(null), 3500);
    return () => window.clearTimeout(t);
  }, [toastMessage]);

  // Load orders and reviews, then poll orders so status changes show up.
  useEffect(() => {
    let cancelled = false;

    const loadOrders = async () => {
      try {
        // The server only returns this customer's own orders.
        const data = await getOrders();
        if (cancelled) return;

        const previous = previousStatusRef.current;
        const changed = data.find((o) => previous[o.id] && previous[o.id] !== o.status);
        if (changed) setToastMessage(`Order ${changed.id.slice(0, 8)} is now ${changed.status}.`);
        previousStatusRef.current = Object.fromEntries(data.map((o) => [o.id, o.status]));

        setOrders(data);
        setError("");
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err, "Failed to load your orders."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadOrders();
    getReviews()
      .then((data) => !cancelled && setReviews(data))
      .catch(() => {});
    const interval = window.setInterval(loadOrders, REFRESH_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [reloadKey]);

  const filteredOrders = useMemo(() => {
    let filtered = orders;

    // Search by ordered item name
    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      filtered = filtered.filter((order) =>
        order.items.some((item) => item.name.toLowerCase().includes(query)),
      );
    }

    // Status filter
    if (selectedStatus !== "All") {
      filtered = filtered.filter((order) => order.status === selectedStatus);
    }

    return sortNewestFirst(filtered);
  }, [orders, searchQuery, selectedStatus]);

  const openOrderModal = (order: Order, mode: OrderModalMode) => {
    setSelectedOrderId(order.id);
    setSelectedOrderMode(mode);
  };

  const handleReviewSaved = (review: Review) => {
    setReviews((prev) => [...prev, review]);
  };

  const statusBadgeColor = (status: string) => STATUS_COLORS[status] ?? "#999";

  return (
    <>
      <Navbar title="MY ORDERS" showNavLinks={true} />
      <div className="my-orders-container">
        <BgFood />
        <div className="my-orders-content">
          {toastMessage && (
            <div
              style={{
                marginBottom: 12,
                padding: "10px 14px",
                borderRadius: 10,
                background: "#e8f5e9",
                color: "#2e7d32",
                fontWeight: 600,
              }}
            >
              {toastMessage}
            </div>
          )}
          <h1 className="my-orders-title">My Orders</h1>

          {/* Search and Filter */}
          <div className="my-orders-controls">
            <input
              type="text"
              placeholder="Search by item name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="my-orders-search"
            />
          </div>

          {/* Status Filter Tabs */}
          <div className="my-orders-filters">
            {ORDER_STATUSES.map((status) => {
              const count = orders.filter((o) =>
                status === "All" ? true : o.status === status,
              ).length;
              return (
                <button
                  key={status}
                  className={`filter-tab ${selectedStatus === status ? "active" : ""}`}
                  onClick={() => setSelectedStatus(status)}
                >
                  {status}
                  {count > 0 && <span className="filter-count">({count})</span>}
                </button>
              );
            })}
          </div>

          {/* Orders List */}
          {loading ? (
            <div
              style={{ textAlign: "center", padding: "40px", color: "#666" }}
            >
              <p>Loading your orders...</p>
            </div>
          ) : error ? (
            <div className="my-orders-empty">
              <h2>Couldn’t load orders</h2>
              <p>{error}</p>
              <button
                onClick={() => {
                  setLoading(true);
                  setReloadKey((key) => key + 1);
                }}
                className="my-orders-action-btn"
              >
                Try Again
              </button>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="my-orders-empty">
              <h2>No orders found</h2>
              <p>Your orders will appear here after checkout.</p>
              <button
                onClick={() => navigate("/menu")}
                className="my-orders-action-btn"
              >
                Start Ordering
              </button>
            </div>
          ) : (
            <div className="my-orders-list">
              {filteredOrders.map((order) => {
                const orderItems = order.items;
                const canReviewOrder =
                  order.status === "Delivered" &&
                  orderItems.length > 0 &&
                  !isOrderFullyReviewed(reviews, order);

                return (
                  <div key={order.id} className="my-orders-card">
                    <div className="order-card-header">
                      <div className="order-card-id">
                        <h3>{displayValue(order.id)}</h3>
                        <span
                          style={{
                            color: statusBadgeColor(order.status),
                            fontWeight: "600",
                          }}
                        >
                          {displayValue(order.status)}
                        </span>
                      </div>
                      <div className="order-card-meta">
                        <p className="order-date">
                          {formatDate(order.createdAt)}
                        </p>
                        <p className="order-total">
                          {formatPricePHP(order.total)}
                        </p>
                      </div>
                    </div>

                    <div className="order-card-details">
                      <p>
                        <span>Deliver to:</span>{" "}
                        {displayValue(order.customerAddress)}
                      </p>
                      <p>
                        <span>Payment:</span>{" "}
                        {order.paymentMethod === "gcash"
                          ? "GCash"
                          : order.paymentMethod === "maya"
                            ? "Maya"
                            : displayValue(order.paymentMethod?.replace("-", " "))}
                      </p>
                    </div>

                    <div className="order-card-items">
                      <p className="order-items-count">
                        {orderItems.length} item
                        {orderItems.length !== 1 ? "s" : ""}
                      </p>
                      <div className="order-items-preview">
                        {orderItems.length === 0 ? (
                          <span className="item-tag muted">
                            No item details
                          </span>
                        ) : (
                          <>
                            {orderItems.slice(0, 2).map((item, idx) => (
                              <span key={idx} className="item-tag">
                                {displayValue(item.name)} x{item.quantity}
                              </span>
                            ))}
                            {orderItems.length > 2 && (
                              <span className="item-tag">
                                +{orderItems.length - 2} more
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    <div className="order-card-actions">
                      {canReviewOrder && (
                        <button
                          onClick={() => openOrderModal(order, "reviews")}
                          className="order-review-btn"
                        >
                          Review Items
                        </button>
                      )}
                      <button
                        onClick={() => openOrderModal(order, "details")}
                        className="order-view-btn"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          mode={selectedOrderMode}
          reviews={reviews}
          onReviewSaved={handleReviewSaved}
          onClose={() => setSelectedOrderId(null)}
        />
      )}
    </>
  );
}

function OrderDetailsModal({
  order,
  mode,
  reviews,
  onReviewSaved,
  onClose,
}: {
  order: Order;
  mode: OrderModalMode;
  reviews: Review[];
  onReviewSaved: (review: Review) => void;
  onClose: () => void;
}) {
  const [reviewingItem, setReviewingItem] = useState<OrderItem | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [reviewSuccess, setReviewSuccess] = useState("");
  const orderItems = order.items;
  const canReview = order.status === "Delivered";
  const isReviewMode = mode === "reviews";

  useEffect(() => {
    const body = document.body;
    const previousOverflow = body.style.overflow;
    const previousPaddingRight = body.style.paddingRight;
    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;

    body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPaddingRight;
    };
  }, []);

  const findExistingReview = (item: OrderItem) =>
    findItemReview(reviews, order.id, item.id);

  const startReview = (item: OrderItem) => {
    if (findExistingReview(item)) {
      setReviewSuccess("This item has already been reviewed.");
      return;
    }

    setReviewingItem(item);
    setRating(5);
    setComment("");
    setReviewError("");
    setReviewSuccess("");
  };

  const closeReview = () => {
    setReviewingItem(null);
    setReviewError("");
  };

  const handleSubmitReview = async () => {
    if (!reviewingItem) return;

    const cleanComment = comment.trim();
    if (!cleanComment) {
      setReviewError("Please write a short review comment.");
      return;
    }

    if (cleanComment.length > MAX_REVIEW_LENGTH) {
      setReviewError(`Please keep your review under ${MAX_REVIEW_LENGTH} characters.`);
      return;
    }

    setReviewLoading(true);
    setReviewError("");
    try {
      if (findExistingReview(reviewingItem)) {
        setReviewingItem(null);
        setReviewSuccess("This item has already been reviewed.");
        return;
      }

      const createdReview = await addReview({
        orderId: order.id,
        foodItemId: reviewingItem.id,
        rating,
        comment: cleanComment,
      });
      onReviewSaved(createdReview);
      setReviewSuccess("Thanks! Your review was submitted.");

      setReviewingItem(null);
      setComment("");
      setRating(5);
    } catch (err) {
      setReviewError(getErrorMessage(err, "Failed to save review."));
    } finally {
      setReviewLoading(false);
    }
  };

  return (
    <>
      <div className="modal-overlay" onClick={onClose}></div>
      <div className="order-details-modal">
        <div className="modal-header">
          <h2>{isReviewMode ? "Review Items" : "Order Details"}</h2>
          <button onClick={onClose} className="modal-close">
            X
          </button>
        </div>

        <div className="modal-content">
          {!isReviewMode && (
            <>
              <div className="detail-section">
                <h3>Order Information</h3>
                <div className="detail-row">
                  <span>Order ID:</span>
                  <span className="detail-value">{displayValue(order.id)}</span>
                </div>
                <div className="detail-row">
                  <span>Status:</span>
                  <span className="detail-value">
                    {displayValue(order.status)}
                  </span>
                </div>
                <div className="detail-row">
                  <span>Date:</span>
                  <span className="detail-value">
                    {formatDate(order.createdAt)}
                  </span>
                </div>
              </div>

              <div className="detail-section">
                <h3>Delivery Information</h3>
                <div className="detail-row">
                  <span>Name:</span>
                  <span>{displayValue(order.customerName)}</span>
                </div>
                <div className="detail-row">
                  <span>Phone:</span>
                  <span>{displayValue(order.customerPhone)}</span>
                </div>
                <div className="detail-row">
                  <span>Address:</span>
                  <span>{displayValue(order.customerAddress)}</span>
                </div>
              </div>
            </>
          )}

          <div className="detail-section">
            <h3>{isReviewMode ? "Item Reviews" : "Items Ordered"}</h3>
            {orderItems.length === 0 ? (
              <p className="detail-placeholder">No item details available.</p>
            ) : (
              orderItems.map((item, idx) => {
                const existingReview = findExistingReview(item);
                const reviewRating = existingReview?.rating ?? 0;
                const reviewComment = existingReview?.comment.trim() ?? "";

                return (
                  <div
                    key={idx}
                    className={`order-item ${isReviewMode ? "review-only-item" : ""}`}
                  >
                    <div className="item-info">
                      <h4>{displayValue(item.name)}</h4>
                      {!isReviewMode && (
                        <p>
                          Qty: {item.quantity} x {formatPricePHP(item.price)}
                        </p>
                      )}
                      {existingReview ? (
                        <div className="submitted-review">
                          <span className="review-status-pill">Reviewed</span>
                          <p className="submitted-review-rating">
                            {renderStars(reviewRating)}{" "}
                            <span>{reviewRating}/5</span>
                          </p>
                          <p className="submitted-review-comment">
                            {reviewComment || "No comment provided."}
                          </p>
                        </div>
                      ) : canReview ? (
                        <button
                          type="button"
                          className="item-review-btn"
                          onClick={() => startReview(item)}
                        >
                          Write a Review
                        </button>
                      ) : (
                        <p className="review-unavailable">
                          Reviews open after delivery.
                        </p>
                      )}
                    </div>
                    {!isReviewMode && (
                      <span className="item-subtotal">
                        {formatPricePHP(item.price * item.quantity)}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {reviewSuccess && (
            <p className="review-success-message">{reviewSuccess}</p>
          )}

          {reviewingItem && (
            <div className="review-form-panel">
              <div className="review-form-header">
                <div>
                  <p>{displayValue(reviewingItem.name)}</p>
                  <h3>Write Review</h3>
                </div>
                <button type="button" onClick={closeReview}>
                  X
                </button>
              </div>

              <div className="star-rating-control" aria-label="Select rating">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    className={star <= rating ? "star active" : "star"}
                    onClick={() => setRating(star)}
                    aria-label={`${star} star${star === 1 ? "" : "s"}`}
                  >
                    ★
                  </button>
                ))}
              </div>

              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                maxLength={180}
                placeholder="Write a short review..."
                className="review-comment-input"
              />

              <div className="review-form-footer">
                <span>{comment.trim().length}/180</span>
                <button
                  type="button"
                  className="submit-review-btn"
                  onClick={handleSubmitReview}
                  disabled={reviewLoading}
                >
                  {reviewLoading ? "Submitting..." : "Submit Review"}
                </button>
              </div>
              {reviewError && <p className="review-error">{reviewError}</p>}
            </div>
          )}

          {!isReviewMode && (
            <>
              <div className="detail-section">
                <h3>Summary</h3>
                <div className="detail-row">
                  <span>Subtotal:</span>
                  <span>{formatPricePHP(order.subtotal)}</span>
                </div>
                <div className="detail-row total-row">
                  <span>Total:</span>
                  <span>{formatPricePHP(order.total)}</span>
                </div>
              </div>

              <div className="detail-section">
                <h3>Payment</h3>
                <div className="detail-row">
                  <span>Method:</span>
                  <span className="capitalize">
                    {displayValue(order.paymentMethod?.replace("-", " "))}
                  </span>
                </div>
              </div>

              {order.deliveryNotes && (
                <div className="detail-section">
                  <h3>Special Instructions</h3>
                  <p>{order.deliveryNotes}</p>
                </div>
              )}

            </>
          )}
        </div>
      </div>
    </>
  );
}
