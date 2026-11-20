import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar";
import BgFood from "../../components/BgFood";
import { useCart } from "../../context/CartContext";
import { FALLBACK_FOOD_IMAGE, showFallbackImage } from "../../constants/images";
import { getErrorMessage, getMenuItems, getReviews } from "../../services/api";
import { LOW_STOCK_THRESHOLD, averageRatings } from "../../utils/orderHelpers";
import { decodeHtmlEntities, formatPricePHP } from "../../utils/textHelpers";
import type { FoodItem } from "../../types";
import burgerImg from "../../assets/burger2.png";
import pizzaImg from "../../assets/pizza1.png";
import chickenImg from "../../assets/chicken1.png";
import "./Dashboard.css";
import "./Menu.css";

const REFRESH_INTERVAL_MS = 5000;

// Transparent food images (same as the dashboard) look clean on the red banner.
// Pick one that matches the featured item; otherwise use the item's own photo.
const HERO_IMAGES: [keyword: string, image: string][] = [
  ["burger", burgerImg],
  ["pizza", pizzaImg],
  ["chicken", chickenImg],
];

function heroImageFor(item: FoodItem) {
  const name = decodeHtmlEntities(item.name).toLowerCase();
  const match = HERO_IMAGES.find(([keyword]) => name.includes(keyword));
  return match ? match[1] : item.image || FALLBACK_FOOD_IMAGE;
}

type Ratings = Record<string, { average: number; count: number }>;

type MenuListProps = {
  items: FoodItem[];
  categories: string[];
  hiddenCategories: string[];
  onCategoryToggle: (category: string) => void;
  onAddToCart: (item: FoodItem) => void;
  onShowDetails: (item: FoodItem) => void;
  selectedItemId: string | null;
  ratings: Ratings;
  searchQuery: string;
  onSearchChange: (value: string) => void;
};

