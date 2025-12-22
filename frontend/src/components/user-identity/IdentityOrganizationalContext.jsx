// frontend/src/components/user-identity/IdentityOrganizationalContext.jsx
// Enterprise Organizational Context - Role-based Organization & Scope

import React from "react";
import { FaBuilding, FaLayerGroup, FaTasks } from "react-icons/fa";
import "../../assets/styles/user_identity_dashboard.css";

/**
 * IdentityOrganizationalContext
 * 
 * Displays organizational context and role responsibilities
 * - Department/Scope
 * - Role level
 * - Assigned responsibilities
 * 
 * READ-ONLY - for audit and compliance purposes
 */
export default function IdentityOrganizationalContext({ user, loading = false }) {
  if (loading || !user) {
    return null;
  }

  const role = user.role?.toLowerCase() || "customer";

  // Role-based organizational context
  const getContext = () => {
    switch (role) {
      case "admin":
        return {
          department: "Operations – System Administration",
          roleLevel: "System-level access",
          responsibilities: [
            "System integrity and security oversight",
            "User and role management",
            "Operational workflow coordination",
            "System-wide reporting and analytics",
          ],
        };
      case "agent":
        return {
          department: "Operations – Order Management",
          roleLevel: "Operational-level access",
          responsibilities: [
            "Order approval and processing",
            "Workflow coordination",
            "Agent-level reporting",
          ],
        };
      case "shipper":
        return {
          department: "Operations – Delivery",
          roleLevel: "Delivery-level access",
          responsibilities: [
            "Order pickup and delivery",
            "Status updates and tracking",
            "Delivery confirmation",
          ],
        };
      default:
        return {
          department: "Customer Services",
          roleLevel: "Customer-level access",
          responsibilities: [
            "Order creation and tracking",
            "Account management",
          ],
        };
    }
  };

  const context = getContext();

  return (
    <section className="identity-section">
      <h3 className="section-title">Organizational Context</h3>
      
      <div className="org-context-list">
        {/* Department/Scope */}
        <div className="org-context-item">
          <div className="org-context-label">
            <FaBuilding className="org-context-icon" />
            <span>Department / Scope</span>
          </div>
          <div className="org-context-value">{context.department}</div>
        </div>

        {/* Role Level */}
        <div className="org-context-item">
          <div className="org-context-label">
            <FaLayerGroup className="org-context-icon" />
            <span>Role Level</span>
          </div>
          <div className="org-context-value">{context.roleLevel}</div>
        </div>

        {/* Responsibilities */}
        <div className="org-context-item">
          <div className="org-context-label">
            <FaTasks className="org-context-icon" />
            <span>Assigned Responsibilities</span>
          </div>
          <ul className="org-context-responsibilities">
            {context.responsibilities.map((resp, idx) => (
              <li key={idx}>{resp}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

