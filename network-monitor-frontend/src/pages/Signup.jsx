// src/pages/Signup.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signupAPI } from "../services/auth";

const Signup = () => {
  const [form, setForm] = useState({ username: "", email: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSignup = async (e) => {
    e.preventDefault();

    if (form.password !== form.confirm) {
      setError("Passwords do not match ❌");
      return;
    }

    try {
      const { user, token } = await signupAPI({
        username: form.username,
        email: form.email,
        password: form.password,
      });

      // Optional: store token or login automatically
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));

      // Redirect to login or dashboard
      navigate("/login");
    } catch (err) {
      setError(err.response?.data?.message || "Signup failed ❌");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-100 to-blue-200">
      <form
        onSubmit={handleSignup}
        className="bg-white p-8 rounded-xl shadow-md w-full max-w-md"
      >
        <h2 className="text-2xl font-bold text-blue-800 mb-6 text-center">
          Create an Account
        </h2>

        {error && (
          <div className="bg-red-100 text-red-700 px-4 py-2 mb-4 rounded-lg text-sm text-center">
            {error}
          </div>
        )}

        <div className="mb-4">
          <label className="block text-blue-700 mb-1">Username</label>
          <input
            type="text"
            name="username"
            className="w-full px-4 py-2 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={form.username}
            onChange={handleChange}
            required
          />
        </div>

        <div className="mb-4">
          <label className="block text-blue-700 mb-1">Email</label>
          <input
            type="email"
            name="email"
            className="w-full px-4 py-2 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={form.email}
            onChange={handleChange}
            required
          />
        </div>

        <div className="mb-4">
          <label className="block text-blue-700 mb-1">Password</label>
          <input
            type="password"
            name="password"
            className="w-full px-4 py-2 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={form.password}
            onChange={handleChange}
            required
          />
        </div>

        <div className="mb-6">
          <label className="block text-blue-700 mb-1">Confirm Password</label>
          <input
            type="password"
            name="confirm"
            className="w-full px-4 py-2 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={form.confirm}
            onChange={handleChange}
            required
          />
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
        >
          Sign Up
        </button>

        <p className="mt-4 text-center text-sm text-purple-600">
          Already have an account?{" "}
          <span
            className="text-blue-800 underline cursor-pointer"
            onClick={() => navigate("/login")}
          >
            Login
          </span>
        </p>
      </form>
    </div>
  );
};

export default Signup;
