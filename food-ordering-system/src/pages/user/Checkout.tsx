import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar";
import { useCart } from "../../context/CartContext";
import { useAuth } from "../../context/AuthContext";
import { getErrorMessage, placeOrder } from "../../services/api";
import { formatPricePHP } from "../../utils/textHelpers";
import { validatePhoneNumber } from "../../utils/validationHelpers";
import "./Checkout.css";

export default function Checkout() {
  const { customer } = useAuth();
  const { items, total, reloadCart } = useCart();
  const navigate = useNavigate();

  // Pre-fill delivery details from the customer's profile.
  const [name, setName] = useState(customer?.name ?? "");
  const [phone, setPhone] = useState(customer?.phone ?? "");
  const [address, setAddress] = useState(customer?.address ?? "");
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("credit-card");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    setError("");

    const nextFieldErrors: Record<string, string> = {};
    if (name.trim().length < 2) nextFieldErrors.name = "Enter your full name.";
    const phoneCheck = validatePhoneNumber(phone);
    if (!phoneCheck.valid) nextFieldErrors.phone = phoneCheck.error ?? "Enter a valid phone number.";
    if (address.trim().length < 10) nextFieldErrors.address = "Enter a complete delivery address.";

    setFieldErrors(nextFieldErrors);
    if (Object.keys(nextFieldErrors).length > 0) {
      setError("Please check the highlighted delivery details.");
      return;
    }
    if (items.length === 0) {
      setError("Your cart is empty.");
      return;
    }

    setLoading(true);
    try {
      // The server looks up prices and stock itself; we only send ids and quantities.
      const order = await placeOrder({
        customerName: name.trim(),
        customerPhone: phone.trim(),
        customerAddress: address.trim(),
        items: items.map(({ id, quantity }) => ({ id, quantity })),
        paymentMethod,
        deliveryNotes: notes.trim(),
      });
      void reloadCart();
      navigate("/order-confirmation", { state: { order }, replace: true });
    } catch (err) {
      setError(getErrorMessage(err, "Failed to place order."));
      void reloadCart();
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar title="CHECKOUT" showNavLinks={true} />
      <div className="checkout-container">
        <div className="checkout-content">
          <h1 className="checkout-title">Checkout</h1>

          <div className="checkout-grid">
            {/* Form Section */}
            <div className="checkout-form-section">
              <h2>Delivery Information</h2>

              <div className="form-section-group">
                <h3 className="form-section-title">Customer Details</h3>
                <p className="form-section-helper">
                  Use the name and mobile number the rider can confirm on
                  delivery.
                </p>
                <div className="checkout-form-group">
                  <label htmlFor="checkout-name">Full Name *</label>
                  <input
                    id="checkout-name"
                    type="text"
                    placeholder="Juan Dela Cruz"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={loading}
                    autoComplete="name"
                    aria-invalid={!!fieldErrors.name}
                  />
                  {fieldErrors.name && (
                    <p className="field-error">{fieldErrors.name}</p>
                  )}
                </div>

                <div className="checkout-form-group">
                  <label htmlFor="checkout-phone">Mobile Number *</label>
                  <input
                    id="checkout-phone"
                    type="tel"
                    placeholder="0917 123 4567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={loading}
                    autoComplete="tel"
                    inputMode="tel"
                    aria-invalid={!!fieldErrors.phone}
                  />
                  {fieldErrors.phone && (
                    <p className="field-error">{fieldErrors.phone}</p>
                  )}
                </div>
              </div>

              <div className="form-section-group">
                <h3 className="form-section-title">Delivery Address</h3>
                <p className="form-section-helper">
                  Include house number, street, barangay, city, and any nearby
                  landmark.
                </p>
                <div className="checkout-form-group">
                  <label htmlFor="checkout-address">Complete Address *</label>
                  <textarea
                    id="checkout-address"
                    placeholder="House / unit no., street, barangay, city"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    disabled={loading}
                    rows={3}
                    autoComplete="street-address"
                    aria-invalid={!!fieldErrors.address}
                  />
                  {fieldErrors.address && (
                    <p className="field-error">{fieldErrors.address}</p>
                  )}
                </div>

                <div className="checkout-form-group">
                  <label htmlFor="checkout-notes">
                    Delivery Notes (Optional)
                  </label>
                  <textarea
                    id="checkout-notes"
                    placeholder="Gate code, landmark, or food preparation request"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    disabled={loading}
                    rows={2}
                  />
                </div>
              </div>

              <div className="form-section-group">
                <h3 className="form-section-title">Payment</h3>
                <div className="checkout-form-group">
                  <label htmlFor="checkout-payment">Payment Method *</label>
                  <select
                    id="checkout-payment"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    disabled={loading}
                  >
                    <option value="credit-card">Credit Card</option>
                    <option value="debit-card">Debit Card</option>
                    <option value="cash">Cash on Delivery</option>
                  </select>
                </div>
              </div>

              {error && <div className="checkout-error">{error}</div>}

              <button
                onClick={handleCheckout}
                disabled={loading || items.length === 0}
                className="checkout-btn"
              >
                {loading ? "Placing Order..." : "Place Order"}
              </button>
            </div>

            {/* Summary Section */}
            <div className="checkout-summary-section">
              <h2>Order Summary</h2>

              <div className="summary-items">
                {items.length === 0 ? (
                  <p className="summary-empty">Your cart is empty</p>
                ) : (
                  <>
                    {items.map((item) => (
                      <div key={item.id} className="summary-item">
                        <div className="summary-item-info">
                          <h4>{item.name}</h4>
                          <p>Qty: {item.quantity}</p>
                        </div>
                        <div className="summary-item-price">
                          {formatPricePHP(item.price * item.quantity)}
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>

              <div className="summary-divider"></div>

              <div className="summary-total">
                <div className="summary-row">
                  <span>Subtotal:</span>
                  <span>{formatPricePHP(total)}</span>
                </div>
                <div className="summary-row">
                  <span>Delivery:</span>
                  <span>Free</span>
                </div>
                <div className="summary-row summary-row-total">
                  <span>Total:</span>
                  <span>{formatPricePHP(total)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
