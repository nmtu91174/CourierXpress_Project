import { useState } from "react";
import EditProfileModal from "./EditProfileModal";

export default function ProfileHeader({ user, setUser }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="profile-header-pro viettel-header">
        <div className="viettel-header-left">
          <img src={user.avatar} alt="avatar" />

          <div className="viettel-user-info">
            <h2>{user.name}</h2>
            <p>{user.role}</p>

            <span className="status-badge online">
              {user.status}
            </span>
          </div>
        </div>

        <div className="viettel-header-right">
          <button
            className="btn btn-primary"
            onClick={() => setOpen(true)}
          >
            Cập nhật hồ sơ
          </button>
        </div>
      </div>

      {open && (
        <EditProfileModal
          user={user}
          setUser={setUser}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
