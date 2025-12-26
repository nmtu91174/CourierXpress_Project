// frontend/src/components/common/ImageModal.jsx
import React, { useState, useEffect } from "react";
import { FaTimes, FaChevronLeft, FaChevronRight } from "react-icons/fa";
import StatusBadge from "./StatusBadge";
import "../../assets/styles/imageModal.css";

/**
 * ImageModal - DQN Luxury Image Viewer
 * 
 * Features:
 * - Large image display with navigation arrows
 * - Thumbnail gallery at the bottom
 * - Keyboard navigation (arrow keys, ESC)
 * - Click outside to close
 */
export default function ImageModal({
  images = [], // Array of { image_url, type?, ... }
  isOpen,
  onClose,
  initialIndex = 0,
}) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  // Reset to initial index when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(Math.min(initialIndex, images.length - 1));
    }
  }, [isOpen, initialIndex, images.length]);

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  };

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowLeft") {
        handlePrevious();
      } else if (e.key === "ArrowRight") {
        handleNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, currentIndex, images.length, onClose]);

  const handleThumbnailClick = (index) => {
    setCurrentIndex(index);
  };

  // Normalize image URL (convert relative to absolute if needed)
  // Images are served from backend (port 8888), not frontend (port 5173)
  const getImageUrl = (url) => {
    if (!url) return "";
    // If already absolute URL, return as is
    if (url.startsWith("http://") || url.startsWith("https://")) {
      return url;
    }
    // If relative URL (e.g., /uploads/order_images/xxx.jpg), prepend backend base URL
    const backendBaseUrl = "http://localhost:8888";
    // Keep leading slash for proper URL path
    const cleanUrl = url.startsWith("/") ? url : `/${url}`;
    return `${backendBaseUrl}${cleanUrl}`;
  };

  if (!isOpen || images.length === 0) return null;

  const currentImage = images[currentIndex];
  const imageUrl = getImageUrl(currentImage?.image_url);

  // Get status for badge based on image type
  const getImageTypeStatus = (imageType) => {
    if (!imageType) return null;
    // Map image type to order status for StatusBadge
    // pickup -> status 4 (IN_PROGRESS / PICKED_UP)
    // delivery -> status 5 (DELIVERED)
    // delivery_failed -> status 6 (FAILED)
    if (imageType === "pickup") return 4; // IN_PROGRESS / PICKED_UP
    if (imageType === "delivery") return 5; // DELIVERED
    if (imageType === "delivery_failed") return 6; // FAILED
    return null; // unknown -> no status badge
  };

  const imageStatus = getImageTypeStatus(currentImage?.type);

  return (
    <>
      {/* Overlay */}
      <div className="image-modal-overlay" onClick={onClose} />

      {/* Modal Container */}
      <div className="image-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="image-modal-header">
          <div className="image-modal-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {imageStatus !== null && (
              <StatusBadge status={imageStatus} />
            )}
            <span>
              Image {currentIndex + 1} of {images.length}
            </span>
          </div>
          <button className="image-modal-close" onClick={onClose} type="button">
            <FaTimes />
          </button>
        </div>

        {/* Main Image Area */}
        <div className="image-modal-main">
          {/* Previous Button */}
          {images.length > 1 && (
            <button
              className="image-modal-nav image-modal-nav-left"
              onClick={handlePrevious}
              type="button"
              title="Previous (←)"
            >
              <FaChevronLeft />
            </button>
          )}

          {/* Image */}
          <div className="image-modal-image-wrapper">
            <img
              src={imageUrl}
              alt={`Image ${currentIndex + 1}`}
              className="image-modal-main-image"
              onError={(e) => {
                e.target.src = "https://via.placeholder.com/800x600?text=Image+Error";
              }}
            />
          </div>

          {/* Next Button */}
          {images.length > 1 && (
            <button
              className="image-modal-nav image-modal-nav-right"
              onClick={handleNext}
              type="button"
              title="Next (→)"
            >
              <FaChevronRight />
            </button>
          )}
        </div>

        {/* Thumbnail Gallery */}
        {images.length > 1 && (
          <div className="image-modal-thumbnails">
            {images.map((img, idx) => {
              const thumbUrl = getImageUrl(img.image_url);
              return (
                <div
                  key={idx}
                  className={`image-modal-thumbnail ${
                    idx === currentIndex ? "active" : ""
                  }`}
                  onClick={() => handleThumbnailClick(idx)}
                >
                  <img
                    src={thumbUrl}
                    alt={`Thumbnail ${idx + 1}`}
                    onError={(e) => {
                      e.target.src = "https://via.placeholder.com/100?text=Error";
                    }}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
