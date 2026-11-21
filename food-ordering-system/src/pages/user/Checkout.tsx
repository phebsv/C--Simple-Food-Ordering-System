import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar";
import { useCart } from "../../context/CartContext";
import { useAuth } from "../../context/AuthContext";
import { getErrorMessage, placeOrder } from "../../services/api";
import { formatPricePHP } from "../../utils/textHelpers";
import { validateName, validatePhoneNumber } from "../../utils/validationHelpers";
import "./Checkout.css";

type WalletProvider = "gcash" | "maya";
type CardPaymentMethod = "credit-card" | "debit-card";

export default function Checkout() {
  const { customer } = useAuth();
  const { items, total, reloadCart } = useCart();
  const navigate = useNavigate();

  // Pre-fill delivery details from the customer's profile.
  const [name, setName] = useState(customer?.name ?? "");
  const [phone, setPhone] = useState(customer?.phone ?? "");
  const [address, setAddress] = useState(customer?.address ?? "");
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [walletModalProvider, setWalletModalProvider] = useState<WalletProvider | null>(null);
  const [previousPaymentMethod, setPreviousPaymentMethod] = useState("");
  const [walletName, setWalletName] = useState("");
  const [walletPhone, setWalletPhone] = useState("");
  const [walletConfirmedFor, setWalletConfirmedFor] = useState<WalletProvider | null>(null);
  const [walletFieldErrors, setWalletFieldErrors] = useState<Record<string, string>>({});
  const [cardModalMethod, setCardModalMethod] = useState<CardPaymentMethod | null>(null);
  const [cardholderName, setCardholderName] = useState("");
  const [cardBank, setCardBank] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardSecurityCode, setCardSecurityCode] = useState("");
  const [cardConfirmedFor, setCardConfirmedFor] = useState<CardPaymentMethod | null>(null);
  const [cardFieldErrors, setCardFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const handlePaymentMethodChange = (nextPaymentMethod: string) => {
    if (nextPaymentMethod === "gcash" || nextPaymentMethod === "maya") {
      setPreviousPaymentMethod(paymentMethod);
      setPaymentMethod(nextPaymentMethod);
      setWalletConfirmedFor(null);
      setCardConfirmedFor(null);
      setWalletModalProvider(nextPaymentMethod);
      setWalletName("");
      setWalletPhone("");
      setWalletFieldErrors({});
      return;
    }

    if (nextPaymentMethod === "credit-card" || nextPaymentMethod === "debit-card") {
      setPreviousPaymentMethod(paymentMethod);
      setPaymentMethod(nextPaymentMethod);
      setWalletConfirmedFor(null);
      setCardConfirmedFor(null);
      setCardModalMethod(nextPaymentMethod);
      setCardholderName("");
      setCardBank("");
      setCardNumber("");
      setCardExpiry("");
      setCardSecurityCode("");
      setCardFieldErrors({});
      return;
    }

    setPaymentMethod(nextPaymentMethod);
    setWalletConfirmedFor(null);
    setCardConfirmedFor(null);
  };

  const handleWalletDetailsSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!walletModalProvider) return;

    const nameCheck = validateName(walletName, "Wallet account name");
    const phoneCheck = validatePhoneNumber(walletPhone);
    const nextFieldErrors: Record<string, string> = {};
    if (!nameCheck.valid) nextFieldErrors.name = nameCheck.error ?? "Enter the wallet account name.";
    if (!phoneCheck.valid) nextFieldErrors.phone = phoneCheck.error ?? "Enter a valid wallet mobile number.";
    setWalletFieldErrors(nextFieldErrors);
    if (Object.keys(nextFieldErrors).length > 0) return;

    setWalletConfirmedFor(walletModalProvider);
    setWalletModalProvider(null);
    setWalletName("");
    setWalletPhone("");
  };

  const handleCardDetailsSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!cardModalMethod) return;

    const nextFieldErrors: Record<string, string> = {};
    const nameCheck = validateName(cardholderName, "Cardholder name");
    if (!nameCheck.valid) nextFieldErrors.name = nameCheck.error ?? "Enter the cardholder name.";
    if (!cardBank) nextFieldErrors.bank = "Choose the card's issuing bank.";
    if (!/^\d{12,19}$/.test(cardNumber.replace(/\D/g, ""))) {
      nextFieldErrors.number = "Enter a card number containing 12 to 19 digits.";
    }
    const currentMonth = new Date().toISOString().slice(0, 7);
    if (!cardExpiry || cardExpiry.slice(0, 7) < currentMonth) {
      nextFieldErrors.expiry = "Enter an expiration date in the current or a future month.";
    }
    if (!/^\d{3,4}$/.test(cardSecurityCode)) {
      nextFieldErrors.securityCode = "Enter a 3- or 4-digit security code.";
    }

    setCardFieldErrors(nextFieldErrors);
    if (Object.keys(nextFieldErrors).length > 0) return;

    setCardConfirmedFor(cardModalMethod);
    setCardModalMethod(null);
    setCardholderName("");
    setCardBank("");
    setCardNumber("");
    setCardExpiry("");
    setCardSecurityCode("");
  };

  const handleCardModalCancel = () => {
    setPaymentMethod(previousPaymentMethod);
    setCardConfirmedFor(null);
    setCardModalMethod(null);
    setCardholderName("");
    setCardBank("");
    setCardNumber("");
    setCardExpiry("");
    setCardSecurityCode("");
    setCardFieldErrors({});
  };

  const handleWalletModalCancel = () => {
    setPaymentMethod(previousPaymentMethod);
    setWalletConfirmedFor(null);
    setWalletModalProvider(null);
    setWalletName("");
    setWalletPhone("");
    setWalletFieldErrors({});
  };

  const handleCheckout = async () => {
    setError("");

    if (!paymentMethod) {
      setError("Choose a payment method.");
      return;
    }

    if (
      (paymentMethod === "gcash" || paymentMethod === "maya") &&
      walletConfirmedFor !== paymentMethod
    ) {
      setPreviousPaymentMethod(paymentMethod);
      setWalletModalProvider(paymentMethod);
      return;
    }
    if (
      (paymentMethod === "credit-card" || paymentMethod === "debit-card") &&
      cardConfirmedFor !== paymentMethod
    ) {
      setPreviousPaymentMethod(paymentMethod);
      setCardModalMethod(paymentMethod);
      return;
    }

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
                    onChange={(e) => handlePaymentMethodChange(e.target.value)}
                    disabled={loading}
                    required
                  >
                    <option value="" disabled>
                      Select a payment method
                    </option>
                    <option value="credit-card">Credit Card</option>
                    <option value="debit-card">Debit Card</option>
                    <option value="gcash">GCash</option>
                    <option value="maya">Maya</option>
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
      {walletModalProvider && (
        <div className="payment-modal-backdrop">
          <section
            className="payment-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="wallet-modal-title"
          >
            <h2 id="wallet-modal-title">{walletModalProvider === "gcash" ? "GCash" : "Maya"} Details</h2>
            <form onSubmit={handleWalletDetailsSubmit} noValidate>
              <div className="checkout-form-group">
                <label htmlFor="wallet-name">Registered Wallet Name *</label>
                <input
                  id="wallet-name"
                  type="text"
                  autoComplete="name"
                  value={walletName}
                  onChange={(e) => setWalletName(e.target.value)}
                  aria-invalid={!!walletFieldErrors.name}
                  required
                />
                {walletFieldErrors.name && <p className="field-error">{walletFieldErrors.name}</p>}
              </div>
              <div className="checkout-form-group">
                <label htmlFor="wallet-phone">Registered Mobile Number *</label>
                <input
                  id="wallet-phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="0917 123 4567"
                  value={walletPhone}
                  onChange={(e) => setWalletPhone(e.target.value)}
                  aria-invalid={!!walletFieldErrors.phone}
                  required
                />
                {walletFieldErrors.phone && <p className="field-error">{walletFieldErrors.phone}</p>}
              </div>
              <div className="payment-modal-actions">
                <button type="button" className="payment-modal-cancel" onClick={handleWalletModalCancel}>
                  Cancel
                </button>
                <button type="submit" className="checkout-btn">
                  Confirm Details
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
      {cardModalMethod && (
        <div className="payment-modal-backdrop">
          <section
            className="payment-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="card-modal-title"
          >
            <h2 id="card-modal-title">
              {cardModalMethod === "credit-card" ? "Credit Card" : "Debit Card"} Details
            </h2>
            <form onSubmit={handleCardDetailsSubmit} noValidate>
              <div className="checkout-form-group">
                <label htmlFor="cardholder-name">Cardholder Name *</label>
                <input
                  id="cardholder-name"
                  type="text"
                  autoComplete="off"
                  value={cardholderName}
                  onChange={(e) => setCardholderName(e.target.value)}
                  aria-invalid={!!cardFieldErrors.name}
                  required
                />
                {cardFieldErrors.name && <p className="field-error">{cardFieldErrors.name}</p>}
              </div>
              <div className="checkout-form-group">
                <label htmlFor="card-bank">Issuing Bank *</label>
                <select
                  id="card-bank"
                  value={cardBank}
                  onChange={(e) => setCardBank(e.target.value)}
                  aria-invalid={!!cardFieldErrors.bank}
                  required
                >
                  <option value="">Select a bank</option>
                  <option value="bdo-unibank">BDO Unibank</option>
                  <option value="bpi">BPI</option>
                  <option value="pnb">PNB</option>
                  <option value="metrobank">Metrobank</option>
                </select>
                {cardFieldErrors.bank && <p className="field-error">{cardFieldErrors.bank}</p>}
              </div>
              <div className="checkout-form-group">
                <label htmlFor="card-number">Card Number *</label>
                <input
                  id="card-number"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  aria-invalid={!!cardFieldErrors.number}
                  required
                />
                {cardFieldErrors.number && <p className="field-error">{cardFieldErrors.number}</p>}
              </div>
              <div className="checkout-form-group">
                <label htmlFor="card-expiry">Expiration Date *</label>
                <input
                  id="card-expiry"
                  type="date"
                  min={`${new Date().toISOString().slice(0, 7)}-01`}
                  value={cardExpiry}
                  onChange={(e) => setCardExpiry(e.target.value)}
                  aria-invalid={!!cardFieldErrors.expiry}
                  required
                />
                {cardFieldErrors.expiry && <p className="field-error">{cardFieldErrors.expiry}</p>}
              </div>
              <div className="checkout-form-group">
                <label htmlFor="card-security-code">Security Code *</label>
                <input
                  id="card-security-code"
                  type="password"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={4}
                  value={cardSecurityCode}
                  onChange={(e) => setCardSecurityCode(e.target.value)}
                  aria-invalid={!!cardFieldErrors.securityCode}
                  required
                />
                {cardFieldErrors.securityCode && (
                  <p className="field-error">{cardFieldErrors.securityCode}</p>
                )}
              </div>
              <div className="payment-modal-actions">
                <button type="button" className="payment-modal-cancel" onClick={handleCardModalCancel}>
                  Cancel
                </button>
                <button type="submit" className="checkout-btn">
                  Confirm Details
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
