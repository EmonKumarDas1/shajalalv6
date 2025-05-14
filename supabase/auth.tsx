import { createContext, useContext, useEffect, useState } from "react";
import { User, createClient } from "@supabase/supabase-js";

// Create Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  getUserProfile: () => Promise<any>;
  updateUserProfile: (data: any) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkLoggedInUser = async () => {
      try {
        const storedUser = localStorage.getItem("user-data");
        if (storedUser) {
          const userData = JSON.parse(storedUser);
          const userObject: User = {
            id: userData.id,
            app_metadata: {},
            user_metadata: { full_name: userData.full_name },
            aud: "authenticated",
            created_at: userData.created_at,
          } as User;
          setUser(userObject);
        }
      } catch (error) {
        console.error("Error checking logged in user:", error);
      } finally {
        setLoading(false);
      }
    };

    checkLoggedInUser();
  }, []);

  const signIn = async (username: string, password: string) => {
    try {
      const { data: userData, error } = await supabase
        .from("users")
        .select("*")
        .eq("name", username)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          throw new Error("User not found");
        }
        throw error;
      }

      if (!userData) {
        throw new Error("User not found");
      }

      if (password !== userData.password) {
        throw new Error("Invalid password");
      }

      const userObject: User = {
        id: userData.id,
        app_metadata: {},
        user_metadata: { full_name: userData.full_name },
        aud: "authenticated",
        created_at: userData.created_at,
      } as User;

      setUser(userObject);
      localStorage.setItem("user-data", JSON.stringify(userData));
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  };

  const signOut = async () => {
    setUser(null);
    localStorage.removeItem("user-data");
  };

  const getUserProfile = async () => {
    if (!user) throw new Error("User not authenticated");

    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      if (!data) throw new Error("User profile not found");

      return data;
    } catch (error) {
      console.error("Error fetching user profile:", error);
      throw error;
    }
  };

  const updateUserProfile = async (profileData: any) => {
    if (!user) throw new Error("User not authenticated");

    try {
      const { error } = await supabase
        .from("users")
        .update(profileData)
        .eq("id", user.id);

      if (error) throw error;

      const updatedUserData = {
        ...JSON.parse(localStorage.getItem("user-data") || "{}"),
        ...profileData,
      };
      localStorage.setItem("user-data", JSON.stringify(updatedUserData));
    } catch (error) {
      console.error("Error updating user profile:", error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signIn,
        signOut,
        getUserProfile,
        updateUserProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
