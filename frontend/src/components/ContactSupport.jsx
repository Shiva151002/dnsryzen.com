import React, { useState } from "react";
import {
  Globe,
  FileText,
  MapPin,
  Bug,
  Mail,
  ShieldAlert,
  HelpCircle
} from "lucide-react";

const ContactSupport = () => {

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    category: "",
    message: ""
  });

  const [status, setStatus] = useState("");
  const [sending, setSending] = useState(false);


  // HANDLE INPUT CHANGE

  const handleChange = (e) => {

    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });

    if (status) {
      setStatus("");
    }

  };


  // SEND MESSAGE

  const sendMessage = async () => {

    if (
      !formData.name ||
      !formData.email ||
      !formData.category ||
      !formData.message
    ) {

      setStatus("warning");

      setTimeout(() => {
        setStatus("");
      }, 3000);

      return;

    }

    setSending(true);
    setStatus("");

    try {

      const response = await fetch("/api/contact-support", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {

        setStatus("success");

        setTimeout(() => {
          setStatus("");
        }, 4000);

        setFormData({
          name: "",
          email: "",
          category: "",
          message: ""
        });

      } else {

        setStatus("error");

      }

    } catch {

      setStatus("server-error");

    }

    setSending(false);

  };


  return (

    <div className="max-w-3xl">


      {/* HEADER */}

      <div className="flex items-center gap-2 mb-6">

        <span className="text-orange-500 text-xl">💬</span>

        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
          Contact DNSRyzen Support
        </h2>

      </div>


      {/* NAME */}

      <input
        name="name"
        placeholder="Your name"
        value={formData.name}
        onChange={handleChange}
        className="
        w-full h-12 px-4 mb-4
        border border-gray-200 dark:border-slate-700
        rounded-lg
        bg-white dark:bg-slate-900
        text-gray-900 dark:text-white
        outline-none
        focus:ring-2 focus:ring-orange-500
        transition-all
        "
      />


      {/* EMAIL */}

      <input
        name="email"
        placeholder="Your email"
        value={formData.email}
        onChange={handleChange}
        className="
        w-full h-12 px-4 mb-4
        border border-gray-200 dark:border-slate-700
        rounded-lg
        bg-white dark:bg-slate-900
        text-gray-900 dark:text-white
        outline-none
        focus:ring-2 focus:ring-orange-500
        transition-all
        "
      />


      {/* CATEGORY DROPDOWN */}

      <select
        name="category"
        value={formData.category}
        onChange={handleChange}
        className="
        w-full h-12 px-4 mb-4
        rounded-lg
        border border-gray-200 dark:border-slate-700
        bg-white dark:bg-slate-900
        text-gray-900 dark:text-white
        appearance-none
        focus:ring-2 focus:ring-orange-500
        focus:border-orange-500
        focus:outline-none
        transition-all
        "
      >

        <option value="">Select issue category</option>

        <option value="DNS Issue">
          🌐 DNS Issue
        </option>

        <option value="Domain Report Problem">
          📄 Domain Report Problem
        </option>

        <option value="IP Lookup Issue">
          📍 IP Lookup Issue
        </option>

        <option value="Email Health Issue">
          📧 Email Health Issue
        </option>

        <option value="Security / Threat Alert">
          🛡 Security / Threat Alert
        </option>

        <option value="Bug Report">
          🐞 Bug Report
        </option>

        <option value="Feature Request">
          ✨ Feature Request
        </option>

        <option value="Others">
          ❓ Others
        </option>

      </select>


      {/* MESSAGE */}

      <textarea
        name="message"
        placeholder="Describe your issue"
        value={formData.message}
        onChange={handleChange}
        className="
        w-full h-40 px-4 py-3 mb-4
        border border-gray-200 dark:border-slate-700
        rounded-lg
        bg-white dark:bg-slate-900
        text-gray-900 dark:text-white
        outline-none
        focus:ring-2 focus:ring-orange-500
        transition-all
        "
      />


      {/* SEND BUTTON */}

      <button
        onClick={sendMessage}
        disabled={sending}
        className="
        px-6 py-3
        bg-orange-500 hover:bg-orange-600
        text-white font-semibold
        rounded-lg shadow
        transition-all
        disabled:opacity-50
        "
      >
        {sending ? "Sending..." : "Send Message"}
      </button>


      {/* STATUS MESSAGE */}

      {status && (

        <div className={`
        mt-4 p-3 rounded-lg text-sm

        ${status === "success"
          ? "bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-300"
          : status === "warning"
          ? "bg-yellow-50 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-300"
          : "bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300"
        }
        `}>

          {status === "success" && "✅ Message delivered to DNSRyzen Support"}
          {status === "warning" && "⚠️ Please select category and fill all fields"}
          {status === "error" && "❌ Failed to send message"}
          {status === "server-error" && "❌ Server connection error"}

        </div>

      )}


      {/* FOOTNOTE */}

      <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
        DNSRyzen Support usually replies within 24 hours.
      </p>


    </div>

  );

};

export default ContactSupport;
