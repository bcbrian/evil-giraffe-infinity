import { useState, useEffect, useMemo } from "react";
import { Outlet, Link } from "@remix-run/react";
import {
  Menu,
  Home,
  PieChart,
  Bell,
  User,
  Sun,
  Moon,
  LogOut,
  Grid,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Layout() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [renderedContent, setRenderedContent] =
    useState<React.ReactNode | null>(null);

  const menuItems = useMemo(
    () => [
      { icon: Home, label: "Home", to: "/" },
      { icon: PieChart, label: "Stats", to: "/budgets" },
      { icon: Grid, label: "Transactions", to: "/transactions" },
      { icon: Bell, label: "Notifications", to: "/manage" },
      { icon: User, label: "Profile", to: "/linked-accounts" },
      { icon: LogOut, label: "Logout", to: "/logout" },
      {
        icon: isDarkMode ? Sun : Moon,
        label: "Toggle Theme",
        onClick: () => {
          setIsDarkMode(!isDarkMode);
        },
      },
    ],
    [isDarkMode]
  ); // Empty dependency array means this will only be created once

  const buttonVariants = useMemo(
    () => ({
      hidden: { scale: 0, opacity: 0, y: 0, x: 0 },
      visible: (index: number) => {
        const angle = (index - (menuItems.length - 1) / 2) * 40;
        const radius = 100;
        const x = Math.sin((angle * Math.PI) / 180) * radius;
        const y = -Math.cos((angle * Math.PI) / 180) * radius;
        return {
          scale: 1,
          opacity: 1,
          x,
          y,
          transition: {
            type: "spring",
            stiffness: 260,
            damping: 20,
          },
        };
      },
    }),
    []
  ); // Empty dependency array means this will only be created once

  useEffect(() => {
    setRenderedContent(
      <div
        className={`grid grid-rows-[auto_1fr] min-h-screen w-full transition-colors duration-200 ${
          isDarkMode
            ? "bg-gradient-to-br from-purple-900 to-indigo-900 text-purple-100"
            : "bg-gradient-to-br from-purple-100 to-indigo-100 text-purple-900"
        }`}
      >
        {/* Fixed Header */}
        <header className="sticky top-0 z-10 bg-black bg-opacity-50 backdrop-blur-sm border-b-2 border-purple-500">
          <div className="text-3xl font-bold py-4 text-center text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
            Evil Giraffe
          </div>
        </header>

        {/* Main content area */}
        <main className="relative p-4">
          <Outlet />
        </main>

        {/* Floating menu button */}
        <div className="fixed bottom-10 left-0 right-0 flex justify-center pointer-events-none">
          <div className="relative flex items-end justify-center">
            <motion.button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className={`${
                isDarkMode
                  ? "bg-purple-600 hover:bg-purple-700"
                  : "bg-purple-500 hover:bg-purple-600"
              } text-white rounded-full p-4 transition-colors duration-200 z-10 shadow-lg shadow-purple-500/50 pointer-events-auto`}
              whileTap={{ scale: 0.95 }}
            >
              <Menu size={24} />
            </motion.button>

            <AnimatePresence>
              {isMenuOpen &&
                menuItems.map((item, index) =>
                  item.to ? (
                    <motion.div
                      key={index}
                      className={`absolute ${
                        isDarkMode
                          ? "bg-purple-800 hover:bg-purple-700"
                          : "bg-purple-200 hover:bg-purple-300"
                      } rounded-full p-3 transition-colors duration-200 shadow-md pointer-events-auto`}
                      variants={buttonVariants}
                      initial="hidden"
                      animate="visible"
                      exit="hidden"
                      custom={index}
                    >
                      <Link
                        to={item.to}
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center justify-center w-full h-full"
                      >
                        <item.icon
                          size={20}
                          className={
                            isDarkMode ? "text-purple-200" : "text-purple-800"
                          }
                        />
                        <span className="sr-only">{item.label}</span>
                      </Link>
                    </motion.div>
                  ) : (
                    <motion.button
                      key={index}
                      className={`absolute ${
                        isDarkMode
                          ? "bg-purple-800 hover:bg-purple-700"
                          : "bg-purple-200 hover:bg-purple-300"
                      } rounded-full p-3 transition-colors duration-200 shadow-md pointer-events-auto`}
                      variants={buttonVariants}
                      initial="hidden"
                      animate="visible"
                      exit="hidden"
                      custom={index}
                      onClick={item.onClick}
                    >
                      <item.icon
                        size={20}
                        className={
                          isDarkMode ? "text-purple-200" : "text-purple-800"
                        }
                      />
                      <span className="sr-only">{item.label}</span>
                    </motion.button>
                  )
                )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    );
  }, [isMenuOpen, isDarkMode, menuItems, buttonVariants]); // Add dependencies as needed

  return renderedContent;
}
