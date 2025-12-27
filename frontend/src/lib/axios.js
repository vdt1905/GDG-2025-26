import axios from "axios";
import { auth } from "../firebase"; // We still need firebase auth to get tokens

const api = axios.create({
    baseURL: "http://localhost:5000/api",
});

// Request interceptor to add the auth token header to every request
api.interceptors.request.use(
    async (config) => {
        const user = auth.currentUser;
        if (user) {
            const token = await user.getIdToken();
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default api;
