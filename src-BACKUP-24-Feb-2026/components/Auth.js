// src/components/AuthForm.js
import { useState } from "react";

export default function AuthForm({ onSubmit, buttonText }) {
  // Prop is onSubmit (function)
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState(null);
  const [showOtp, setShowOtp] = useState(false); // For phone OTP step

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const credentials = email ? { email, password } : { phone };
      const response = await onSubmit(credentials);
      if (phone && response) setShowOtp(true); // Show OTP if sent
    } catch (err) {
      setError(err.message);
    }
  };

  const handleVerifyOtp = async () => {
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        phone,
        token: otp,
        type: "signup",
      }); // Adjust type for login/signup
      if (error) throw error;
      // Navigate to /loyalty
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{ maxWidth: "400px", margin: "0 auto", padding: "40px" }}
    >
      <h2>{buttonText}</h2>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <input
        type="tel"
        placeholder="Phone (for OTP)"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
      />
      {showOtp && (
        <div>
          <input
            type="text"
            placeholder="Enter OTP"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
          />
          <button type="button" onClick={handleVerifyOtp}>
            Verify OTP
          </button>
        </div>
      )}
      <button type="submit">{buttonText}</button>
    </form>
  );
}
