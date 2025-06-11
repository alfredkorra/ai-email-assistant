import React, { useState, useEffect } from "react";
import {
  Table,
  Button,
  Modal,
  Typography,
  Spin,
  message,
  Pagination,
  Input,
} from "antd";
import { MessageOutlined } from "@ant-design/icons";
import HeaderBar from "./HeaderBar";

const { Title, Text } = Typography;

const InboxView = () => {
  const [emails, setEmails] = useState([]);
  const [userEmail, setUserEmail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeEmail, setActiveEmail] = useState(null);
  const [replyLoading, setReplyLoading] = useState(false);
  const [suggestedReply, setSuggestedReply] = useState("");
  const [sendLoading, setSendLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);

  useEffect(() => {
    const fetchUserEmail = async () => {
      try {
        const res = await fetch("https://ai-email-backend-ai-73581a558d17.herokuapp.com/me", {
          credentials: "include",
        });
        const data = await res.json();
        if (data.email) setUserEmail(data.email);
        else throw new Error("No email in response");
      } catch (err) {
        console.error("❌ Failed to get user", err);
        message.error("Not authenticated. Please log in.");
      }
    };
    fetchUserEmail();
  }, []);

  useEffect(() => {
    if (userEmail) fetchSummarizedEmails(userEmail);
  }, [userEmail]);

  const fetchSummarizedEmails = async (email) => {
    setLoading(true);
    try {
      const readRes = await fetch("https://ai-email-backend-ai-73581a558d17.herokuapp.com/gmail/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email }),
      });
      const rawEmails = await readRes.json();
      const sumRes = await fetch("https://ai-email-backend-ai-73581a558d17.herokuapp.com/summarize-emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ emails: rawEmails }),
      });
      const summarizedRaw = await sumRes.json();
      const summarized = summarizedRaw.map((summary, i) => ({
        ...summary,
        id: rawEmails[i]?.id,
        subject: rawEmails[i]?.subject,
        snippet: rawEmails[i]?.snippet,
        threadId: rawEmails[i]?.threadId,
        sender: rawEmails[i]?.sender,
        key: i,
      }));
      setEmails(summarized);
    } catch (err) {
      console.error("Failed to fetch emails", err);
      message.error("❌ Failed to fetch and summarize emails.");
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestReply = async (email) => {
    setReplyLoading(true);
    setActiveEmail(email);
    setModalOpen(true);
    try {
      const res = await fetch("https://ai-email-backend-ai-73581a558d17.herokuapp.com/suggest-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          subject: email.subject,
          snippet: email.summary,
        }),
      });
      const data = await res.json();
      setSuggestedReply(data.reply);
    } catch (err) {
      console.error("Failed to generate reply", err);
      setSuggestedReply("Error generating reply.");
    } finally {
      setReplyLoading(false);
    }
  };

  const handleSendReply = async () => {
    if (!activeEmail || !suggestedReply || !userEmail)
      return message.error("Missing required information.");
    setSendLoading(true);
    try {
      const recipientEmail =
        activeEmail.sender?.match(/<(.+?)>/)?.[1] || activeEmail.sender;
      const payload = {
        to: recipientEmail,
        subject: `Re: ${activeEmail.subject}`,
        message: suggestedReply,
        threadId: activeEmail.threadId,
        email: userEmail,
      };
      const res = await fetch("https://ai-email-backend-ai-73581a558d17.herokuapp.com/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (res.ok && result.success) {
        message.success("Email sent successfully!");
        setTimeout(() => setModalOpen(false), 500);
      } else message.error(`❌ Send error: ${result.error}`);
    } catch (err) {
      console.error("Send error:", err);
      message.error("❌ Unexpected error while sending email.");
    } finally {
      setSendLoading(false);
    }
  };

  const pagedEmails = emails.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const columns = [
    {
      title: "Subject",
      dataIndex: "subject",
      key: "subject",
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: "Summary",
      dataIndex: "summary",
      key: "summary",
      render: (text) => <Text type="secondary">{text}</Text>,
    },
    {
      title: "",
      key: "actions",
      render: (_, record) => (
        <Button
          icon={<MessageOutlined />}
          type="primary"
          onClick={() => handleSuggestReply(record)}
        >
          Suggest Reply
        </Button>
      ),
    },
  ];

  return (
    <div className="bg-gray-100 min-h-screen p-6">
      <HeaderBar />
      <div className="max-w-6xl mx-auto bg-white shadow-md rounded-xl p-6">
        <div className="mb-6"></div>
        {loading ? (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              height: "100vh",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                flexDirection: "column",
              }}
            >
              <Spin tip="Fetching your inbox..." size="large" />
              <Typography style={{ marginTop: 20, fontWeight: "bold" }}>
                Fetching your inbox...
              </Typography>
            </div>
          </div>
        ) : (
          <>
            <Table
              columns={columns}
              dataSource={pagedEmails}
              pagination={false}
              bordered
            />
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                marginTop: 15,
              }}
            >
              <Pagination
                current={currentPage}
                pageSize={pageSize}
                total={emails.length}
                onChange={(page) => setCurrentPage(page)}
              />
            </div>
          </>
        )}
      </div>

      <Modal
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        title={activeEmail?.subject}
        footer={[
          <Button key="cancel" onClick={() => setModalOpen(false)}>
            Close
          </Button>,
          <Button
            key="reply"
            type="primary"
            onClick={handleSendReply}
            loading={sendLoading}
          >
            Send Reply
          </Button>,
        ]}
      >
        {replyLoading ? (
          <Spin />
        ) : (
          <div className="space-y-3">
            <div>
              <Text type="secondary">Subject</Text>
              <div className="mt-1 p-2 border rounded bg-gray-50 text-sm text-gray-800">
                Re: {activeEmail?.subject}
              </div>
            </div>

            <div>
              <Text type="secondary">Suggested Reply</Text>
              <Input.TextArea
                style={{ height: 400, marginTop: 5 }}
                rows={6}
                value={suggestedReply}
                onChange={(e) => setSuggestedReply(e.target.value)}
                placeholder="Edit your reply..."
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default InboxView;
