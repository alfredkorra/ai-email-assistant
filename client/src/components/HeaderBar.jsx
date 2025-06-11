import React, { useEffect, useState } from "react";
import { Avatar, Button, Typography, Space, message } from "antd";
import { LogoutOutlined } from "@ant-design/icons";
import logoUrl from '../assets/logo.svg';
import "./HeaderBar.css";

const { Text } = Typography;

const HeaderBar = () => {
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        // Step 1: Get authenticated user via cookie
        const meRes = await fetch("https://ai-email-backend-ai-73581a558d17.herokuapp.com/me", {
          credentials: "include",
        });

        if (!meRes.ok) {
          throw new Error("Session expired or invalid");
        }

        const meData = await meRes.json();
        if (!meData.email) throw new Error("No authenticated email");

        // Step 2: Use email to get profile
        const profileRes = await fetch(`https://ai-email-backend-ai-73581a558d17.herokuapp.com/user-profile?email=${meData.email}`);
        const profileData = await profileRes.json();

        setProfile(profileData);
      } catch (err) {
        console.error("❌ Failed to load profile", err);
        message.error("Session expired. Logging out...");

        try {
          await fetch("https://ai-email-backend-ai-73581a558d17.herokuapp.com/logout", {
            method: "POST",
            credentials: "include",
          });
        } catch (_) {}

        setTimeout(() => {
          window.location.href = "/";
        }, 1500);
      }
    };

    fetchUserProfile();
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("https://ai-email-backend-ai-73581a558d17.herokuapp.com/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (err) {
      console.warn("Logout request failed, proceeding anyway");
    }
    window.location.href = "/";
  };

  if (!profile) return null;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "12px 24px",
        borderBottom: "1px solid #f0f0f0",
        background: "#fff",
        position: "relative",
      }}
    >
      <Space>
        <Avatar src={profile.picture} />
        <div>
          <Text strong>{profile.name || "Unnamed"}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: "12px" }}>
            {profile.email}
          </Text>
        </div>
      </Space>

      <div
        style={{
          position: "absolute",
          left: "50%",
          transform: "translateX(-50%)",
        }}
      >
        <img
          src={logoUrl}
          alt="Logo"
          width={50}
          height={28}
          className="rotating-logo"
        />
      </div>

      <Button icon={<LogoutOutlined />} onClick={handleLogout}>
        Logout
      </Button>
    </div>
  );
};

export default HeaderBar;
