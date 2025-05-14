import { useState, useEffect } from "react";
import { useAuth } from "../../../supabase/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type UserProfileData = {
  full_name: string;
  email: string;
  avatar_url?: string;
  role?: string;
  last_login?: string;
};

export default function UserProfile() {
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [fullName, setFullName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { user, getUserProfile, updateUserProfile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const data = await getUserProfile();
        setProfile(data);
        setFullName(data.full_name || "");
      } catch (error) {
        console.error("Error loading profile:", error);
        toast({
          title: "Error",
          description: "Failed to load user profile",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      loadProfile();
    }
  }, [user, getUserProfile, toast]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      await updateUserProfile({ full_name: fullName });
      setProfile((prev) => (prev ? { ...prev, full_name: fullName } : null));
      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated.",
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <p>Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-10">
      <h1 className="text-3xl font-bold mb-8">My Profile</h1>

      <div className="flex flex-col md:flex-row gap-8">
        <div className="w-full md:w-1/3">
          <Card>
            <CardHeader className="text-center">
              <Avatar className="w-24 h-24 mx-auto mb-4">
                <AvatarImage
                  src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email}`}
                  alt={profile?.full_name || "User"}
                />
                <AvatarFallback>
                  {profile?.full_name?.[0] || user?.email?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <CardTitle>{profile?.full_name}</CardTitle>
              <CardDescription>{profile?.email}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">Role:</span>
                  <span className="font-medium">{profile?.role || "User"}</span>
                </div>
                {profile?.last_login && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Last login:</span>
                    <span className="font-medium">
                      {new Date(profile.last_login).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="w-full md:w-2/3">
          <Tabs defaultValue="general">
            <TabsList className="mb-6">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
            </TabsList>

            <TabsContent value="general">
              <Card>
                <CardHeader>
                  <CardTitle>General Information</CardTitle>
                  <CardDescription>
                    Update your personal information
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form id="profile-form" onSubmit={handleUpdateProfile}>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="fullName">Full Name</Label>
                        <Input
                          id="fullName"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Your full name"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          value={profile?.email || ""}
                          disabled
                          className="bg-gray-50"
                        />
                        <p className="text-xs text-gray-500">
                          Email cannot be changed
                        </p>
                      </div>
                    </div>
                  </form>
                </CardContent>
                <CardFooter>
                  <Button type="submit" form="profile-form" disabled={isSaving}>
                    {isSaving ? "Saving..." : "Save changes"}
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>

            <TabsContent value="security">
              <Card>
                <CardHeader>
                  <CardTitle>Security Settings</CardTitle>
                  <CardDescription>
                    Manage your password and security preferences
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Password</Label>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">••••••••</span>
                        <Button variant="outline" size="sm" asChild>
                          <a href="/forgot-password">Change password</a>
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
