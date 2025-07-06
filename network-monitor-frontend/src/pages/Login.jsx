import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { useState, useContext } from "react";
import { loginAPI } from "../services/auth";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { login } = useContext(AuthContext); // This should accept user info

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const { user, token } = await loginAPI({ email, password });

      // Save to localStorage
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));

      // Update auth context
      login(user); // Pass user to context (optional but recommended)

      setError("");
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed ❌");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-100 to-blue-200">
      <form
        onSubmit={handleLogin}
        className="bg-white p-8 rounded-xl shadow-md w-full max-w-md"
      >
        <h2 className="text-2xl font-bold text-blue-800 mb-6 text-center">
          Login
        </h2>

        {error && (
          <div className="bg-red-100 text-red-700 px-4 py-2 mb-4 rounded-lg text-sm text-center">
            {error}
          </div>
        )}

        <div className="mb-4">
          <label className="block text-blue-700 mb-1">Email</label>
          <input
            type="email"
            className="w-full px-4 py-2 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="mb-6">
          <label className="block text-blue-700 mb-1">Password</label>
          <input
            type="password"
            className="w-full px-4 py-2 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
        >
          Login
        </button>

        <p className="mt-4 text-center text-sm text-purple-600">
          Don't Have an Account?{" "}
          <span
            className="text-blue-800 underline cursor-pointer"
            onClick={() => navigate("/signup")}
          >
            Signup
          </span>
        </p>
      </form>
    </div>
  );
};

export default Login;
