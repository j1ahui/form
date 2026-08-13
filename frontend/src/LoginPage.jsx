// src/pages/LoginPage.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";           // authentication data/functions

export default function LoginPage() {
  const { login, register } = useAuth();            // { login, register } = object destructuring
  const navigate = useNavigate();
  const [mode, setMode] = useState("login");   // "login" | "register"
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleChange(e) {                                              // handleChange = attached to username, email, password below in <input> section
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));      // setForm = refer to line 10
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "login") {
        await login(form.email, form.password);
      } else {
        await register(form.username, form.email, form.password);
      }
      
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white flex flex-col items-center justify-center px-6">
      <h1 className="text-4xl font-bold mb-2">FORM.</h1>
      <p className="text-gray-400 mb-8">{mode === "login" ? "Welcome back" : "Create your account"}</p>         {/*  === = strict operator. ? = ternary operator (short form of if else)  */}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full max-w-sm">        {/* onSubmit = react event that runs when the form is submitted */}
        {mode === "register" && (
          <input
            name="username"
            placeholder="Username"
            value={form.username}
            onChange={handleChange}
            className="p-3 rounded bg-[#1f1f1f] text-white"
            required                                                  /* required, placeholder = HTML attribute */
          />
        )}
        <input
          name="email"
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={handleChange}
          className="p-3 rounded bg-[#1f1f1f] text-white"
          required
        />
        <input
          name="password"
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={handleChange}
          className="p-3 rounded bg-[#1f1f1f] text-white"
          required
        />

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={loading}          // disable loading when button is true 
          className="bg-blue-500 hover:bg-blue-600 p-3 rounded font-semibold disabled:opacity-50"
        >
          {loading ? "..." : mode === "login" ? "Login" : "Create Account"}
        </button>
      </form>

      <button
        onClick={() => { setMode(m => m === "login" ? "register" : "login"); setError(""); }}
        className="mt-4 text-gray-400 hover:text-white text-sm"
      >
        {mode === "login" ? "No account? Register" : "Already have an account? Login"}
      </button>
    </div>
  );
}
