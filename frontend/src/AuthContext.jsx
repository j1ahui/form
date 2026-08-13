// provides login state + helpers to the whole app through Context API 

import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext(null);            // null indicates no auth context available yet. this is overriden in AuthContext.Provider 

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("http://127.0.0.1:5000/me", { credentials: "include" })
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (data) setUser(data); })                             // receives output of previous .then, updates React state 
        .finally(() => setLoading(false));
    }, []);

    async function login(email, password) {
        const res = await fetch("http://127.0.0.1:5000/login", {
            method: "POST",                                           // send data to server 
            credentials: "include",
            headers: { "Content-Type": "application/json" },         // metadata about request (this says: im sending json data)
            body: JSON.stringify({ email, password }),               // the actual data being sent 
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Login failed bruh");
        setUser({ user_id: data.user_id, username: data.username});
        return data;
    }

    async function register(username, email, password) {
        const res = await fetch("http://127.0.0.1:5000/register", {
            method: "POST",
            credentials: "include",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({username, email, password}),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Registration failed bruh");
        setUser({ user_id: data.user_id, username: data.username || username});         // || means = if server didnt provide username, use username provided 
        return data;
        
    }

    async function logout() {
        await fetch("http://127.0.0.1:5000/logout", {
            method: "POST",
            credentials: "include"
        });
        setUser(null);
    }

    return (
        <AuthContext.Provider value={{user, loading, login, register, logout}}>     
            {children}

        </AuthContext.Provider>
    );
}                                       // provides context values to line 5

export function useAuth() {
    return useContext(AuthContext)      // gets values in line 5 (overriden by authcontext.provider so not null)
}



