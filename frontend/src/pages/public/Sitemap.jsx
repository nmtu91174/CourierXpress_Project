import React from "react";
import { Link } from "react-router-dom";
import "../../assets/styles/sitemap.css";

const Sitemap = () => {
  // Dữ liệu cấu trúc Sitemap
  const sitemapData = [
    {
      title: "COURIER XPRESS",
      links: [
        { label: "Home", url: "/" },
        { label: "About Us", url: "/about-us" },
        { label: "Our Story", url: "/about-us/story" },
        { label: "Sustainability", url: "/about-us/sustainability" },
        { label: "Careers", url: "/careers" },
        { label: "News & Events", url: "/news" },
      ],
    },
    {
      title: "SERVICES",
      links: [
        { label: "Standard Delivery", url: "/services/standard" },
        { label: "Express Shipping", url: "/services/express" },
        { label: "International Freight", url: "/services/global" },
        { label: "Warehousing", url: "/services/warehousing" },
        { label: "Business Solutions", url: "/services/enterprise" },
        { label: "Get a Quote", url: "/quote" },
      ],
    },
    {
      title: "CUSTOMER HUB",
      links: [
        { label: "Login / Register", url: "/login" },
        { label: "Track Your Shipment", url: "/tracking" },
        { label: "My Dashboard", url: "/user/dashboard" },
        { label: "Create Order", url: "/createorder" },
        { label: "Order History", url: "/user/orders" },
        { label: "Support Center", url: "/support" },
      ],
    },
    {
      title: "PARTNERS & DRIVERS",
      links: [
        { label: "Become a Shipper", url: "/Option" },
        { label: "Shipper Portal", url: "/shipper/home" },
        { label: "Agent Registration", url: "/agent/register" },
        { label: "Agent Portal", url: "/agent/login" },
        { label: "Partner Program", url: "/partners" },
      ],
    },
    {
      title: "LEGAL & PRIVACY",
      links: [
        { label: "Terms of Service", url: "/legal/terms" },
        { label: "Privacy Policy", url: "/legal/privacy" },
        { label: "Cookie Policy", url: "/legal/cookies" },
        { label: "Prohibited Items", url: "/legal/prohibited" },
        { label: "Dispute Resolution", url: "/legal/disputes" },
      ],
    },
    {
      title: "CONNECT",
      links: [
        { label: "Contact Us", url: "/contact" },
        { label: "Facebook", url: "https://facebook.com", external: true },
        { label: "LinkedIn", url: "https://linkedin.com", external: true },
        { label: "Twitter / X", url: "https://twitter.com", external: true },
        { label: "YouTube", url: "https://youtube.com", external: true },
      ],
    },
  ];

  return (
    <div className="sitemap-wrapper">
      <div className="sitemap-container">
        {/* Header Section */}
        <header className="sitemap-header">
          <h1 className="sitemap-title">SITEMAP</h1>
          <div className="sitemap-breadcrumb">
            <Link to="/">HOME</Link>
            <span>/</span>
            <span>SITEMAP</span>
          </div>
        </header>

        {/* Grid Content */}
        <div className="sitemap-grid">
          {sitemapData.map((section, index) => (
            <div key={index} className="sitemap-column">
              <h2 className="column-title">{section.title}</h2>
              <ul className="column-list">
                {section.links.map((link, idx) => (
                  <li key={idx} className="list-item">
                    {link.external ? (
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="sitemap-link"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link to={link.url} className="sitemap-link">
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Sitemap;
