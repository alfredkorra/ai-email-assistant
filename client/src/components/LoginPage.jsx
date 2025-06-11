import React from "react";
import { Button, Typography } from "antd";
import { GoogleOutlined } from "@ant-design/icons";
import "./LoginPage.css";
import logoUrl from '../assets/logo.svg';

const { Title, Paragraph } = Typography;

const LoginPage = () => {
  const handleLogin = () => {
    window.location.href = "http://localhost:8080/auth/google";
  };

  return (
    <div className="login-container">
      <div className="login-box">
     
      <img src={logoUrl} alt="Logo" width={70} height={40} className="login-logo" />
        <Title level={2}>AI EMAIL ASSISTANT</Title>
        <Paragraph className="slogan">Smarter Inbox. Faster Replies.</Paragraph>
        <Paragraph className="description">
          Summarize, organize, and reply to your emails effortlessly using the power of AI.
        </Paragraph>
        <Button
          type="primary"
          icon={<GoogleOutlined />}
          size="large"
          onClick={handleLogin}
        >
          Login with Google
        </Button>
      </div>
    </div>
  );
};

export default LoginPage;
