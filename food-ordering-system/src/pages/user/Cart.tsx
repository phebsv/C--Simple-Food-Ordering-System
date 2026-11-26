import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar";
import BgFood from "../../components/BgFood";
import ConfirmDialog from "../../components/admin/ConfirmDialog";
import Pagination from "../../components/Pagination";
import { useCart } from "../../context/CartContext";
import { FALLBACK_FOOD_IMAGE, showFallbackImage } from "../../constants/images";
import type { CartItem } from "../../types";
import { formatPricePHP } from "../../utils/textHelpers";
import { usePagination } from "../../utils/usePagination";
import "./Cart.css";

const ITEMS_PER_PAGE = 5;

export default function Cart() {
  const { items, total, removeItem, updateQuantity } = useCart();
  const navigate = useNavigate();
  // The item waiting for the customer to confirm its removal.
  const [pendingRemoval, setPendingRemoval] = useState<CartItem | null>(null);

  // Only the item list is paged; the order summary always lists everything.
  const pages = usePagination(items, ITEMS_PER_PAGE);
  const listTopRef = useRef<HTMLHeadingElement>(null);
  const goToPage = (page: number) => {
    pages.setPage(page);
    listTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const confirmRemoval = () => {
    if (pendingRemoval) removeItem(pendingRemoval.id);
    setPendingRemoval(null);
  };

  return (
    <>
      <Navbar title="CART" showNavLinks={true} />
      <div className="cart-page-container">
        <BgFood />
        <div className="cart-page-content">
          <h1 className="cart-page-title" ref={listTopRef} style={{ scrollMarginTop: 90 }}>
            Shopping Cart
          </h1>

          <div className="cart-layout">
            {/* Cart Items */}
            <div className="cart-items-section">
              {items.length === 0 ? (
                <div className="cart-empty-state">
                  <div className="cart-empty-icon">EMPTY CART</div>
                  <h2>Your cart is empty</h2>
                  <p>Add some delicious food items to get started!</p>
                  <button
                    onClick={() => navigate("/menu")}
                    className="cart-start-btn"
                  >
                    Continue Shopping
                  </button>
                </div>
              ) : (
                <div className="cart-items-list">
                  {pages.pageItems.map((item) => (
                    <div key={item.id} className="cart-item-card">
                      <div className="cart-item-image">
                        <img
                          src={item.image || FALLBACK_FOOD_IMAGE}
                          alt={item.name}
                          onError={showFallbackImage}
                        />
                      </div>

                      <div className="cart-item-details">
                        <h3 className="cart-item-name">{item.name}</h3>
                        <p className="cart-item-description">
                          {item.description}
                        </p>
                        <p className="cart-item-price">
                          {formatPricePHP(item.price)} each
                        </p>
                      </div>

                      <div className="cart-item-controls">
                        <div className="quantity-selector">
                          <button
                            onClick={() =>
                              // Going from 1 to 0 removes the item, so ask first.
                              item.quantity <= 1
                                ? setPendingRemoval(item)
                                : updateQuantity(item.id, item.quantity - 1)
                            }
                            className="qty-btn"
                            aria-label={`Decrease ${item.name} quantity`}
                          >
                            -
                          </button>
                          <span className="qty-display">{item.quantity}</span>
                          <button
                            onClick={() =>
                              updateQuantity(item.id, item.quantity + 1)
                            }
                            className="qty-btn"
                            aria-label={`Increase ${item.name} quantity`}
                          >
                            +
                          </button>
                        </div>

                        <div className="cart-item-subtotal">
                          {formatPricePHP(item.price * item.quantity)}
                        </div>

                        <button
                          onClick={() => setPendingRemoval(item)}
                          className="cart-remove-btn"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                  <Pagination
                    page={pages.page}
                    totalPages={pages.totalPages}
                    onPageChange={goToPage}
                    firstItem={pages.firstItem}
                    lastItem={pages.lastItem}
                    totalItems={pages.totalItems}
                    itemLabel="items"
                  />
                </div>
              )}
            </div>

            {/* Order Summary */}
            {items.length > 0 && (
              <div className="cart-summary-section">
                <div className="cart-summary-card">
                  <h2>Order Summary</h2>

                  <div className="summary-items">
                    {items.map((item) => (
                      <div key={item.id} className="summary-row">
                        <span>
                          {item.name} x {item.quantity}
                        </span>
                        <span>{formatPricePHP(item.price * item.quantity)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="summary-divider"></div>

                  <div className="summary-total">
                    <span>Total:</span>
                    <span className="total-amount">{formatPricePHP(total)}</span>
                  </div>

                  <button
                    onClick={() => navigate("/checkout")}
                    className="checkout-btn"
                  >
                    Proceed to Checkout
                  </button>

                  <button
                    onClick={() => navigate("/menu")}
                    className="continue-shopping-btn"
                  >
                    Continue Shopping
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={pendingRemoval !== null}
        title="Remove item?"
        message={
          pendingRemoval
            ? `Remove ${pendingRemoval.name} (x${pendingRemoval.quantity}) from your cart?`
            : ""
        }
        confirmText="Remove"
        cancelText="Keep it"
        isDangerous
        onConfirm={confirmRemoval}
        onCancel={() => setPendingRemoval(null)}
      />
    </>
  );
}
