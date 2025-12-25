
```
CourierXpress_Project
├─ backend
│  ├─ api
│  │  ├─ admin
│  │  │  ├─ assign_agent.php
│  │  │  ├─ assign_shipper.php
│  │  │  ├─ cancel_order.php
│  │  │  ├─ clone_order.php
│  │  │  ├─ create_agent.php
│  │  │  ├─ create_followup_order.php
│  │  │  ├─ create_order.php
│  │  │  ├─ dashboard_lastest_order.php
│  │  │  ├─ delete_order.php
│  │  │  ├─ get_agents_with_kpi.php
│  │  │  ├─ get_agent_stats.php
│  │  │  ├─ get_orders.php
│  │  │  ├─ get_order_detail.php
│  │  │  ├─ get_order_stats.php
│  │  │  ├─ get_reports_data.php
│  │  │  ├─ reopen_order.php
│  │  │  ├─ terminate_workflow.php
│  │  │  ├─ toggle_agent_status.php
│  │  │  ├─ update_order.php
│  │  │  └─ view_logs.php
│  │  ├─ auth
│  │  │  ├─ login.php
│  │  │  ├─ logout.php
│  │  │  ├─ register.php
│  │  │  └─ reset_password.php
│  │  ├─ couriers
│  │  ├─ shipper
│  │  │  ├─ accept_assignment.php
│  │  │  ├─ confirm_delivery.php
│  │  │  ├─ confirm_delivery_failed.php
│  │  │  ├─ confirm_pickup.php
│  │  │  ├─ get_dashboard.php
│  │  │  ├─ list_in_progress.php
│  │  │  ├─ list_to_pickup.php
│  │  │  ├─ order_detail.php
│  │  │  └─ update_location.php
│  │  ├─ shipper.php
│  │  ├─ test
│  │  │  ├─ step1_ping.php
│  │  │  ├─ step2_session.php
│  │  │  ├─ step3_require_login.php
│  │  │  ├─ step4_require_role.php
│  │  │  └─ step5_full_chain.php
│  │  ├─ tracking
│  │  │  ├─ get_live_location.php
│  │  │  └─ get_tracking_history.php
│  │  └─ users
│  │     ├─ change_password.php
│  │     ├─ disable_user.php
│  │     ├─ get_agents.php
│  │     ├─ get_notifications.php
│  │     ├─ get_shippers.php
│  │     ├─ get_user.php
│  │     ├─ reset_user_password.php
│  │     ├─ update_user.php
│  │     └─ user_activity_log.php
│  ├─ BACKEND_ARCHITECTURE.md
│  ├─ checkTracking.php
│  ├─ core
│  │  ├─ BaseService.php
│  │  ├─ Cors.php
│  │  ├─ Logger.php
│  │  ├─ Response.php
│  │  └─ SessionHelper.php
│  ├─ createorder.php
│  ├─ db.php
│  ├─ getOrder.php
│  ├─ getOrderByUser.php
│  ├─ get_fees.php
│  ├─ get_item_categories.php
│  ├─ get_orders.php
│  ├─ get_payment_methods.php
│  ├─ get_service_types.php
│  ├─ login.php
│  ├─ middleware
│  │  ├─ rate_limit.php
│  │  ├─ require_login.php
│  │  └─ require_role.php
│  ├─ migrations
│  │  ├─ run_migration_cancel_metadata.php
│  │  └─ SCHEMA_WITH_CANCEL_METADATA.sql
│  ├─ RBAC_AND_WORKFLOW.md
│  ├─ README_LOGS.md
│  ├─ register.php
│  ├─ reset_admin_password.php
│  ├─ services
│  │  ├─ FeeService.php
│  │  ├─ NotificationService.php
│  │  ├─ OrderService.php
│  │  ├─ TrackingService.php
│  │  └─ UserService.php
│  ├─ update.php
│  └─ view_logs.bat
├─ ENTERPRISE_COMPLIANCE_AUDIT.md
├─ frontend
│  ├─ eslint.config.js
│  ├─ index.html
│  ├─ package-lock.json
│  ├─ package.json
│  ├─ PHAN_TICH_FRONTEND.md
│  ├─ public
│  │  ├─ images
│  │  │  ├─ Banner.jpg
│  │  │  ├─ FastDelivery.jpg
│  │  │  ├─ Real-Time Tracking.jpg
│  │  │  ├─ Secure Handling.jpg
│  │  │  └─ Who We Are.avif
│  │  ├─ videos
│  │  │  └─ CourierXpress.mp4
│  │  └─ vite.svg
│  ├─ README.md
│  ├─ src
│  │  ├─ animations
│  │  │  ├─ heroAnimation.js
│  │  │  └─ homeAnimation.js
│  │  ├─ App.css
│  │  ├─ App.jsx
│  │  ├─ assets
│  │  │  ├─ images
│  │  │  │  ├─ Banner.jpg
│  │  │  │  ├─ FastDelivery.jpg
│  │  │  │  ├─ Real-Time Tracking.jpg
│  │  │  │  ├─ Secure Handling.jpg
│  │  │  │  ├─ tracking.jpg
│  │  │  │  └─ Who We Are.avif
│  │  │  ├─ react.svg
│  │  │  └─ styles
│  │  │     ├─ account_settings.css
│  │  │     ├─ admin.css
│  │  │     ├─ agents.css
│  │  │     ├─ agent_dashboard.css
│  │  │     ├─ agent_layout.css
│  │  │     ├─ auth
│  │  │     │  ├─ login.css
│  │  │     │  └─ Option.css
│  │  │     ├─ custom.css
│  │  │     ├─ dashboard.css
│  │  │     ├─ HeroVideo.css
│  │  │     ├─ HomePage.css
│  │  │     ├─ imageModal.css
│  │  │     ├─ notifications.css
│  │  │     ├─ order-table-agent.css
│  │  │     ├─ order-table.css
│  │  │     ├─ order.css
│  │  │     ├─ orderDetailPanel.css
│  │  │     ├─ orderFilterBar.css
│  │  │     ├─ Orders.css
│  │  │     ├─ reports.css
│  │  │     ├─ shipper
│  │  │     │  ├─ AboutUsShipper.css
│  │  │     │  ├─ ContactShipper.css
│  │  │     │  ├─ DeliveryInProgress.css
│  │  │     │  ├─ EditOrderShipper.css
│  │  │     │  ├─ HomePageShipper.css
│  │  │     │  └─ OrderHistoryShipper.css
│  │  │     ├─ StatusBadge.css
│  │  │     ├─ TrackingResult.module.css
│  │  │     ├─ user_identity_dashboard.css
│  │  │     ├─ user_menu.css
│  │  │     ├─ user_profile.css
│  │  │     └─ user_profile_enterprise.css
│  │  ├─ chart-config.js
│  │  ├─ components
│  │  │  ├─ common
│  │  │  │  ├─ ImageModal.jsx
│  │  │  │  └─ StatusBadge.jsx
│  │  │  ├─ EditProfileModal.jsx
│  │  │  ├─ Footer.jsx
│  │  │  ├─ guards
│  │  │  │  └─ RequireRole.jsx
│  │  │  ├─ Header.jsx
│  │  │  ├─ HeroVideo.jsx
│  │  │  ├─ layout
│  │  │  │  └─ UserMenu.jsx
│  │  │  ├─ Layouts
│  │  │  │  ├─ AdminLayout.jsx
│  │  │  │  └─ AgentLayout.jsx
│  │  │  ├─ notifications
│  │  │  │  └─ NotificationsDropdown.jsx
│  │  │  ├─ orders
│  │  │  │  ├─ OrderDetailPanel.jsx
│  │  │  │  ├─ OrderFilterBar.jsx
│  │  │  │  └─ OrderTable.jsx
│  │  │  ├─ ProfileHeader.jsx
│  │  │  ├─ ProfileInfo.jsx
│  │  │  ├─ ProfileStats.jsx
│  │  │  ├─ security
│  │  │  │  ├─ ActiveSessionsPanel.jsx
│  │  │  │  └─ SecurityOverviewCard.jsx
│  │  │  ├─ user-identity
│  │  │  │  ├─ IdentityActivitySnapshot.jsx
│  │  │  │  ├─ IdentityCard.jsx
│  │  │  │  ├─ IdentityMainPanel.jsx
│  │  │  │  ├─ IdentityOrganizationalContext.jsx
│  │  │  │  ├─ IdentitySecurity.jsx
│  │  │  │  ├─ IdentityStats.jsx
│  │  │  │  └─ IdentityTrustSignals.jsx
│  │  │  └─ UserOrdersTable.jsx
│  │  ├─ constants
│  │  │  ├─ orderStatus.jsx
│  │  │  └─ orderStatusGroups.js
│  │  ├─ data
│  │  │  ├─ hanoi.json
│  │  │  ├─ userOrders.json
│  │  │  └─ userProfile.json
│  │  ├─ hooks
│  │  │  ├─ shipper
│  │  │  │  └─ useConfirmDeliveryFailed.js
│  │  │  ├─ useEnterpriseLogs.js
│  │  │  └─ useUserProfile.js
│  │  ├─ index.css
│  │  ├─ JS
│  │  │  └─ OrderNoAccount.js
│  │  ├─ main.jsx
│  │  ├─ pages
│  │  │  ├─ admin
│  │  │  │  ├─ AccountSettingsPage.jsx
│  │  │  │  ├─ AgentsManagement.jsx
│  │  │  │  ├─ Dashboard.jsx
│  │  │  │  ├─ NotificationsPage.jsx
│  │  │  │  ├─ OrderManagement.jsx
│  │  │  │  ├─ Reports.jsx
│  │  │  │  └─ UserIdentityDashboard.jsx
│  │  │  ├─ agent
│  │  │  │  ├─ AgentDashboard.jsx
│  │  │  │  ├─ AssignShipper.jsx
│  │  │  │  ├─ MyOrders.jsx
│  │  │  │  └─ Notifications.jsx
│  │  │  ├─ auth
│  │  │  │  ├─ Login.jsx
│  │  │  │  ├─ NoPermission.jsx
│  │  │  │  ├─ Option.jsx
│  │  │  │  ├─ ProtectedRoute.jsx
│  │  │  │  └─ Register.jsx
│  │  │  ├─ public
│  │  │  │  ├─ HomePage.jsx
│  │  │  │  ├─ Tracking.jsx
│  │  │  │  └─ TrackingResult.jsx
│  │  │  ├─ shipper
│  │  │  │  ├─ AboutUsShipper.jsx
│  │  │  │  ├─ ContactShipper.jsx
│  │  │  │  ├─ DeliveryInProgress.jsx
│  │  │  │  ├─ EditOrderShipper.jsx
│  │  │  │  ├─ HomePageShipper.jsx
│  │  │  │  ├─ OrderDetailShipper.jsx
│  │  │  │  ├─ OrderHistoryShipper.jsx
│  │  │  │  ├─ UserOrdersPage.jsx
│  │  │  │  └─ UserProfilePage.jsx
│  │  │  └─ user
│  │  │     ├─ CreateOrder.jsx
│  │  │     ├─ OrderDetail.jsx
│  │  │     ├─ Orders.jsx
│  │  │     └─ SendTrackingEmail.jsx
│  │  ├─ services
│  │  │  └─ user.service.js
│  │  └─ utils
│  │     └─ gsapAnimations.js
│  └─ vite.config.js
├─ package-lock.json
├─ package.json
├─ project-structure.txt
└─ RBAC_ORDER_VISIBILITY_AUDIT.md

```