function MenuList({
  items,
  categories,
  hiddenCategories,
  onCategoryToggle,
  onAddToCart,
  onShowDetails,
  selectedItemId,
  ratings,
  searchQuery,
  onSearchChange,
}: MenuListProps) {
  return (
    <section className="menu-section">
      <div className="menu-header">
        <div>
          <span className="menu-highlight">Highlighted Menu</span>
        </div>
      </div>

      <div className="menu-filter-panel">
        <input
          type="search"
          className="menu-search-input"
          placeholder="Search food by name or description..."
          aria-label="Search menu"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        <h3>Filter by category</h3>
        <div className="menu-filter-options">
          {categories.map((category) => (
            <label key={category} className="menu-filter-label">
              <input
                type="checkbox"
                checked={!hiddenCategories.includes(category)}
                onChange={() => onCategoryToggle(category)}
              />
              {category}
            </label>
          ))}
        </div>
      </div>

      {items.length === 0 && (
        <p className="menu-no-results">No food matches your search.</p>
      )}

      <div className="menu-grid">
        {items.map((item) => {
          const rating = ratings[item.id];

          return (
            <div
              key={item.id}
              className={`menu-card ${selectedItemId === item.id ? "menu-card-active" : ""}`}
            >
              <button
                type="button"
                className="menu-card-image-container menu-card-details-btn"
                onClick={() => onShowDetails(item)}
                aria-label={`View details for ${decodeHtmlEntities(item.name)}`}
              >
                <img
                  src={item.image || FALLBACK_FOOD_IMAGE}
                  alt={decodeHtmlEntities(item.name)}
                  className="menu-card-image"
                  onError={showFallbackImage}
                />
              </button>
              <div className="menu-card-content">
                <div className="menu-card-title">
                  <h4>
                    <button
                      type="button"
                      className="menu-card-name-btn"
                      onClick={() => onShowDetails(item)}
                    >
                      {decodeHtmlEntities(item.name)}
                    </button>
                  </h4>
                  <span className="menu-card-price">{formatPricePHP(item.price)}</span>
                </div>
                <p className="menu-card-description">{item.description}</p>
                <div className="menu-card-rating">
                  {rating ? (
                    <>
                      <span className="menu-card-stars" aria-hidden="true">
                        ★
                      </span>
                      <span>{rating.average.toFixed(1)}</span>
                    </>
                  ) : (
                    <span className="menu-card-no-rating">Not rated yet</span>
                  )}
                </div>
                <div className="menu-card-footer">
                  <span className="menu-card-category">{item.category}</span>
                  <button className="menu-add-btn" onClick={() => onAddToCart(item)}>
                    Add to Cart
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default function Menu() {
  const [menuItems, setMenuItems] = useState<FoodItem[]>([]);
  const [ratings, setRatings] = useState<Ratings>({});
  // Categories the customer unticked. New categories show up ticked by default.
  const [hiddenCategories, setHiddenCategories] = useState<string[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [addedItem, setAddedItem] = useState<FoodItem | null>(null);
  const [detailsItem, setDetailsItem] = useState<FoodItem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { items: cartItems, addItem } = useCart();
  const navigate = useNavigate();

  // Load the menu now, then keep it fresh so stock changes show up.
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const data = await getMenuItems();
        if (cancelled) return;
        // Unavailable (including out-of-stock) items are hidden from customers.
        setMenuItems(data.filter((item) => item.available !== false));
        setError(null);
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err, "Failed to load menu"));
      } finally {
        if (!cancelled) setLoading(false);
      }

      try {
        const reviews = await getReviews();
        if (!cancelled) setRatings(averageRatings(reviews));
      } catch {
        // Ratings are optional; the menu still works without them.
      }
    };

    load();
    const interval = window.setInterval(load, REFRESH_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  const categories = useMemo(
    () => [...new Set(menuItems.map((item) => item.category))],
    [menuItems],
  );

  const query = searchQuery.trim().toLowerCase();
  const visibleMenuItems = menuItems.filter(
    (item) =>
      !hiddenCategories.includes(item.category) &&
      (!query ||
        decodeHtmlEntities(item.name).toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query)),
  );

  const handleCategoryToggle = (category: string) => {
    setHiddenCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category],
    );
  };

  const handleAddToCart = (item: FoodItem) => {
    const inCart = cartItems.find((line) => line.id === item.id)?.quantity ?? 0;
    if (item.stock !== undefined && inCart >= item.stock) {
      setNotice(`Sorry, only ${item.stock} ${decodeHtmlEntities(item.name)} left in stock.`);
      return;
    }
    setNotice(null);
    setDetailsItem(null);
    addItem(item);
    setSelectedItemId(item.id);
    setAddedItem(item);
  };

  const featuredItem = menuItems[0] ?? null;

  return (
    <>
      <Navbar title="MENU" showNavLinks={true} />
      <div className="menu-page-container">
        <BgFood />

        {/* Hero Banner */}
        {featuredItem && (
          <div className="menu-hero-banner">
            <div className="menu-hero-content">
              <div className="menu-hero-text">
                <div className="menu-hero-label">Try our best</div>
                <h2 className="menu-hero-title">
                  {decodeHtmlEntities(featuredItem.name)}
                </h2>
                <div className="menu-hero-price">
                  {formatPricePHP(featuredItem.price)}
                </div>
                <button
                  className="menu-hero-btn"
                  onClick={() => {
                    handleAddToCart(featuredItem);
                  }}
                >
                  Order Now
                </button>
              </div>
              <div className="menu-hero-image">
                <img
                  src={heroImageFor(featuredItem)}
                  alt={decodeHtmlEntities(featuredItem.name)}
                  onError={showFallbackImage}
                />
              </div>
            </div>
          </div>
        )}

        <div className="menu-page-grid">
          <div className="menu-main">
            {loading ? (
              <div
                style={{ textAlign: "center", padding: "40px", color: "#666" }}
              >
                <p>Loading menu...</p>
              </div>
            ) : error ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "40px",
                  color: "#d32f2f",
                }}
              >
                <p>Error: {error}</p>
              </div>
            ) : menuItems.length === 0 ? (
              <div
                style={{ textAlign: "center", padding: "40px", color: "#666" }}
              >
                <p>No items available</p>
              </div>
            ) : (
              <>
                {notice && (
                  <p role="alert" style={{ color: "#d32f2f", fontWeight: 600, textAlign: "center" }}>
                    {notice}
                  </p>
                )}
                <MenuList
                  items={visibleMenuItems}
                  categories={categories}
                  hiddenCategories={hiddenCategories}
                  onCategoryToggle={handleCategoryToggle}
                  onAddToCart={handleAddToCart}
                  onShowDetails={setDetailsItem}
                  selectedItemId={selectedItemId}
                  ratings={ratings}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                />
              </>
            )}
          </div>
        </div>

        {detailsItem && (
          <div
            className="menu-add-modal-overlay"
            role="presentation"
            onClick={() => setDetailsItem(null)}
          >
            <div
              className="menu-add-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="menu-details-title"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                className="menu-add-modal-close"
                onClick={() => setDetailsItem(null)}
                aria-label="Close"
              >
                X
              </button>

              <div className="menu-add-modal-image">
                <img
                  src={detailsItem.image || FALLBACK_FOOD_IMAGE}
                  alt={decodeHtmlEntities(detailsItem.name)}
                  onError={showFallbackImage}
                />
              </div>

              <div className="menu-add-modal-content">
                <p className="menu-add-modal-kicker">{detailsItem.category}</p>
                <h2 id="menu-details-title">{decodeHtmlEntities(detailsItem.name)}</h2>
                <p className="menu-details-price">{formatPricePHP(detailsItem.price)}</p>
                <p>{detailsItem.description || "No description yet."}</p>
                <p className="menu-details-meta">
                  {ratings[detailsItem.id]
                    ? `★ ${ratings[detailsItem.id].average.toFixed(1)} (${ratings[detailsItem.id].count} review${ratings[detailsItem.id].count === 1 ? "" : "s"})`
                    : "Not rated yet"}
                  {detailsItem.stock !== undefined &&
                    detailsItem.stock < LOW_STOCK_THRESHOLD &&
                    ` · Only ${detailsItem.stock} left`}
                </p>
              </div>

              <div className="menu-add-modal-actions">
                <button
                  type="button"
                  className="menu-modal-secondary-btn"
                  onClick={() => setDetailsItem(null)}
                >
                  Back to Menu
                </button>
                <button
                  type="button"
                  className="menu-modal-primary-btn"
                  onClick={() => handleAddToCart(detailsItem)}
                >
                  Add to Cart
                </button>
              </div>
            </div>
          </div>
        )}

        {addedItem && (
          <div
            className="menu-add-modal-overlay"
            role="presentation"
            onClick={() => setAddedItem(null)}
          >
            <div
              className="menu-add-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="menu-add-modal-title"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                className="menu-add-modal-close"
                onClick={() => setAddedItem(null)}
                aria-label="Close"
              >
                X
              </button>

              <div className="menu-add-modal-image">
                <img
                  src={addedItem.image || FALLBACK_FOOD_IMAGE}
                  alt={decodeHtmlEntities(addedItem.name)}
                  onError={showFallbackImage}
                />
              </div>

              <div className="menu-add-modal-content">
                <p className="menu-add-modal-kicker">Added to cart</p>
                <h2 id="menu-add-modal-title">
                  {decodeHtmlEntities(addedItem.name)}
                </h2>
                <p>
                  Your item has been added successfully. You can keep browsing
                  the menu or review your cart when you are ready.
                </p>
              </div>

              <div className="menu-add-modal-actions">
                <button
                  type="button"
                  className="menu-modal-secondary-btn"
                  onClick={() => setAddedItem(null)}
                >
                  Continue Shopping
                </button>
                <button
                  type="button"
                  className="menu-modal-primary-btn"
                  onClick={() => navigate("/cart")}
                >
                  View Cart
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
