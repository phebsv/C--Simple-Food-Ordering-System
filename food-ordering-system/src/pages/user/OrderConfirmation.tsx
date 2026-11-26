import { Navigate, useLocation, useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar";
import BgFood from "../../components/BgFood";
import type { Order } from "../../types";
import { formatOrderNumber } from "../../utils/orderHelpers";
import { formatPricePHP } from "../../utils/textHelpers";
import "./OrderConfirmation.css";

/** Shown right after checkout. The placed order is passed in router state. */
export default function OrderConfirmation() {
  const navigate = useNavigate();
  const order = (useLocation().state as { order?: Order } | null)?.order;

  // Opened directly (e.g. refresh): there's nothing to confirm, go to the order list.
  if (!order) return <Navigate to="/my-orders" replace />;

  return (
    <>
      <Navbar title="ORDER PLACED" showNavLinks={true} />
      <div className="confirmation-container">
        <BgFood />
        <div className="confirmation-card" role="status">
          <div className="confirmation-check" aria-hidden="true">
            ✓
          </div>
          <h1>Thank you! Your order is placed.</h1>
          <p className="confirmation-sub">
            We&apos;ll start preparing it soon. You can follow its status in My Orders.
          </p>

          <dl className="confirmation-details">
            <div>
              <dt>Order No.</dt>
              <dd>{formatOrderNumber(order)}</dd>
            </div>
            <div>
              <dt>Placed on</dt>
              <dd>{new Date(order.createdAt).toLocaleString()}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{order.status}</dd>
            </div>
            <div>
              <dt>Deliver to</dt>
              <dd>{order.customerAddress}</dd>
            </div>
          </dl>

          <ul className="confirmation-items">
            {order.items.map((item) => (
              <li key={item.id}>
                <span>
                  {item.name} x {item.quantity}
                </span>
                <span>{formatPricePHP(item.price * item.quantity)}</span>
              </li>
            ))}
            <li className="confirmation-total">
              <span>Total</span>
              <span>{formatPricePHP(order.total)}</span>
            </li>
          </ul>

          <div className="confirmation-actions">
            <button type="button" className="confirmation-secondary" onClick={() => navigate("/menu")}>
              Order More
            </button>
            <button type="button" className="confirmation-primary" onClick={() => navigate("/my-orders")}>
              Track My Order
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
