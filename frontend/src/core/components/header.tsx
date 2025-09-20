import { Button } from "@/components/ui/button";
import { useAuthContext } from "@/features/auth/hooks/useAuthContext";
import { LogOut, Package } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Header = ({ children }: { children: React.ReactNode }) => {
  const { logout } = useAuthContext();
  const navigate = useNavigate();
  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const handleViewOrders = () => {
    navigate("/orders");
  };
  const handleViewProducts = () => {
    navigate("/main");
  };
  const handleViewAdmin = () => {
    navigate("/admin");
  };
  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-20">
      <div className="mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-yellow-500">Shopy</h1>
          </div>

          <div className="flex items-center space-x-4">
         
          <Button onClick={handleViewAdmin} className="text-white">
              <Package className="h-4 w-4" />
              Admin
            </Button>
            <Button onClick={handleViewProducts} className="text-white">
              <Package className="h-4 w-4" />
              Products
            </Button>
            <Button onClick={handleViewOrders} className="text-white">
              <Package className="h-4 w-4" />
              My Orders
            </Button>
            {children && children}
            <Button className="text-white" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
